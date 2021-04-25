import type { HTTPMethod } from "petitio/dist/lib/PetitioRequest";
import { STATUS_CODES } from "http";

export class DiscordHTTPError extends Error {
  /**
   * The status code of the response.
   */
  status: number;

  /**
   * The route that errored.
   */
  route: string;

  /**
   * The method of the request that erred.
   */
  method: HTTPMethod;

  /**
   * @param status The status code of the response.
   * @param route The route that erred.
   * @param [method] The method of the request that erred.
   * @param message The error message
   */
  constructor(status: number, method: HTTPMethod, route: string, message = STATUS_CODES[status]) {
    super(message);

    this.status = status;
    this.route = route;
    this.method = method;
  }

  /**
   * Name of the error.
   */
  get name(): string {
    return "DiscordHTTPError";
  }
}
