/* thanks https://github.com/discordjs/discord.js-modules/blob/main/packages/rest/src/lib/errors/DiscordAPIError.ts */

import type {
    DiscordError,
    DiscordErrorData,
    DiscordErrorFieldInformation,
    DiscordErrorGroupWrapper,
} from "discord-api-types/rest/v8";

function isErrorGroupWrapper(error: any): error is DiscordErrorGroupWrapper {
    return Reflect.has(error, "_errors");
}

function isErrorResponse(error: any): error is DiscordErrorFieldInformation {
    return typeof Reflect.get(error, "message") === "string";
}

/**
 * Represents an API error returned by Discord
 * @extends Error
 */
export class DiscordAPIError extends Error {
    /**
     * @param rawError The error reported by Discord
     * @param code The error code reported by Discord
     * @param status The status code of the response
     * @param method The method of the request that erred
     * @param url The url of the request that erred
     */
    public constructor(
        public rawError: DiscordError,
        public code: number,
        public status: number,
        public method: string,
        public url: string,
    ) {
        super(DiscordAPIError.getMessage(rawError));
    }

    private static getMessage(error: DiscordError) {
        let flattened = "";
        if (error.errors) {
            flattened = [ ...this.flattenDiscordError(error.errors) ].join("\n");
        }
        return error.message && flattened
            ? `${error.message}\n${flattened}`
            : error.message || flattened || "Unknown Error";
    }

    private static * flattenDiscordError(obj: DiscordError | DiscordErrorData, key = ""): IterableIterator<string> {
        if (isErrorResponse(obj)) {
            return yield `${key.length ? `${key}[${obj.code}]` : `${obj.code}`}: ${obj.message}`.trim();
        }

        for (const [ k, v ] of Object.entries(obj)) {
            const nextKey = k.startsWith("_") ? key : key ? (Number.isNaN(Number(k)) ? `${key}.${k}` : `${key}[${k}]`) : k;

            if (typeof v === "string") {
                yield v;
            } else if (isErrorGroupWrapper(v)) {
                for (const error of v._errors) {
                    yield * this.flattenDiscordError(error, nextKey);
                }
            } else {
                yield * this.flattenDiscordError(v, nextKey);
            }
        }
    }

    /**
     * The name of the error
     */
    get name(): string {
        return `${DiscordAPIError.name}[${this.code}]`;
    }
}
