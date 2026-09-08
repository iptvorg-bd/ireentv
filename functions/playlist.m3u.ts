// Cloudflare Pages Function: Dynamic M3U / M3U8 Playlist Generator
// Endpoint: /playlist.m3u (or .m3u8)

interface ChannelItem {
  id?: number | string;
  name: string;
  url?: string;
  stream_url?: string;
  raw_stream_url?: string;
  tvg_id?: string;
  logo?: string;
  group?: string;
}

function cleanSlug(name: string): string {
  if (!name) return "";
  return name.trim().replace(/\s+/g, "_").replace(/[^\w\-]/g, "").replace(/-+/g, "_").replace(/_+/g, "_");
}

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

function getBaseChannelName(rawName: string): string {
  if (!rawName) return "Channel";
  let s = cleanUnicodeText(rawName).trim();
  // Strip quality tags like HD, SD, FHD, UHD, 4K, 2K, 720p, 1080p, HEVC, HQ
  s = s.replace(/[\s\-_]*[\[\(]?(FHD|UHD|HD|SD|4K|2K|720p|1080p|HEVC|HQ)[\]\)]?[\s\-_]*/gi, " ").trim();
  s = s.replace(/\s+/g, " ");
  return s || rawName.trim();
}

function normalizeKey(str: string): string {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function deduplicateAndNumberChannels(list: ChannelItem[]): ChannelItem[] {
  const groups = new Map<string, { baseName: string; items: Array<{ ch: ChannelItem; index: number }> }>();

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

export const onRequest = async (context: any): Promise<Response> => {
  const { request } = context;
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const isDirectMode = url.searchParams.get("direct") === "true";

  try {
    const githubSources = [
      "https://raw.githubusercontent.com/Romancecity/channel-filter/refs/heads/main/working_playlist.m3u",
      "https://raw.githubusercontent.com/Romancecity/channel-filter/main/working_playlist.m3u"
    ];

    let channels: ChannelItem[] = [];
    let lastUpdate = "Just Now";

    for (const source of githubSources) {
      try {
        const res = await fetch(source, {
          cf: { cacheTtl: 300, cacheEverything: true }
        } as any);
        if (res.ok) {
          const text = await res.text();
          if (text && (text.includes("#EXTINF:") || text.includes("#EXTM3U"))) {
            const lines = text.split(/\r?\n/);
            let currentExtInf = "";

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
                const commaIdx = currentExtInf.indexOf(",");
                const metaPart = commaIdx !== -1 ? currentExtInf.substring(0, commaIdx) : currentExtInf;
                const channelTitle = commaIdx !== -1 ? currentExtInf.substring(commaIdx + 1).trim() : `Channel ${channels.length + 1}`;

                const getAttr = (attr: string): string => {
                  const m = metaPart.match(new RegExp(`${attr}="([^"]*)"`, "i"));
                  return m ? m[1] : "";
                };

                const tvgId = getAttr("tvg-id");
                const tvgName = getAttr("tvg-name") || channelTitle;
                const tvgLogo = getAttr("tvg-logo");
                let groupTitle = getAttr("group-title") || "General";

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

            if (channels.length > 0) break;
          }
        }
      } catch (e) {}
    }

    if (channels.length === 0) {
      return new Response("#EXTM3U\n# Error: Could not fetch channels from upstream\n", {
        status: 502,
        headers: { "Content-Type": "audio/x-mpegurl; charset=utf-8" }
      });
    }

    // Deduplicate and number channels with same base names (e.g. T Sports 1, 2, 3...)
    channels = deduplicateAndNumberChannels(channels);

    let m3u = `#EXTM3U x-tvg-url=""\n`;
    m3u += `# Playlist Name: IreenTV\n`;
    m3u += `# Telegram: https://t.me/ireentv\n`;
    m3u += `# Website: https://ireentv.pages.dev\n`;
    m3u += `# Owner: IreenTV\n`;
    m3u += `# Channels Amount: ${channels.length}\n`;
    m3u += `# Last Update: ${lastUpdate}\n\n`;

    for (const ch of channels) {
      const slug = cleanSlug(ch.name);
      const channelName = (ch.name || "").trim();
      const group = ch.group || "General";
      const tvgId = ch.tvg_id || slug;
      const directStreamUrl = ch.url || ch.stream_url || "";
      const channelStreamUrl = isDirectMode && directStreamUrl ? directStreamUrl : `${baseUrl}/${slug}.m3u8`;
      const logo = ch.logo || "";

      m3u += `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${channelName}" tvg-logo="${logo}" group-title="${group}",${channelName}\n`;
      m3u += `${channelStreamUrl}\n\n`;
    }

    return new Response(m3u, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
        "Content-Disposition": 'inline; filename="playlist.m3u"',
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300"
      }
    });

  } catch (error: any) {
    return new Response(`#EXTM3U\n# Error: ${error.message}\n`, {
      status: 500,
      headers: {
        "Content-Type": "audio/x-mpegurl; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
