import { DEFAULTS, IMAGE_FORMATS, IMAGE_SIZES } from "../constants";

export class CDN {
  /**
   * The URL of the discord cdn.
   */
  url: string;

  /**
   * @param url The URL to use.
   */
  constructor(url = DEFAULTS.cdnUrl) {
    this.url = url.replace(/\/*$/m, "");
  }

  /**
   * Generates an app asset URL for a client's asset.
   *
   * @param clientId The client ID that has the asset.
   * @param assetHash The hash provided by Discord for this asset.
   * @param [options={}] Optional options for the asset.
   */
  appAsset(clientId: string, assetHash: string, options: ImageURLOptions): string {
    return this.makeUrl(`/app-assets/${clientId}/${assetHash}`, options);
  }

  /**
   * Generates an app icon URL for a client's icon.
   *
   * @param clientId The client ID that has the icon.
   * @param iconHash The hash provided by Discord for this icon.
   * @param [options={}] Optional options for the icon.
   */
  appIcon(clientId: string, iconHash: string, options: ImageURLOptions = {}): string {
    return this.makeUrl(`/app-icons/${clientId}/${iconHash}`, options);
  }

  /**
   * Generates the default avatar URL for a discriminator.
   *
   * @param discriminator The users discriminator.
   */
  defaultAvatar(discriminator: string): string {
    return this.makeUrl(`/embed/avatars/${~~discriminator % 5}`);
  }

  /**
   * Generates a discovery splash URL for a guild's discovery splash.
   *
   * @param guildId The guild ID that has the discovery splash.
   * @param splashHash The hash provided by Discord for this splash.
   * @param [options={}] Optional options for the splash.
   */
  discoverySplash(guildId: string, splashHash: string, options: ImageURLOptions = {}): string {
    return this.makeUrl(
      `/discovery-splashes/${guildId}/${splashHash}`,
      options
    );
  }

  /**
   * Generates an emoji's URL for an emoji.
   *
   * @param emojiId The emoji ID.
   * @param [format] The extension of the emoji.
   */
  emoji(emojiId: string, format: ImageFormat): string {
    return this.makeUrl(`/emojis/${emojiId}`, { format: format });
  }

  /**
   * Generates a group DM icon URL for a group DM.
   *
   * @param channelId The group channel ID that has the icon.
   * @param iconHash The hash provided by Discord for this group DM channel.
   * @param [options={}] Optional options for the icon.
   */
  groupDMIcon(channelId: string, iconHash: string, options: ImageURLOptions = {}): string {
    return this.makeUrl(`/channel-icons/${channelId}/${iconHash}`, options);
  }

  /**
   * Generates a banner URL for a guild's banner.
   *
   * @param guildId The guild ID that has the banner splash.
   * @param bannerHash The hash provided by Discord for this banner.
   * @param [options={}] Optional options for the banner.
   */
  guildBanner(guildId: string, bannerHash: string, options: ImageURLOptions = {}): string {
    return this.makeUrl(`/banners/${guildId}/${bannerHash}`, options);
  }

  /**
   * Generates an icon URL for a guild's icon.
   *
   * @param guildId The guild ID that has the icon splash.
   * @param iconHash The hash provided by Discord for this icon.
   * @param [options={}] Optional options for the icon.
   */
  guildIcon(guildId: string, iconHash: string, options: ImageURLOptions = {}): string {
    return this.makeUrl(`/icons/${guildId}/${iconHash}`, options);
  }

  /**
   * Generates a guild invite splash URL for a guild's invite splash.
   *
   * @param guildId The guild ID that has the invite splash.
   * @param splashHash The hash provided by Discord for this splash.
   * @param [options={}] Optional options for the splash.
   */
  splash(guildId: string, splashHash: string, options: ImageURLOptions = {}): string {
    return this.makeUrl(`/splashes/${guildId}/${splashHash}`, options);
  }

  /**
   * Generates a team icon URL for a team's icon.
   *
   * @param teamId The team ID that has the icon.
   * @param iconHash The hash provided by Discord for this icon.
   * @param [options={}] Optional options for the icon.
   */
  teamIcon(teamId: string, iconHash: string, options: ImageURLOptions = {}): string {
    return this.makeUrl(`/team-icons/${teamId}/${iconHash}`, options);
  }

  /**
   * Generates a user avatar URL for a user's avatar.
   *
   * @param userId The user ID that has the icon.
   * @param avatarHash The hash provided by Discord for this avatar.
   * @param [options={}] Optional options for the avatar.
   */
  userAvatar(userId: string, avatarHash: string, { dynamic = false, ...options }: ImageURLOptions = {}): string {
    if (dynamic) {
      options.format = avatarHash.startsWith("a_") ? "gif" : options.format;
    }

    return this.makeUrl(`/avatars/${userId}/${avatarHash}`, options);
  }

  /***
   * Constructs the URL for the CDN resource.
   *
   * @param endpoint
   * @param options
   */
  makeUrl(endpoint: string, { format = "png", size }: ImageURLOptions = {}): string {
    endpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    if (format && !IMAGE_FORMATS.includes(format.toLowerCase())) {
      throw new TypeError(`Invalid format provided: "${format}"`);
    }

    if (size && !IMAGE_SIZES.includes(size)) {
      throw new RangeError(`Invalid size provided: "${format}"`);
    }

    let url = `${this.url}${endpoint}.${format?.toLowerCase()}`;
    if (size) {
      url += `?size=${size}`;
    }

    return url;
  }

}

export type ImageFormat = "jpg" | "jpeg" | "png" | "webp" | "gif";

export type ImageSize = 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096;

export interface ImageURLOptions {
  /**
   * Whether to dynamically change the format.
   */
  dynamic?: boolean;

  /**
   * The image size
   */
  size?: ImageSize;

  /**
   * The image format to return
   */
  format?: ImageFormat;
}
