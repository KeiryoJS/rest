import { HttpHeader, HttpMethod } from "./constants";
import { snowflake, Snowflake } from "@keiryo/common";

import type { Route } from "../handler/handler";
import type { ResponseData } from "undici/types/dispatcher";

const ROUTE_REPLACERS = [
    { pattern: /\d{16,19}/g, value: ":id" },
    { pattern: /\/reactions\/(.+)/, value: "/reactions/:reaction" },
];

export function extractRoute(endpoint: string, method: HttpMethod): Route {
    const majorParameter = /^\/(?:channels|guilds|webhooks)\/(\d{16,19})/.exec(endpoint)?.[1] ?? "global";

    /* get the route id */
    let route: string = endpoint;
    for (const { pattern, value } of ROUTE_REPLACERS) {
        route = route.replace(pattern, value);
    }

    /* old message deletions are on a different bucket. */
    let exceptions = "";
    if (method === HttpMethod.Delete && route === "/channels/:id/messages/:id") {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const id = /\d{16,19}$/.exec(endpoint)![0];
        if (BigInt(Date.now()) - Snowflake.deconstruct(id as snowflake).timestamp > 1000n * 60n * 60n * 24n * 14n) {
            exceptions += ";delete-old";
        }
    }

    return {
        majorParameter,
        bucket: route + exceptions,
        method
    };
}

export function getHeader(response: ResponseData, header: string): string | null {
    const value = response.headers[header.toLowerCase()];
    if (!value) {
        return null;
    }

    return Array.isArray(value) ? value[0] ?? null : value;
}

export function getResponseBody<T>(response: ResponseData): Promise<Buffer | T> {
    if (getHeader(response, HttpHeader.ContentType)?.startsWith("application/json")) {
        return response.body.json() as Promise<T>;
    }

    return response.body.arrayBuffer().then(Buffer.from);
}
