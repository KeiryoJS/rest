import type { Request, Route } from "../handler";
import { HttpHeader, HttpStatus } from "../../util/constants";
import type { DefaultRequestHandler } from "./default";
import { Dispatcher, request } from "undici";
import { createTimeout, Mutex } from "@keiryo/common";
import { getHeader } from "../../util/request";
import AbortController from "abort-controller";

// TODO: make this less scuffed? lmfao

export class Bucket {
    readonly id: string;

    resetsAt = -1;
    remaining = -1;
    limit = Infinity;

    private _mutex: Mutex;

    constructor(readonly handler: DefaultRequestHandler, readonly hash: string, readonly majorParameter: string) {
        this.id = `${hash}:${majorParameter}`;
        this._mutex = new Mutex();
    }

    get inactive(): boolean {
        return !this._mutex.locked && !this.limited;
    }

    get limited(): boolean {
        return this.remaining <= 0 && Date.now() < this.resetsAt;
    }

    async consume(req: Request): Promise<Dispatcher.ResponseData> {
        const release = await this._mutex.take();

        /* handle global rate-limits. */
        await this.handler.globalRateLimit;

        /* check if this bucket is limited. */
        if (this.limited) {
            await this.hit(req);
        }

        const controller = new AbortController()
            , timeout = createTimeout(this.handler.options.timeout, () => controller.abort())
            , start = Date.now();

        try {
            return request(req.url, {
                body: req.body,
                headers: req.headers,
                method: req.method,
                signal: controller.signal,
            });
        } finally {
            this.handler.debug(`actual request took ${Date.now() - start}`);
            timeout.stop();
            release();
        }
    }

    handle(route: Route, response: Dispatcher.ResponseData): boolean {
        const limit = getHeader(response, HttpHeader.XRateLimitLimit)
            , remaining = getHeader(response, HttpHeader.XRateLimitRemaining)
            , reset = getHeader(response, HttpHeader.XRateLimitResetAfter)
            , hash = getHeader(response, HttpHeader.XRateLimitBucket)
            , retry = getHeader(response, HttpHeader.RetryAfter);

        this.limit = limit ? +limit : Infinity;
        this.remaining = remaining ? +remaining : 1;
        this.resetsAt = reset ? +reset * 1000 + Date.now() + this.handler.options.offset : Date.now();

        let retryAfter = 0;
        if (retry) {
            retryAfter = +retry * 1000 + this.handler.options.offset;
        }

        /* handle hash changes. */
        if (hash && this.hash !== hash) {
            this.handler.debug(`Bucket hash has been updated: old=${this.hash}, new=${hash}`, this);
            /* this bucket will eventually be removed */
            this.handler.hashes.set(`${route.method}:${route.bucket}`, hash);
        }

        /* handle global rate-limiting. */
        if (getHeader(response, HttpHeader.XRateLimitGlobal)) {
            this.handler.globalRateLimit = Mutex.wait(retryAfter)
                .then(() => void (this.handler.globalRateLimit = null));
        }

        return response.statusCode === HttpStatus.RateLimited;
    }

    async hit(request: Request): Promise<void> {
        const duration = this.resetsAt - Date.now();

        this.handler.debug(`Waiting ${duration}ms`);
        this.handler.emit("limited", {
            request,
            duration,
            hash: this.hash,
            limit: this.limit,
            majorParameter: this.majorParameter
        });

        await Mutex.wait(duration);
    }
}
