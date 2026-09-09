// Cloudflare Pages Function: API Playlist

function cleanUnicodeText(str: string): string {
  if (!str) return "";
  let res = "";
  for (const char of str) {
    const cp = char.codePointAt(0) || 0;
    if (cp >= 0x1D400 && cp <= 0x1D419) res += String.fromCharCode(cp - 0x1D400 + 65);
    else if (cp >= 0x1D41A && cp <= 0x1D433) res += String.fromCharCode(cp - 0x1D41A + 97);
    else if (cp >= 0x1D5D4 && cp <= 0x1D5ED) res += String.fromCharCode(cp - 0x1D5D4 + 65);
    else if (cp >= 0x1D5EE && cp <= 0x1D607) res += String.fromCharCode(cp - 0x1D5EE + 97);
    else res += char;
  }
  return res;
}

function assignServerNumbers(rawChannels: any[]): any[] {
  if (!rawChannels || rawChannels.length === 0) return [];

  const nameCounts: Record<string, number> = {};
  for (const c of rawChannels) {
    const rawName = (c.name || "Channel").toString().trim();
    const cleanName = cleanUnicodeText(rawName).trim();
    const baseName = cleanName.replace(/[\s,_-]+(?:server|sarvar)[\s,_-]*\d+$/i, "").trim();
    const key = baseName.toLowerCase();
    nameCounts[key] = (nameCounts[key] || 0) + 1;
  }

  const serverCounters: Record<string, number> = {};
  return rawChannels.map((c) => {
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

function extractQuality(name: string): string | undefined {
  if (!name) return undefined;
  const m = name.match(/\b(4K|UHD|FHD|FULL\s*HD|HD|SD|HEVC|1080p|720p)\b/i);
  return m ? m[1].toUpperCase().replace(/\s+/g, "") : undefined;
}

function groupChannelsForWebsite(channels: any[]): any[] {
  if (!channels || channels.length === 0) return [];

  const groups = new Map<string, {
    primary: any;
    servers: any[];
    bestName: string;
    bestLogo: string;
  }>();

  for (const ch of channels) {
    const rawName = (ch.name || "Channel").toString().trim();
    const cleanName = cleanUnicodeText(rawName).trim();
    const withoutServer = cleanName.replace(/[\s,_-]+(?:server|sarvar)[\s,_-]*\d+$/i, "").trim();
    const quality = extractQuality(withoutServer) || extractQuality(cleanName);

    const canonicalKey = withoutServer
      .replace(/\b(4K|UHD|FHD|FULL\s*HD|HD|SD|HEVC|1080p|720p)\b/gi, "")
      .replace(/[^\w]/g, "")
      .toLowerCase() || withoutServer.toLowerCase();

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
        if (!entry.servers.some((existing: any) => existing.url === s.url)) {
          entry.servers.push({ ...s });
        }
      }
    } else {
      // Single channel stream
      const serverNum = explicitServerNum || (entry.servers.length + 1);
      const label = quality ? `Server ${serverNum} (${quality})` : `Server ${serverNum}`;
      const newServer = {
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
      if (!entry.servers.some((existing: any) => existing.url === newServer.url)) {
        entry.servers.push(newServer);
      }
    }

    if (!entry.bestName.includes("HD") && withoutServer.includes("HD")) {
      entry.bestName = withoutServer;
    }
    if (!entry.bestLogo && ch.logo) {
      entry.bestLogo = ch.logo;
    }
  }

  const result: any[] = [];
  for (const entry of groups.values()) {
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

    entry.servers.sort((a: any, b: any) => a.server_num - b.server_num);

    entry.servers.forEach((s: any, idx: number) => {
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
      server_num: entry.servers.length,
      base_name: entry.bestName
    });
  }

  return result;
}

export const onRequest = async (context: any): Promise<Response> => {
  try {
    const githubSources = [
      "https://raw.githubusercontent.com/Romancecity/channel-filter/refs/heads/main/working_playlist.m3u",
      "https://raw.githubusercontent.com/Romancecity/channel-filter/main/working_playlist.m3u"
    ];

    let playlistData: any = null;
    for (const source of githubSources) {
      try {
        const res = await fetch(source, {
          cf: { cacheTtl: 300, cacheEverything: true }
        } as any);
        if (res.ok) {
          const text = await res.text();
          if (text && (text.includes("#EXTINF:") || text.includes("#EXTM3U"))) {
            const lines = text.split(/\r?\n/);
            const channels: any[] = [];
            let currentExtInf = "";
            let lastUpdate = "Just Now";

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              if (line.includes("Last Updated:")) {
                const m = line.match(/Last Updated:\s*([^\r\n#]+)/i);
                if (m) lastUpdate = m[1].trim();
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
                  const m = metaPart.match(new RegExp(`${attr}="([^"]*)"`, "i"));
                  return m ? m[1] : "";
                };

                const tvgId = getAttr("tvg-id");
                const tvgName = getAttr("tvg-name") || channelTitle;
                const tvgLogo = getAttr("tvg-logo");
                let groupTitle = getAttr("group-title") || "Sports";

                channels.push({
                  id: channels.length + 1,
                  name: tvgName,
                  logo: tvgLogo,
                  url: streamUrl,
                  stream_url: streamUrl,
                  raw_stream_url: streamUrl,
                  group: groupTitle,
                  tvg_id: tvgId
                });
                currentExtInf = "";
              }
            }

            if (channels.length > 0) {
              const numberedChannels = assignServerNumbers(channels);
              const groupedChannels = groupChannelsForWebsite(numberedChannels);
              playlistData = {
                status: "success",
                name: "IreenTV",
                playlist_name: "IreenTV",
                owner: "IreenTV",
                website: "https://ireentv.pages.dev",
                telegram: "https://t.me/ireentv",
                channels_amount: groupedChannels.length,
                last_update: lastUpdate,
                channels: groupedChannels
              };
              break;
            }
          }
        }
      } catch (e) {}
    }

    if (!playlistData) {
      return new Response(JSON.stringify({ error: "Could not fetch playlist from upstream" }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response(JSON.stringify(playlistData), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
};
