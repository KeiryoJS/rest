import type { Dictionary } from "@neocord/common";

export class DiscordAPIError extends Error {
  /**
   * The error code reported by discord.
   */
  code: number;

  /**
   * The status code of the response.
   */
  statusCode: number;

  /**
   * The request method.
   */
  method: string;

  /**
   * The route that errored.
   * @type {string}
   */
  route: string;

  /**
   * @param data The data sent by discord.
   * @param status The status code of the response.
   * @param method The method of the request that erred.
   * @param route The route that errored.
   */
  constructor(data: Dictionary, status: number, method: string, route: string) {
    const flattened = DiscordAPIError.flattenErrors(data.errors ?? data).join("\n");

    super(data.message && flattened
      ? `${data.message}\n${flattened}`
      : data.message || flattened);

    this.code = data.code;
    this.statusCode = status;
    this.method = method;
    this.route = route;
  }

  /**
   * The name of the error.
   */
  get name(): string {
    return `${DiscordAPIError.name} [${this.code}]`;
  }

  /**
   * Flattens an errors object returned from the API into an array.
   * @see https://github.com/discordjs/discord.js/blob/master/src/rest/DiscordAPIError.js#L46-L65
   *
   * @param obj Discord errors object
   * @param [key] Used internally to determine key names of nested fields
   */
  static flattenErrors(obj: Dictionary, key = ""): string[] {
    let messages: string[] = [];

    for (const [ k, v ] of Object.entries(obj)) {
      if (k === "message") {
        continue;
      }
      const newKey = key ? (Number.isNaN(k) ? `${key}.${k}` : `${key}[${k}]`) : k;

      if (v._errors) {
        messages.push(`${newKey}: ${v._errors.map((e: Dictionary) => e.message).join(" ")}`);
      } else if (v.code || v.message) {
        messages.push(`${v.code ? `${v.code}: ` : ""}${v.message}`.trim());
      } else if (typeof v === "string") {
        messages.push(v);
      } else {
        messages = messages.concat(this.flattenErrors(v, newKey));
      }
    }

    return messages;
  }
}
