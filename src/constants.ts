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
