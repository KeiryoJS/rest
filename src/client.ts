import type { Request, RequestHandler, RequestOptions } from "./handler/handler";
import { DefaultRequestHandler } from "./handler/default/default";
import { Endpoint, HttpHeader, HttpMethod, TokenPrefix } from "./util/constants";
import { safeRequire } from "@keiryo/common";
import { TypedEmitter } from "tiny-typed-emitter";

export interface RestClient {
    get<T>(endpoint: Endpoint, options?: Omit<RequestOptions, "method">): Promise<T | null>;

    post<T>(endpoint: Endpoint, options?: Omit<RequestOptions, "method">): Promise<T | null>;

    put<T>(endpoint: Endpoint, options?: Omit<RequestOptions, "method">): Promise<T | null>;

    delete<T>(endpoint: Endpoint, options?: Omit<RequestOptions, "method">): Promise<T | null>;

    patch<T>(endpoint: Endpoint, options?: Omit<RequestOptions, "method">): Promise<T | null>;
}

const FormData = safeRequire<typeof import("form-data")>("form-data");

export interface RateLimit {
    request: Request;
    duration: number;
    limit: number;
    hash: string;
    majorParameter: string;
}

export class RestClient extends TypedEmitter<Events> {
    static readonly DEFAULTS: RestClientOptions = {
        api: "https://discord.com/api",
        version: 9,
        userAgent: `DiscordBot (https://github.com/KeiryoJS, Node.js/${process.version})`,
        tokenPrefix: TokenPrefix.Bot,
    };

    private readonly handler: RequestHandler;
    private readonly options: RestClientOptions;

    #token: string | null = null;

    constructor(handler?: RequestHandler, options: Partial<RestClientOptions> = {}) {
        super();

        this.handler = handler ?? new DefaultRequestHandler();
        this.options = { ...RestClient.DEFAULTS, ...options };

        /* forward any of the request handler events. */
        this.handler
            .on("debug", msg => this.emit("debug", `[R]:[${this.handler.constructor.name}] ${msg}`))
            .on("limited", data => this.emit("limited", data));
    }

    get token(): string | null {
        return this.#token;
    }

    set token(token: string | null) {
        this.#token = token;
    }

    async make<T = unknown>(endpoint: Endpoint, {
        authorize = true,
        auditLogReason,
        ...options
    }: RequestOptions = {}): Promise<T | null> {
        /* check if there's a leading slash. */
        if (!/^\//.test(endpoint)) {
            /* add a leading slash to the endpoint. */
            endpoint = `/${endpoint}`;
        }

        options.method ??= HttpMethod.Get;
        options.headers ??= {};

        let body,
            url = `${this.options.api}/v${this.options.version}${endpoint}`,
            headers = Object.create(options.headers);

        if (authorize) {
            if (!this.#token) {
                throw new Error(`Cannot authorize request ${endpoint} without a token.`);
            }

            headers[HttpHeader.Authorization] = `${this.options.tokenPrefix}${this.#token}`;
        }

        if (options.files?.length) {
            if (!FormData) {
                throw new TypeError("Please install the 'form-data' package before sending attachments.");
            }

            const formData = new FormData();

            /* attach all files to the form-data instance. */
            for (const file of options.files) {
                formData.append(file.name, file.file, file.name);
            }

            /* if a JSON body was specified, attach it to the form-data instance. */
            if (options.body != null) {
                formData.append("payload_json", JSON.stringify(options.body));
            }

            body = formData;
            headers = Object.assign(headers, formData.getHeaders());
        } else if (options.body) {
            try {
                body = JSON.stringify(options.body);
                headers[HttpHeader.ContentType] = "application/json";
            } catch {
                this.emit("debug", "unable to correctly serialize json body");
            }
        }

        if (options.query) {
            url += "?";
            for (const [ k, v ] of Object.entries(options.query)) {
                const value = Array.isArray(v)
                    ? v.map(encodeURIComponent).join(",")
                    : encodeURIComponent(v);

                url += `${k}=${value}&`;
            }

            /* make sure there are no trailing ? or & symbols. */
            if (/[?&]$/.test(url)) {
                url = url.dropLast(1);
            }
        }

        if (auditLogReason?.length) {
            headers[HttpHeader.XAuditLogReason] = encodeURIComponent(auditLogReason);
        }

        headers[HttpHeader.UserAgent] = this.options.userAgent;
        headers[HttpHeader.XRateLimitPrecision] = "millisecond";

        return this.handler.queueRequest({ endpoint, headers, body, url, method: options.method });
    }
}

/* add dedicated methods for the most-used HTTP methods. */
Object.values(HttpMethod).forEach(method => {
    Reflect.defineProperty(RestClient.prototype, method.toLowerCase(), {
        value(this: RestClient, endpoint: Endpoint, options: RequestOptions = {}) {
            return this.make(endpoint, { ...options, method });
        },
    });
});

export type APIVersion = 6 | 7 | 8 | 9;

export type Events = {
    debug: (message: string) => void;
    limited: (data: RateLimit) => void;
}

export interface RestClientOptions {
    /**
     * The base api url to use, without a version.
     * @default "https://discord.com/api"
     */
    api: string;
    /**
     * The user-agent to use.
     * @default `DiscordBot (https://github.com/KeiryoJS, Node.js/${process.version})`,
     */
    userAgent: string;
    /**
     * The token prefix to use.
     * @default TokenPrefix.Bot
     */
    tokenPrefix: TokenPrefix;
    /**
     * The version of the api to use.
     * @default 9
     */
    version: APIVersion;
}
