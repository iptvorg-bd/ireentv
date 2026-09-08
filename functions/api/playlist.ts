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

function deduplicateAndNumberChannels(list: any[]): any[] {
  const groups = new Map<string, { baseName: string; items: Array<{ ch: any; index: number }> }>();

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
              const processedChannels = deduplicateAndNumberChannels(channels);
              playlistData = {
                status: "success",
                name: "IreenTV",
                playlist_name: "IreenTV",
                owner: "IreenTV",
                website: "https://ireentv.pages.dev",
                telegram: "https://t.me/ireentv",
                channels_amount: processedChannels.length,
                last_update: lastUpdate,
                channels: processedChannels
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
