export type ImageSize = 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096;

export const IMAGE_SIZES = Array.from({ length: 9 }, (_e, i) => 2 ** (i + 4)) as ImageSize[];

export enum TokenPrefix {
    Bot = "Bot ",
    Bearer = "Bearer ",
    None = "",
}

export enum ImageFormat {
    Jpeg = "jpeg",
    Png = "png",
    Webp = "webp",
    Gif = "gif"
}

export enum HttpMethod {
    Get = "GET",
    Post = "POST",
    Put = "PUT",
    Patch = "PATCH",
    Delete = "DELETE",
}

export enum HttpHeader {
    Authorization = "Authorization",
    ContentType = "Content-Type",

    Date = "Date",

    /* RateLimit */
    XRateLimitRemaining = "X-RateLimit-Remaining",
    XRateLimitLimit = "X-RateLimit-Limit",
    XRateLimitResetAfter = "X-RateLimit-Reset-After",
    XRateLimitGlobal = "X-RateLimit-Global",
    XRateLimitBucket = "X-RateLimit-Bucket",
    XRateLimitPrecision = "X-RateLimit-Precision",
    RetryAfter = "Retry-After",

    UserAgent = "User-Agent",
    Via = "Via",

    // Discord
    XAuditLogReason = "X-Audit-Log-Reason",
}

export enum HttpStatus {
    Ok = 200,
    BadRequest = 400,
    Unauthorized,
    Forbidden = 403,
    NotFound,
    RateLimited = 429,
}

export enum RESTEvent {
    RateLimited = "rateLimited",
    Debug = "debug"
}

export type Endpoint = `/${string}`;
