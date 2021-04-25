import {
  Collection,
  Dictionary,
  EventFlow,
  mergeObject,
  Mutex,
  safeRequire,
  Snowflake,
  SubscriptionMap,
} from "@neocord/common";

import fetch from "petitio";

import { DEFAULTS, HttpHeader, RESTEvent } from "../constants";
import { CDN } from "./CDN";
import { Bucket, BucketInformation } from "./Bucket";
import { DiscordHTTPError } from "../errors/DiscordHTTPError";
import { DiscordAPIError } from "../errors/DiscordAPIError";

import type { PetitioResponse } from "petitio/dist/lib/PetitioResponse";
import type { HTTPMethod, PetitioRequest } from "petitio/dist/lib/PetitioRequest";

const FormData = safeRequire<typeof import("form-data")>("form-data");

export class REST extends EventFlow<RESTEvents> {
  /**
   * The major endpoints.
   *
   * @see https://discord.com/developers/docs/topics/rate-limits#rate-limits
   */
  static MAJOR = [ "channels", "guilds", "webhooks" ];

  /**
   * The rate-limit buckets
   */
  buckets: Collection<string, Bucket>;

  /**
   * CDN link builder.
   */
  cdn: CDN;

  /**
   * Options that were provided.
   */
  options: RESTOptions;

  /**
   * The global rate-limit promise.
   */
  globalRatelimit: Promise<void> | null;

  /**
   * The latency between the discord api and us.
   */
  latency: number;

  /**
   * The token to use when making requests to the Discord API
   * @private
   */
  #token!: string;

  /**
   * Timestamp of the last request made.
   * @private
   */
  private _lastRequest: number;

  /**
   * @param [options] The options for this rest handler.
   */
  constructor(options: Partial<RESTOptions> = {}) {
    super();
    options = mergeObject(DEFAULTS, options);

    this.buckets = new Collection();
    this.cdn = new CDN(options.cdnUrl);
    this.options = options as RESTOptions;
    this.globalRatelimit = null;
    this.latency = 0;

    this._lastRequest = 0;
  }

  /**
   * Used for tracking rate-limits across different endpoints..
   *
   * @param {string} endpoint The endpoint.
   * @param {string} method The HTTP method.
   *
   * @returns {string}
   */
  static getRoute(endpoint: string, method: string): string {
    const route = endpoint
      .replace(/\/([\w-]+)\/(?:\d{17,19})/g, (m, p) => REST.MAJOR.includes(m)
        ? m
        : `/${p}/:id`)
      .replace(/\/reactions\/[^/]+/g, "/reactions/:id")
      .replace(/\/webhooks\/(\d+)\/[\w-]{64,}/g, "/webhooks/$1/:token");

    let ending = ";";
    if (method.toLowerCase() === "delete" && route.endsWith("/message/:id")) {
      const id = /\d{16, 19}$/m.exec(route)?.[0] as string,
        snowflake = Snowflake.deconstruct(id);

      if (Date.now() - snowflake.timestamp > 12096e5) {
        // Deleting messages has a different rate-limit.
        ending += "deletes-old";
      }
    }

    return route + ending;
  }

  /**
   * Set the token of this REST instance.
   *
   * @param value Your bot (or bearer, or whatever *wink*) token.
   */
  set token(value: string) {
    value = value.replace(/^\w+\s+/, "").trim();
    this.#token = value;
  }

  /**
   * Current token used to authorize requests
   */
  get token(): string {
    return this.#token;
  }

  /**
   * The API url.
   */
  get apiUrl(): string {
    const base = this.options.apiUrl?.replace(/\/$/m, "");
    return `${base}/v${this.options.version}`;
  }

  /**
   * Queues a request to be made.
   *
   * @param {string | { toString(): string }} endpoint The endpoint to make.
   * @param {RequestOptions} [options] The request options.
   *
   * @returns {Promise}
   */
  async queue<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    options.method ??= "GET";
    endpoint = endpoint.toString();

    const data = this._getRequest(endpoint, options),
      route = REST.getRoute(endpoint, options.method),
      bucket = this.buckets.ensure(route, new Bucket(route));

    const release = await bucket.lock.take();
    try {
      return this._make(route, data);
    } finally {
      this.latency = Date.now() - this._lastRequest;
      release();
    }
  }

  /**
   * Makes a request.
   *
   * @param {string} route The route identifier.
   * @param {RequestData} data The request data.
   * @param {number} tries The number of tries this request has taken so far.
   *
   * @private
   */
  async _make(route: string, { request }: RequestData, tries = 0): Promise<any> {
    const bucket = this.buckets.get(route) as Bucket;
    if (Bucket.GLOBAL_RATE_LIMIT) {
      await Bucket.GLOBAL_RATE_LIMIT;
    }

    if (bucket.rateLimited) {
      /**
       * Emitted whenever a routes rate-limit bucket was exceeded.
       * @event RequestHandler#rate-limited
       * @property data The rate-limit data.
       */
      this.emit(RESTEvent.RateLimited, {
        bucket: bucket.info,
        route,
        request,
      });

      await Mutex.wait(bucket.untilReset);
    }

    let res: PetitioResponse;
    try {
      res = await request.send();
    } catch (err) {
      if (tries >= this.options.retries) {
        throw new DiscordHTTPError(err.message, err.status, request.httpMethod, route);
      }

      return this._make(route, { request }, tries++);
    } finally {
      /**
       * Timestamp of the last request made.
       * @type {number}
       * @private
       */
      this._lastRequest = Date.now();
    }

    await bucket.handle(res);

    const statusCode = res.statusCode as number;
    if (statusCode < 300 && statusCode >= 200) {
      return res.json();
    }

    if (statusCode >= 400 && statusCode < 500) {
      // check for a 429
      if (statusCode === 429) {
        this._debug(`oh no, we hit 429 on route: ${route}, retrying in ${bucket.untilReset}ms`);
        await Mutex.wait(bucket.untilReset);
        return this._make(route, { request }, tries++);
      }

      let data;
      try {
        data = res.json();
      } catch (err) {
        throw new DiscordHTTPError(statusCode, request.httpMethod, route, err.message);
      }

      throw new DiscordAPIError(data, statusCode, request.httpMethod, route);
    }

    if (statusCode >= 500 && statusCode < 600) {
      if (statusCode === 502) {
        throw new DiscordHTTPError(502, request.httpMethod, route, "Discord API is unavailable (https://discordstatus.com/");
      }

      if (tries < this.options.retries) {
        return this._make(route, { request }, tries++);
      }

      throw new DiscordHTTPError(statusCode, request.httpMethod, route);
    }

    return null;
  }

  /**
   * Get the RequestInit object for requests.
   *
   * @param {string} endpoint The endpoint.
   * @param {RequestOptions} options The request options.
   *
   * @returns {RequestData}
   */
  private _getRequest(endpoint: string, options: RequestOptions): RequestData {
    endpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    const request = fetch(`${this.apiUrl}${endpoint}`, options.method)
      .header(HttpHeader.XRateLimitPrecision, "millisecond")
      .header(HttpHeader.UserAgent, this.options.userAgent)
      .timeout(this.options.timeout);

    if (options.query) {
      const add = (k: string, v: any): void => {
        Array.isArray(v) ? add(k, v) : request.query(k, v);
      };

      for (const [ k, v ] of Object.entries(options.query)) {
        add(k, v);
      }
    }

    if (options.authorize !== false) {
      const prefix = this.options.tokenPrefix
        ? `${this.options.tokenPrefix.trim()} `
        : "";

      request.header(HttpHeader.Authorization, `${prefix}${this.#token}`);
    }

    if (options.auditReason) {
      request.header(HttpHeader.XAuditLogReason, encodeURIComponent(options.auditReason));
    }

    if (options.files?.length) {
      if (!FormData) {
        throw new Error("You must install 'form-data' before sending attachments.");
      }

      const body = new FormData();
      for (const file of options.files) {
        if (!file.file) {
          continue;
        }

        file.name ??= "file.png";
        body.append(file.name, file.file, { filename: file.name });
      }

      if (typeof options.body === "object") {
        body.append("payload_json", JSON.stringify(options.body));
      }

      request.header(body.getHeaders());
      request.body(body);
    } else if (typeof options.body === "object") {
      request.body(options.body, "json");
    }

    return {
      request,
    };
  }

  /**
   * Used for general debugging purposes.
   *
   * @param message The debug message.
   */
  private _debug(message: string): void {
    this.emit(RESTEvent.Debug, `(rest) ${message.trim()}`);
  }
}

type RESTEvents = SubscriptionMap<{
  debug: [ message: string ];
  rateLimited: [ info: RateLimit ]
}>

export interface RateLimit {
  route: string;
  bucket: BucketInformation;
  request: PetitioRequest;
}

export interface RESTOptions {
  /**
   * The API version to use, v8 is the default and recommended.
   */
  version: number;

  /**
   * The API url to use.
   */
  apiUrl: string;

  /**
   * The CDN url to use.
   */
  cdnUrl: string;

  /**
   * The response timeout, in milliseconds.
   */
  timeout: number;

  /**
   * The total number of retries.
   */
  retries: number;

  /**
   * The user agent to use.
   */
  userAgent: string;

  /**
   * The token prefix to use.
   */
  tokenPrefix: string;
}

export interface RequestOptions {
  /**
   * The query parameters to append
   */
  query?: Dictionary;

  /**
   * The request body
   */
  body?: any;

  /**
   * Request method
   */
  method?: HTTPMethod;

  /**
   * Whether to set the Authorization header.
   */
  authorize?: boolean;

  /**
   * Audit-log reason to set
   */
  auditReason?: string;

  /**
   * Files to attach
   *
   * @requires `form-data` package
   */
  files?: File[];
}

export interface RequestData {
  request: PetitioRequest;
}

export interface File {
  name: string;
  file: string | Buffer | NodeJS.ReadableStream;
}
