import { IMAGE_SIZES, ImageFormat, ImageSize } from "./constants";
import type { snowflake } from "@keiryo/common";

export class Cdn {
    static readonly DEFAULTS: Readonly<CdnOptions> = {
        defaultImageFormat: ImageFormat.Png,
        dynamic: true,
        url: "https://cdn.discordapp.com",
    };

    readonly options: CdnOptions;

    constructor(options: Partial<CdnOptions> = {}) {
        this.options = { ...Cdn.DEFAULTS, ...options };
    }

    appAsset(client: snowflake, hash: string, options?: ImageOptions): string {
        return this.makeUrl(`/app-assets/${client}/${hash}`, options);
    }

    appIcon(client: snowflake, hash: string, options?: ImageOptions): string {
        return this.makeUrl(`/app-icons/${client}/${hash}`, options);
    }

    avatar(id: snowflake, hash: string, options: ImageOptions = {}): string {
        options.dynamic = options.dynamic ?? this.options.dynamic;
        if (options.dynamic && hash.startsWith("a_")) {
            options.format = ImageFormat.Gif;
        }

        return this.makeUrl(`/avatars/${id}/${hash}`, options);
    }

    banner(id: snowflake, hash: string, options?: ImageOptions): string {
        return this.makeUrl(`/banners/${id}/${hash}`, options);
    }

    channelIcon(channel: snowflake, hash: string, options?: ImageOptions): string {
        return this.makeUrl(`/channel-icons/${channel}/${hash}`, options);
    }

    defaultAvatar(discriminator: number): string {
        return this.makeUrl(`/embed/avatars/${discriminator}`);
    }

    discoverySplash(guild: snowflake, hash: string, options?: ImageOptions): string {
        return this.makeUrl(`/discovery-splashes/${guild}/${hash}`, options);
    }

    emoji(emoji: snowflake, options?: ImageOptions): string {
        return this.makeUrl(`/emojis/${emoji}`, options);
    }

    icon(guild: snowflake, hash: string, options: ImageOptions = {}): string {
        options.dynamic = options.dynamic ?? this.options.dynamic;
        if (options.dynamic && hash.startsWith("a_")) {
            options.format = ImageFormat.Gif;
        }

        return this.makeUrl(`/icons/${guild}/${hash}`, options);
    }

    splash(guild: snowflake, hash: string, options?: ImageOptions): string {
        return this.makeUrl(`/splashes/${guild}/${hash}`, options);
    }

    teamIcon(team: snowflake, hash: string, options?: ImageOptions): string {
        return this.makeUrl(`/team-icons/${team}/${hash}`, options);
    }

    private makeUrl(endpoint: string, options: ImageOptions = {}): string {
        if (options.size && !IMAGE_SIZES.includes(options.size)) {
            throw new RangeError(`Invalid image size: ${options.size}\nMust be one of ${IMAGE_SIZES.join(", ")}`);
        }

        options.format = options.format ?? this.options.defaultImageFormat;
        options.size = options.size ?? this.options.defaultImageSize;

        let url = `${this.options.url}${endpoint}.${options.format}`;
        if (options.size) {
            url += `?size=${options.size}`;
        }

        return url;
    }
}

export interface ImageOptions {
    /**
     * The image format.
     */
    format?: ImageFormat;
    /**
     * The image size.
     */
    size?: ImageSize;
    /**
     * Whether to dynamically pick between "Gif" and the provided format.
     */
    dynamic?: boolean;
}

export interface CdnOptions {
    /**
     * The base CDN url to use.
     * @default "https://cdn.discordapp.com
     */
    url: string;
    /**
     * Whether to dynamically pick between the default format and ImageFormat.Png for assets.
     * @default true
     */
    dynamic: boolean;
    /**
     * The default image format to use.
     * @default ImageFormat.Png
     */
    defaultImageFormat: ImageFormat;
    /**
     * The default image size to use.
     */
    defaultImageSize?: ImageSize;
}

export default new Cdn();
