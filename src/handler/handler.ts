import type { Dictionary } from "@keiryo/common";
import type { TypedEmitter } from "tiny-typed-emitter";
import type { HttpMethod } from "../util/constants";
import type { Events } from "../client";

export interface RequestHandler extends TypedEmitter<Events> {
    readonly options: RequestHandlerOptions;

    /**
     * Makes a request.
     * @param {Request} request The request to make.
     */
    queueRequest<T>(request: Request): Promise<T | null>;
}

type InternalRequestKeys = "url" | "endpoint" | "route" | "bucket";

export type RequestOptions = Partial<Omit<Request, InternalRequestKeys> & ExtraRequestOptions>;

export interface RequestHandlerOptions {
    /**
     * The number of retries for failed requests.
     * @default 3
     */
    retries: number;
    /**
     * The amount of time (in milliseconds) to wait until a request is aborted.
     * @default 15_000
     */
    timeout: number;
    /**
     * The rate-limit offset to use, in milliseconds.
     * @default 50
     */
    offset: number;
}


export interface ExtraRequestOptions {
    authorize: boolean;
    auditLogReason: string;
    query: Dictionary<string | number | string[]>;
    files: File[];
}

export interface Route {
    majorParameter: string;
    bucket: string;
    method: HttpMethod;
}

export interface Request {
    endpoint: string;
    url: string;
    headers: Dictionary<string>;
    method: HttpMethod;
    body?: any;
}

export interface File {
    name: string;
    file: string | Buffer | NodeJS.ReadableStream;
}
