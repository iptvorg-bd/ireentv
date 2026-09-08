export interface ChannelHeaders {
  Referer?: string;
  Origin?: string;
  "User-Agent"?: string;
  "x-forwarded-for"?: string;
  [key: string]: string | undefined;
}

export interface ChannelAttrs {
  "tvg-chno"?: string;
  "tvg-id"?: string;
  [key: string]: string | undefined;
}

export interface Channel {
  id?: number | string;
  name: string;
  logo: string;
  url: string;
  group: string;
  stream_url?: string;
  raw_stream_url?: string;
  url_raw?: string;
  tvg_id?: string;
  referer?: string;
  user_agent?: string;
  headers?: ChannelHeaders;
  attrs?: ChannelAttrs;
}

export interface PlaylistInfo {
  playlist_name?: string;
  owner?: string;
  telegram?: string;
  website?: string;
  developer?: string;
  version?: string;
  channels_amount?: number;
  last_update?: string;
}

export interface PlaylistData {
  status?: string;
  owner?: string;
  telegram?: string;
  website?: string;
  developer?: string;
  version?: string;
  name?: string;
  playlist_name?: string;
  channels_amount?: number;
  Last_update?: string;
  last_update?: string;
  info?: PlaylistInfo;
  channels: Channel[];
}

export type Language = "bn" | "en";

export interface Translations {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  allCategories: string;
  favorites: string;
  noFavorites: string;
  noChannels: string;
  streamProxyActive: string;
  streamProxyDesc: string;
  directPlay: string;
  directPlayDesc: string;
  nowPlaying: string;
  aspectRatio: string;
  stats: string;
  buffer: string;
  resolution: string;
  language: string;
  owner: string;
  developer: string;
  lastUpdate: string;
  liveBadge: string;
  share: string;
  copied: string;
  channelsCount: string;
  reloadStream: string;
  theaterMode: string;
  exitTheaterMode: string;
  play: string;
  pause: string;
  volume: string;
  mute: string;
  unmute: string;
}
