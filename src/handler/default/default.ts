import type { Request, RequestHandler, RequestHandlerOptions, Route } from "../handler";
import { Collection } from "@keiryo/common";
import { TypedEmitter } from "tiny-typed-emitter";
import { extractRoute, getResponseBody } from "../../util/request";
import { Bucket } from "./bucket";
import { DiscordHttpError } from "../../errors/http";
import type { DiscordError } from "discord-api-types/rest/v8";
import { DiscordAPIError } from "../../errors/api";
import type { Dispatcher } from "undici";
import type { Events } from "../../client";

export class DefaultRequestHandler extends TypedEmitter<Events> implements RequestHandler {
    static readonly DEFAULTS: RequestHandlerOptions = {
        timeout: 15_000,
        offset: 50,
        retries: 3,
    };

    readonly options: RequestHandlerOptions;
    readonly hashes: Collection<string, string>;
    readonly buckets: Collection<string, Bucket>;

    globalRateLimit: Promise<void> | null = null;

    constructor(options: Partial<RequestHandlerOptions> = {}) {
        super();

        this.options = { ...DefaultRequestHandler.DEFAULTS, ...options };
        this.buckets = new Collection();
        this.hashes = new Collection();
    }

    async queueRequest<T>(request: Request): Promise<T | null> {
        const route = extractRoute(request.endpoint, request.method)
            , hash = this.hashes.get(`${request.method}:${route.bucket}`) ?? `Global(${request.method}-${route.bucket})`
            , bucket = this.getBucket(hash, route.majorParameter);

        return this.makeRequest(route, bucket, request, this.options.retries);
    }

    debug(message: string, bucket?: Bucket): void {
        this.emit("debug", `${bucket ? `(B):(${bucket.id}) ` : ""}${message}`);
    }

    private async makeRequest<T>(route: Route, bucket: Bucket, request: Request, tries: number): Promise<T | null> {
        /* make the request. */
        let response: Dispatcher.ResponseData;
        try {
            response = await bucket.consume(request);
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError" && tries > 0) {
                return this.makeRequest(route, bucket, request, --tries);
            }

            throw e;
        }

        /* handle any rate-limiting stuff via the Bucket. */
        if (bucket.handle(route, response)) {
            /* the bucket has requested us to re-run this request. */
            return this.makeRequest(route, bucket, request, tries);
        }

        /* handle everything else here. */
        if (response.statusCode >= 200 && response.statusCode < 400) {
            return await getResponseBody(response) as T;
        } else if (response.statusCode >= 500 && response.statusCode < 600) {
            /* retry until we've reached the total number of allowed retries. */
            if (tries > 0) {
                return this.makeRequest(route, bucket, request, --tries);
            }

            /* since we're out of retries, throw an error. */
            throw new DiscordHttpError(response.statusCode, request.method, request.endpoint);
        } else {
            /* handle malformed requests? */
            if (response.statusCode >= 400 && response.statusCode < 500) {
                const data = await response.body.json() as DiscordError;
                throw new DiscordAPIError(data, data.code, response.statusCode, request.method, request.url);
            }

            return null;
        }
    }

    private getBucket(hash: string, majorParameter: string) {
        let bucket = this.buckets.get(`${hash}:${majorParameter}`);
        if (!bucket) {
            bucket = new Bucket(this, hash, majorParameter);
            this.buckets.set(`${hash}:${majorParameter}`, bucket);
        }

        return bucket;
    }
}
