// Cloudflare Pages Function: Dynamic M3U8 Redirector / Stream Resolver
// Handles: https://ireentv.pages.dev/T_Sports_HD.m3u8 or https://ireentv.pages.dev/{ChannelName}.m3u8

interface ChannelItem {
  id?: number | string;
  name: string;
  url?: string;
  stream_url?: string;
  raw_stream_url?: string;
  url_raw?: string;
  tvg_id?: string;
  logo?: string;
  group?: string;
  referer?: string;
  user_agent?: string;
}

function slugify(str: string): string {
  if (!str) return "";
  return str.trim().replace(/[^\w]/g, "").toLowerCase();
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

function getChannelStreamUrl(c: ChannelItem): string {
  if (c.raw_stream_url && typeof c.raw_stream_url === "string" && c.raw_stream_url.trim()) {
    return c.raw_stream_url.trim();
  }
  if (c.stream_url && typeof c.stream_url === "string" && c.stream_url.trim()) {
    return c.stream_url.split("|")[0].trim();
  }
  if (c.url && typeof c.url === "string" && c.url.trim()) {
    return c.url.split("|")[0].trim();
  }
  if (c.url_raw && typeof c.url_raw === "string" && c.url_raw.trim()) {
    return c.url_raw.split("|")[0].trim();
  }
  return "";
}

function findChannel(channels: ChannelItem[], query: string): ChannelItem | null {
  if (!channels || !query) return null;
  const clean = query.replace(/\.m3u8?$/i, "").trim();
  const qSlug = slugify(clean);

  // 1. Exact match
  const exact = channels.find(c => c.name && c.name.trim().toLowerCase() === clean.toLowerCase());
  if (exact) return exact;

  // 2. Slug match (handles LaLigaTV -> La Liga TV, T_Sports -> T Sports)
  const slugMatch = channels.find(c => slugify(c.name || "") === qSlug);
  if (slugMatch) return slugMatch;

  // 3. Match by tvg_id
  const tvgMatch = channels.find(c => c.tvg_id && slugify(c.tvg_id) === qSlug);
  if (tvgMatch) return tvgMatch;

  // 4. Partial match
  const partial = channels.find(c => {
    const s = slugify(c.name || "");
    return s.includes(qSlug) || qSlug.includes(s);
  });
  if (partial) return partial;

  return null;
}

export const onRequest = async (context: any): Promise<Response> => {
  const { request, params } = context;
  const rawChannelParam = (params.channel as string) || "";
  const channelQuery = decodeURIComponent(rawChannelParam);

  if (!channelQuery) {
    return new Response("Missing channel parameter", { status: 400 });
  }

  try {
    // Fetch latest channel list from GitHub M3U
    const githubSources = [
      "https://raw.githubusercontent.com/Romancecity/channel-filter/refs/heads/main/working_playlist.m3u",
      "https://raw.githubusercontent.com/Romancecity/channel-filter/main/working_playlist.m3u"
    ];

    let channels: ChannelItem[] = [];
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
              if (!line || line.startsWith("#EXTM3U")) continue;
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
                const groupTitle = getAttr("group-title") || "Sports";

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
      } catch (e) {
        // try next source
      }
    }

    if (channels.length === 0) {
      return new Response("Unable to load channel playlist from upstream.", { status: 502 });
    }

    // Deduplicate and number channels with same base names (e.g. T Sports 1, 2, 3...)
    channels = deduplicateAndNumberChannels(channels);

    const matchedChannel = findChannel(channels, channelQuery);
    const streamUrl = matchedChannel ? getChannelStreamUrl(matchedChannel) : "";

    if (!matchedChannel || !streamUrl) {
      return new Response(
        `Channel "${channelQuery}" not found in playlist. Available channels: ${channels.slice(0, 10).map(c => c.name).join(", ")}...`,
        {
          status: 404,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    // Check if client requested direct 302 redirect or stream manifest proxy
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "redirect";

    if (mode === "proxy") {
      const referer = matchedChannel.referer || `https://cdnlivetv.tv/api/v1/channels/player/?name=${encodeURIComponent(matchedChannel.name)}&code=us&user=cdnlivetv&plan=free`;
      const userAgent = matchedChannel.user_agent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";

      // Forward the stream using custom headers
      const streamRes = await fetch(streamUrl, {
        headers: {
          "Referer": referer,
          "Origin": referer,
          "User-Agent": userAgent,
          "x-forwarded-for": "109.236.88.82",
        }
      });

      return new Response(streamRes.body, {
        status: streamRes.status,
        headers: {
          "Content-Type": streamRes.headers.get("content-type") || "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        }
      });
    }

    // Default: 302 Found redirect directly to the live stream URL
    return new Response(null, {
      status: 302,
      headers: {
        "Location": streamUrl,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60"
      }
    });

  } catch (error: any) {
    return new Response(`Error resolving channel stream: ${error.message}`, {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
};

