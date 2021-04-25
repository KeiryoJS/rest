import { Mutex } from "@neocord/common";
import { HttpHeader } from "../constants";

import type { PetitioResponse } from "petitio/dist/lib/PetitioResponse";

export class Bucket {
  /**
   * The global rate-limit promise.
   */
  static GLOBAL_RATE_LIMIT: Promise<void> | null = null;

  /**
   * The route identifier.
   */
  readonly route: string;

  /**
   * The number of remaining requests that we can make.
   */
  remaining = 1;

  /**
   * The timestamp in which this rate-limit will reset.
   */
  resetTimestamp = -1;

  /**
   * The locking queue.
   */
  lock: Mutex = new Mutex();

  /**
   * @param route The route identifier.
   */
  constructor(route: string) {
    this.route = route;
  }

  /**
   * Used for getting the time offset of the discord api.
   *
   * @param serverDate The server date.
   *
   * @return {number}
   */
  static getAPIOffset(serverDate: string): number {
    return new Date(serverDate).getTime() - Date.now();
  }

  /**
   * Whether this bucket has been rate-limited.
   */
  get rateLimited(): boolean {
    return this.remaining < 0 && this.resetTimestamp > Date.now();
  }

  /**
   * The number of milliseconds until our rate-limit gets reset.
   */
  get untilReset(): number {
    return this.resetTimestamp < 0
      ? 0
      : this.resetTimestamp - Date.now();
  }

  /**
   * Basic information about this bucket.
   */
  get info(): BucketInformation {
    return {
      remaining: this.remaining,
      resetTimestamp: this.resetTimestamp
    };
  }

  /**
   * Handles a node-fetch response.
   *
   * @param {PetitioResponse} res The node-fetch response.
   */
  async handle(res: PetitioResponse): Promise<void> {
    const _serverDate = res.headers.date,
      _remaining = res.headers[HttpHeader.XRateLimitRemaining],
      _reset = res.headers[HttpHeader.XRateLimitReset],
      _cf = res.headers[HttpHeader.Via];

    let _retryAfter = +res.headers[HttpHeader.RetryAfter];
    if (_retryAfter && (typeof _cf !== "string" || !_cf.includes("1.1 google"))) {
      _retryAfter *= 1000;
    }

    this.remaining = +_remaining ?? 1;
    this.resetTimestamp = _reset
      ? new Date(+_reset * 1000).getTime() - Bucket.getAPIOffset(_serverDate)
      : Date.now();

    // https://github.com/discord/discord-api-docs/issues/182
    if (this.route.includes("reactions")) {
      this.resetTimestamp = new Date(_serverDate).getTime() - Bucket.getAPIOffset(_serverDate) + 250;
    }

    if (res.headers[HttpHeader.XRateLimitGlobal]) {
      Bucket.GLOBAL_RATE_LIMIT = Mutex.wait(_retryAfter).then(() => {
        Bucket.GLOBAL_RATE_LIMIT = null;
      });

      await Bucket.GLOBAL_RATE_LIMIT;
    }
  }
}

export interface BucketInformation {
  remaining: number;
  resetTimestamp: number;
}
