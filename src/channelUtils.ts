import { Channel, PlaylistData } from "./types";

/**
 * Utility functions for Channel Slug generation, normalization and matching
 */

export interface ChannelItem {
  id?: number | string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  stream_url?: string;
  raw_stream_url?: string;
  tvg_id?: string;
  referer?: string;
  user_agent?: string;
}

/**
 * Normalizes a raw channel object from any JSON playlist format
 * Supports stream_url, raw_stream_url, url, url_raw, stream, link, etc.
 * Handles pipe-separated headers (e.g. url|x-forwarded-for:1.2.3.4)
 */
export function normalizeChannel(raw: any, index: number = 0): Channel {
  if (!raw) {
    return {
      id: index + 1,
      name: `Channel ${index + 1}`,
      logo: "",
      url: "",
      group: "Sports"
    };
  }

  // 1. Extract clean stream URL
  let cleanUrl = "";
  if (typeof raw.raw_stream_url === "string" && raw.raw_stream_url.trim()) {
    cleanUrl = raw.raw_stream_url.trim();
  } else if (typeof raw.stream_url === "string" && raw.stream_url.trim()) {
    cleanUrl = raw.stream_url.split("|")[0].trim();
  } else if (typeof raw.url === "string" && raw.url.trim()) {
    cleanUrl = raw.url.split("|")[0].trim();
  } else if (typeof raw.url_raw === "string" && raw.url_raw.trim()) {
    cleanUrl = raw.url_raw.split("|")[0].trim();
  } else if (typeof raw.stream === "string" && raw.stream.trim()) {
    cleanUrl = raw.stream.split("|")[0].trim();
  } else if (typeof raw.link === "string" && raw.link.trim()) {
    cleanUrl = raw.link.split("|")[0].trim();
  }

  // 2. Extract metadata
  const name = (raw.name || raw.title || raw.channel || raw.tvg_name || `Channel ${index + 1}`).toString().trim();
  const logo = (raw.logo || raw.image || raw.icon || raw.tvg_logo || "").toString().trim();
  const group = (raw.group || raw.category || raw.group_title || raw["group-title"] || "Sports").toString().trim();
  const tvgId = (raw.tvg_id || raw.tvgId || (raw.attrs ? raw.attrs["tvg-id"] : "") || "").toString().trim();
  const referer = raw.referer || (raw.headers ? raw.headers.Referer : undefined);
  const userAgent = raw.user_agent || (raw.headers ? raw.headers["User-Agent"] : undefined);

  return {
    id: raw.id ?? (index + 1),
    name,
    logo,
    url: cleanUrl,
    group,
    stream_url: raw.stream_url || cleanUrl,
    raw_stream_url: raw.raw_stream_url || cleanUrl,
    url_raw: raw.url_raw || cleanUrl,
    tvg_id: tvgId,
    referer,
    user_agent: userAgent,
    headers: {
      Referer: referer,
      "User-Agent": userAgent,
      ...(raw.headers || {})
    },
    attrs: {
      "tvg-id": tvgId,
      ...(raw.attrs || {})
    }
  };
}

/**
 * Normalizes full JSON playlist data
 */
export function getBaseChannelName(rawName: string): string {
  if (!rawName) return "Channel";
  let s = cleanUnicodeText(rawName).trim();
  s = s.replace(/[\s\-_]*[\[\(]?(FHD|UHD|HD|SD|4K|2K|720p|1080p|HEVC|HQ)[\]\)]?[\s\-_]*/gi, " ").trim();
  s = s.replace(/\s+/g, " ");
  return s || rawName.trim();
}

export function normalizeKey(str: string): string {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function deduplicateAndNumberChannels<T extends { name: string }>(list: T[]): T[] {
  const groups = new Map<string, { baseName: string; items: Array<{ ch: T; index: number }> }>();

  list.forEach((ch, index) => {
    const origName = (ch.name || "").trim();
    const baseName = getBaseChannelName(origName);
    const key = normalizeKey(baseName) || normalizeKey(origName) || `ch_${index}`;

    if (!groups.has(key)) {
      groups.set(key, { baseName, items: [] });
    }
    groups.get(key)!.items.push({ ch, index });
  });

  const result = [...list];

  for (const [, group] of groups) {
    const { baseName, items } = group;
    if (items.length === 1) {
      result[items[0].index] = {
        ...items[0].ch,
        name: baseName
      };
    } else {
      const endsWithNumber = /\d+$/.test(baseName);
      items.forEach((item, i) => {
        const num = i + 1;
        const numberedName = endsWithNumber ? `${baseName} - ${num}` : `${baseName} ${num}`;
        result[item.index] = {
          ...item.ch,
          name: numberedName
        };
      });
    }
  }

  return result;
}

export function normalizePlaylistData(raw: any): PlaylistData {
  if (!raw) return { channels: [] };
  let rawChannels: any[] = [];
  if (Array.isArray(raw.channels)) {
    rawChannels = raw.channels;
  } else if (Array.isArray(raw)) {
    rawChannels = raw;
  }

  let channels: Channel[] = rawChannels.map((c, i) => normalizeChannel(c, i));
  channels = deduplicateAndNumberChannels(channels);
  const info = raw.info || {};

  return {
    status: raw.status || "success",
    name: raw.name || info.playlist_name || raw.playlist_name || "Live Sports",
    playlist_name: raw.playlist_name || info.playlist_name || raw.name || "Live Sports",
    owner: raw.owner || info.owner || "IreenTv",
    telegram: raw.telegram || info.telegram || "https://t.me/ireentv",
    website: raw.website || info.website || "https://ireentv.pages.dev",
    developer: raw.developer || info.developer || "MD ANAMUL HOQUE",
    version: raw.version || info.version || "1.0",
    channels_amount: channels.length,
    Last_update: raw.Last_update || raw.last_update || info.last_update || "Just Now",
    last_update: raw.last_update || raw.Last_update || info.last_update || "Just Now",
    info,
    channels
  };
}

/**
 * Normalizes unicode stylized bold / mathematical characters into plain ASCII
 */
export function cleanUnicodeText(str: string): string {
  if (!str) return "";
  let res = "";
  for (const char of str) {
    const cp = char.codePointAt(0) || 0;
    // Mathematical Bold Capital A-Z: 0x1D400 - 0x1D419 -> A-Z (0x41)
    if (cp >= 0x1D400 && cp <= 0x1D419) {
      res += String.fromCharCode(cp - 0x1D400 + 65);
    }
    // Mathematical Bold Small a-z: 0x1D41A - 0x1D433 -> a-z (0x61)
    else if (cp >= 0x1D41A && cp <= 0x1D433) {
      res += String.fromCharCode(cp - 0x1D41A + 97);
    }
    // Mathematical Sans-serif Bold: 0x1D5D4 - 0x1D5ED and 0x1D5EE - 0x1D607
    else if (cp >= 0x1D5D4 && cp <= 0x1D5ED) {
      res += String.fromCharCode(cp - 0x1D5D4 + 65);
    }
    else if (cp >= 0x1D5EE && cp <= 0x1D607) {
      res += String.fromCharCode(cp - 0x1D5EE + 97);
    }
    else {
      res += char;
    }
  }
  return res;
}

/**
 * Parses raw M3U / M3U8 string format into structured PlaylistData
 */
export function parseM3uToPlaylistData(m3uContent: string): PlaylistData {
  const lines = m3uContent.split(/\r?\n/);
  const channels: Channel[] = [];
  let currentExtInf = "";
  let lastUpdate = "Just Now";
  let playlistName = "IreenTV Live";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.includes("Last Updated:")) {
      const match = line.match(/Last Updated:\s*([^\r\n#]+)/i);
      if (match) lastUpdate = match[1].trim();
    }
    if (line.includes("Playlist Name:")) {
      const match = line.match(/Playlist Name:\s*([^\r\n#]+)/i);
      if (match) playlistName = match[1].trim();
    }

    if (line.startsWith("#EXTINF:")) {
      currentExtInf = line;
      continue;
    }

    if (currentExtInf && !line.startsWith("#")) {
      const streamUrl = line.trim();

      const commaIdx = currentExtInf.indexOf(",");
      const metaPart = commaIdx !== -1 ? currentExtInf.substring(0, commaIdx) : currentExtInf;
      const channelTitle = commaIdx !== -1 ? currentExtInf.substring(commaIdx + 1).trim() : `Channel ${channels.length + 1}`;

      const getAttr = (attr: string): string => {
        const regex = new RegExp(`${attr}="([^"]*)"`, "i");
        const match = metaPart.match(regex);
        return match ? match[1] : "";
      };

      const tvgId = getAttr("tvg-id");
      const tvgName = getAttr("tvg-name") || channelTitle;
      const tvgLogo = getAttr("tvg-logo");
      let groupTitle = getAttr("group-title") || "General";

      groupTitle = cleanUnicodeText(groupTitle).trim();
      const groupUpper = groupTitle.toUpperCase();
      if (groupUpper === "BANGLA") groupTitle = "Bangla";
      else if (groupUpper === "SPORTS") groupTitle = "Sports";
      else if (groupUpper === "KIDS") groupTitle = "Kids";
      else if (groupUpper === "MOVIE" || groupUpper === "MOVIES") groupTitle = "Movies";
      else if (groupUpper === "MUSIC") groupTitle = "Music";
      else if (groupUpper.includes("RELAGION") || groupUpper.includes("RELIGION") || groupUpper.includes("ISLAM")) groupTitle = "Islamic";
      else if (groupUpper === "DOCUMENTARY") groupTitle = "Documentary";
      else if (groupUpper === "NEWS") groupTitle = "News";
      else if (groupUpper === "HINDI") groupTitle = "Hindi";

      const channelObj: Channel = normalizeChannel({
        id: channels.length + 1,
        name: tvgName || channelTitle,
        logo: tvgLogo,
        url: streamUrl,
        group: groupTitle,
        stream_url: streamUrl,
        raw_stream_url: streamUrl,
        tvg_id: tvgId,
        attrs: {
          "tvg-id": tvgId,
          "group-title": groupTitle
        }
      }, channels.length);

      channels.push(channelObj);
      currentExtInf = "";
    }
  }

  const processedChannels = deduplicateAndNumberChannels(channels);

  return {
    status: "success",
    name: playlistName,
    playlist_name: playlistName,
    owner: "IreenTv",
    telegram: "https://t.me/ireentv",
    website: "https://ireentv.pages.dev",
    developer: "MD ANAMUL HOQUE",
    version: "2.0",
    channels_amount: processedChannels.length,
    Last_update: lastUpdate,
    last_update: lastUpdate,
    channels: processedChannels
  };
}

export function slugifyChannelName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .replace(/[^\w\s-]/g, "") // remove special characters except hyphen and spaces
    .replace(/[\s_]+/g, "") // remove whitespace and underscores for compact matching like LaLigaTV
    .toLowerCase();
}

export function cleanChannelSlug(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]/g, "");
}

export function findMatchingChannel(channels: ChannelItem[] | Channel[], requestedSlugOrName: string): Channel | ChannelItem | null {
  if (!channels || channels.length === 0 || !requestedSlugOrName) return null;

  // Clean the input name (remove .m3u8 or .m3u suffix if present)
  const cleanInput = requestedSlugOrName
    .replace(/\.m3u8?$/i, "")
    .trim();

  // 1. Direct exact name match
  const exact = channels.find(
    (c) => c.name.trim().toLowerCase() === cleanInput.toLowerCase()
  );
  if (exact) return exact;

  // 2. Slugified match (ignoring spaces, underscores, dashes, special chars, case)
  const inputSlug = slugifyChannelName(cleanInput);
  const slugMatch = channels.find(
    (c) => slugifyChannelName(c.name) === inputSlug
  );
  if (slugMatch) return slugMatch;

  // 3. Partial contains match if close enough
  const partial = channels.find(
    (c) => slugifyChannelName(c.name).includes(inputSlug) || inputSlug.includes(slugifyChannelName(c.name))
  );
  if (partial) return partial;

  return null;
}

export function generateM3uContent(channels: ChannelItem[] | Channel[], baseUrl: string): string {
  let m3u = `#EXTM3U x-tvg-url=""\n\n`;

  for (const ch of channels) {
    const slug = cleanChannelSlug(ch.name);
    const logo = ch.logo || "";
    const group = ch.group || "Sports";
    const channelName = ch.name.trim();
    const streamEndpoint = `${baseUrl.replace(/\/$/, "")}/${slug}.m3u8`;

    m3u += `#EXTINF:-1 tvg-id="${slug}" tvg-name="${channelName}" tvg-logo="${logo}" group-title="${group}",${channelName}\n`;
    m3u += `${streamEndpoint}\n\n`;
  }

  return m3u;
}
