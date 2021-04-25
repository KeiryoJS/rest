/*
 * NeoCord
 * Copyright 2021 melike2d
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const { homepage, version } = require("../package.json");

export const IMAGE_SIZES = Array.from({ length: 9 }, (_e, i) => 2 ** (i + 4));

export const IMAGE_FORMATS = [ "jpg", "jpeg", "png", "webp", "gif" ];

export const DEFAULTS = {
  version: 8,
  tokenPrefix: "Bot ",
  apiUrl: "https://discord.com/api",
  cdnUrl: "https://cdn.discordapp.com",
  timeout: 15000,
  retries: 3,
  userAgent: `DiscordBot (${homepage.split("#")[0]}, ${version}) Node.js/${process.version}`
};

export enum HttpHeader {
  Authorization = "Authorization",
  ContentType = "Content-Type",

  Date = "Date",

  /* RateLimit */
  XRateLimitRemaining = "X-RateLimit-Remaining",
  XRateLimitReset = "X-RateLimit-Reset",
  XRateLimitGlobal = "X-RateLimit-Global",
  XRateLimitBucket = "X-RateLimit-Bucket",
  XRateLimitPrecision = "X-RateLimit-Precision",
  RetryAfter = "Retry-After",

  UserAgent = "User-Agent",
  Via = "Via",

  // Discord
  XAuditLogReason = "X-Audit-Log-Reason",
}

export enum RESTEvent {
  RateLimited = "rateLimited",
  Debug = "debug"
}
