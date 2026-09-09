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

  // 3. Preserve servers if already present
  const servers: import("./types").ChannelServer[] | undefined = Array.isArray(raw.servers) && raw.servers.length > 0
    ? raw.servers.map((s: any, sIdx: number) => ({
        id: s.id ?? (sIdx + 1),
        server_num: s.server_num ?? (sIdx + 1),
        name: s.name || `${name} Server ${sIdx + 1}`,
        label: s.label || `Server ${sIdx + 1}`,
        quality: s.quality,
        url: s.url || "",
        stream_url: s.stream_url || s.url || "",
        raw_stream_url: s.raw_stream_url || s.stream_url || s.url || "",
        logo: s.logo || logo,
        referer: s.referer,
        user_agent: s.user_agent,
        headers: s.headers
      }))
    : undefined;

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
    },
    servers,
    server_num: servers ? servers.length : (raw.server_num || 1),
    active_server_index: raw.active_server_index ?? 0,
    base_name: raw.base_name || name
  };
}

/**
 * Normalizes full JSON playlist data
 */
export function normalizePlaylistData(raw: any): PlaylistData {
  if (!raw) return { channels: [] };

  let rawChannels: any[] = [];
  if (Array.isArray(raw.channels)) {
    rawChannels = raw.channels;
  } else if (Array.isArray(raw)) {
    rawChannels = raw;
  }

  const normalizedChannels: Channel[] = rawChannels.map((c, i) => normalizeChannel(c, i));

  // Check if raw data was already grouped with multiple servers
  const hasMultiServers = normalizedChannels.some(c => c.servers && c.servers.length > 1);

  let channels: Channel[];
  if (hasMultiServers) {
    // Already populated with multiple servers; do not strip or collapse!
    channels = normalizedChannels;
  } else {
    const numberedChannels: Channel[] = assignServerNumbers(normalizedChannels);
    channels = groupChannelsForWebsite(numberedChannels);
  }
  const info = raw.info || {};

  return {
    status: raw.status || "success",
    name: raw.name || info.playlist_name || raw.playlist_name || "Live Sports",
    playlist_name: raw.playlist_name || info.playlist_name || raw.name || "Live Sports",
    owner: raw.owner || info.owner || "IreenTv",
    telegram: raw.telegram || info.telegram || "https://t.me/ireentv",
    website: raw.website || info.website || "https://ireentv.pages.dev",
    developer: raw.developer || info.developer || "MD ANAMUL HOQUE",
    version: raw.version || info.version || "2.0",
    channels_amount: raw.channels_amount || info.channels_amount || channels.length,
    Last_update: raw.Last_update || raw.last_update || info.last_update || "Just Now",
    last_update: raw.last_update || raw.Last_update || info.last_update || "Just Now",
    info,
    channels
  };
}

/**
 * Assigns numbered server labels (e.g. "Server 1", "Server 2") to duplicate/multi-stream channels
 * If a channel name appears multiple times in the playlist, each stream is distinctly numbered:
 * "T Sports HD Server 1", "T Sports HD Server 2", "Star Sports 1 Server 1", etc.
 */
export function assignServerNumbers<T extends { name: string; url?: string; stream_url?: string; [key: string]: any }>(channels: T[]): T[] {
  if (!channels || channels.length === 0) return [];

  // Count occurrences of each base name
  const nameCounts: Record<string, number> = {};
  for (const c of channels) {
    const rawName = (c.name || "Channel").toString().trim();
    const cleanName = cleanUnicodeText(rawName).trim();
    const baseName = cleanName.replace(/[\s,_-]+(?:server|sarvar)[\s,_-]*\d+$/i, "").trim();
    const key = baseName.toLowerCase();
    nameCounts[key] = (nameCounts[key] || 0) + 1;
  }

  // Assign numbers for items where count > 1
  const serverCounters: Record<string, number> = {};
  return channels.map((c) => {
    const rawName = (c.name || "Channel").toString().trim();
    const cleanName = cleanUnicodeText(rawName).trim();
    const baseName = cleanName.replace(/[\s,_-]+(?:server|sarvar)[\s,_-]*\d+$/i, "").trim();
    const key = baseName.toLowerCase();

    if (nameCounts[key] > 1) {
      serverCounters[key] = (serverCounters[key] || 0) + 1;
      const serverNum = serverCounters[key];
      const numberedName = `${baseName} Server ${serverNum}`;
      return {
        ...c,
        name: numberedName,
        server_num: serverNum,
        base_name: baseName
      };
    }

    return {
      ...c,
      name: cleanName,
      server_num: 1,
      base_name: baseName
    };
  });
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
 * Extracts quality tag like "HD", "FHD", "SD", "4K" from a channel title
 */
export function extractQuality(name: string): string | undefined {
  if (!name) return undefined;
  const m = name.match(/\b(4K|UHD|FHD|FULL\s*HD|HD|SD|HEVC|1080p|720p)\b/i);
  return m ? m[1].toUpperCase().replace(/\s+/g, "") : undefined;
}

/**
 * Groups multiple streams of the same channel (HD, SD, Server 1, Server 2, etc.)
 * into a single unified Channel object for website display.
 * The resulting channel object contains the complete list of available servers
 * so that users can view the server count and switch servers in the player.
 */
export function groupChannelsForWebsite(channels: Channel[]): Channel[] {
  if (!channels || channels.length === 0) return [];

  const groups = new Map<string, {
    primary: Channel;
    servers: import("./types").ChannelServer[];
    bestName: string;
    bestLogo: string;
  }>();

  for (const ch of channels) {
    const rawName = (ch.name || "Channel").toString().trim();
    const cleanName = cleanUnicodeText(rawName).trim();
    const withoutServer = cleanName.replace(/[\s,_-]+(?:server|sarvar)[\s,_-]*\d+$/i, "").trim();
    const quality = extractQuality(withoutServer) || extractQuality(cleanName);

    // Canonical grouping key without quality tags and punctuation (e.g. "tsports", "starsports1")
    const canonicalKey = withoutServer
      .replace(/\b(4K|UHD|FHD|FULL\s*HD|HD|SD|HEVC|1080p|720p)\b/gi, "")
      .replace(/[^\w]/g, "")
      .toLowerCase() || withoutServer.toLowerCase();

    // Check if channel already has a server number in name
    const serverNumMatch = rawName.match(/(?:server|sarvar)[\s,_-]*(\d+)/i);
    const explicitServerNum = serverNumMatch ? parseInt(serverNumMatch[1], 10) : undefined;

    // Existing or new group entry
    if (!groups.has(canonicalKey)) {
      groups.set(canonicalKey, {
        primary: { ...ch },
        servers: [],
        bestName: withoutServer,
        bestLogo: ch.logo || ""
      });
    }

    const entry = groups.get(canonicalKey)!;

    // If channel ALREADY has a servers array, adopt them!
    if (Array.isArray(ch.servers) && ch.servers.length > 0) {
      for (const s of ch.servers) {
        if (!entry.servers.some(existing => existing.url === s.url)) {
          entry.servers.push({ ...s });
        }
      }
    } else {
      // Single channel stream
      const serverNum = explicitServerNum || (entry.servers.length + 1);
      const label = quality ? `Server ${serverNum} (${quality})` : `Server ${serverNum}`;
      const newServer: import("./types").ChannelServer = {
        id: ch.id || (entry.servers.length + 1),
        server_num: serverNum,
        name: cleanName,
        label,
        quality,
        url: ch.url,
        stream_url: ch.stream_url || ch.url,
        raw_stream_url: ch.raw_stream_url || ch.url,
        logo: ch.logo,
        referer: ch.referer,
        user_agent: ch.user_agent,
        headers: ch.headers
      };
      if (!entry.servers.some(existing => existing.url === newServer.url)) {
        entry.servers.push(newServer);
      }
    }

    // Prefer a name that includes "HD" or is more descriptive
    if (!entry.bestName.includes("HD") && withoutServer.includes("HD")) {
      entry.bestName = withoutServer;
    }
    if (!entry.bestLogo && ch.logo) {
      entry.bestLogo = ch.logo;
    }
  }

  // Build final unified channels list
  const result: Channel[] = [];
  for (const entry of groups.values()) {
    // If no servers were added (fallback), create one
    if (entry.servers.length === 0) {
      entry.servers.push({
        id: entry.primary.id || 1,
        server_num: 1,
        name: entry.primary.name,
        label: "Server 1",
        url: entry.primary.url,
        stream_url: entry.primary.stream_url || entry.primary.url,
        raw_stream_url: entry.primary.raw_stream_url || entry.primary.url,
        logo: entry.primary.logo
      });
    }

    // Sort servers by server_num
    entry.servers.sort((a, b) => a.server_num - b.server_num);

    // Re-index server numbers cleanly 1..N and format labels
    entry.servers.forEach((s, idx) => {
      s.server_num = idx + 1;
      if (!s.label || s.label.startsWith("Server ")) {
        s.label = s.quality ? `Server ${idx + 1} (${s.quality})` : `Server ${idx + 1}`;
      }
    });

    const firstServer = entry.servers[0];
    result.push({
      ...entry.primary,
      name: entry.bestName,
      logo: entry.bestLogo || entry.primary.logo,
      url: firstServer.url,
      stream_url: firstServer.stream_url,
      raw_stream_url: firstServer.raw_stream_url,
      servers: entry.servers,
      active_server_index: 0,
      server_num: entry.servers.length, // total servers count
      base_name: entry.bestName
    });
  }

  return result;
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

      const commaIdx = currentExtInf.lastIndexOf(",");
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

  const numberedChannels = assignServerNumbers(channels);
  const groupedChannels = groupChannelsForWebsite(numberedChannels);

  return {
    status: "success",
    name: playlistName,
    playlist_name: playlistName,
    owner: "IreenTv",
    telegram: "https://t.me/ireentv",
    website: "https://ireentv.pages.dev",
    developer: "MD ANAMUL HOQUE",
    version: "2.0",
    channels_amount: groupedChannels.length,
    Last_update: lastUpdate,
    last_update: lastUpdate,
    channels: groupedChannels
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

  // 3. Match by base name + server number in query (e.g. T_Sports_HD_2, T_Sports_HD_Server_2, Star_Sports_1_Server_3)
  const serverMatch = cleanInput.match(/^(.*?)[_\s-]*(?:server|sarvar)?[_\s-]*(\d+)$/i);
  if (serverMatch) {
    const baseQSlug = slugifyChannelName(serverMatch[1]);
    const num = parseInt(serverMatch[2], 10);
    const byServer = channels.find((c: any) => {
      const baseMatch = (c.base_name && slugifyChannelName(c.base_name) === baseQSlug) ||
                        slugifyChannelName(c.name).startsWith(baseQSlug);
      return baseMatch && (c.server_num === num || slugifyChannelName(c.name).endsWith(`server${num}`) || slugifyChannelName(c.name).endsWith(`${num}`));
    });
    if (byServer) return byServer;
  }

  // 4. Default fallback: if base name requested without server number (e.g. T_Sports_HD), return server 1
  const baseMatch = channels.find((c: any) => (c.base_name && slugifyChannelName(c.base_name) === inputSlug));
  if (baseMatch) return baseMatch;

  // 5. Partial contains match if close enough
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
