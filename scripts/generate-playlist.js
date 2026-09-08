/**
 * Standalone Playlist Generator Script for GitHub Actions / Local Build
 * Generates playlist.m3u and public/playlist.m3u from working_playlist.m3u
 */

import fs from "fs";
import path from "path";

const BASE_URL = process.env.PLAYLIST_BASE_URL || "https://ireentv.pages.dev";

const sources = [
  "https://raw.githubusercontent.com/Romancecity/channel-filter/refs/heads/main/working_playlist.m3u",
  "https://raw.githubusercontent.com/Romancecity/channel-filter/main/working_playlist.m3u"
];

function cleanSlug(name) {
  if (!name) return "";
  return name.trim().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
}

function cleanUnicodeText(str) {
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

export function getBaseChannelName(rawName) {
  if (!rawName) return "Channel";
  let s = cleanUnicodeText(rawName).trim();
  // Strip quality tags like HD, SD, FHD, UHD, 4K, 2K, 720p, 1080p, HEVC, HQ
  // e.g. "T Sports HD", "T Sports (HD)", "TSports [SD]", "Sony Max - HD"
  s = s.replace(/[\s\-_]*[\[\(]?(FHD|UHD|HD|SD|4K|2K|720p|1080p|HEVC|HQ)[\]\)]?[\s\-_]*/gi, " ").trim();
  s = s.replace(/\s+/g, " ");
  return s || rawName.trim();
}

export function normalizeKey(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function deduplicateAndNumberChannels(list) {
  const groups = new Map();

  list.forEach((ch, index) => {
    const origName = (ch.name || ch.title || "").trim();
    const baseName = getBaseChannelName(origName);
    const key = normalizeKey(baseName) || normalizeKey(origName) || `ch_${index}`;

    if (!groups.has(key)) {
      groups.set(key, { baseName, items: [] });
    }
    groups.get(key).items.push({ ch, index });
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

async function run() {
  console.log("Fetching live channels playlist from working_playlist.m3u...");
  let channels = [];
  let playlistLastUpdate = "Just Now";

  for (const source of sources) {
    try {
      const res = await fetch(source);
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
              if (m) playlistLastUpdate = m[1].trim();
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

              const getAttr = (attr) => {
                const m = metaPart.match(new RegExp(`${attr}="([^"]*)"`, "i"));
                return m ? m[1] : "";
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
            console.log(`Successfully fetched ${channels.length} channels from ${source}`);
            break;
          }
        }
      }
    } catch (e) {
      console.warn(`Failed fetching from ${source}:`, e.message);
    }
  }

  if (channels.length === 0) {
    console.error("Error: Could not retrieve channels from any source.");
    process.exit(1);
  }

  // Deduplicate and number channels with duplicate base names (e.g. T Sports 1, 2, 3...)
  channels = deduplicateAndNumberChannels(channels);

  // Ensure directories exist
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const lastUpdate = playlistLastUpdate !== "Just Now" ? playlistLastUpdate : new Date().toUTCString();
  const channelsCount = channels.length;

  let m3u = `#EXTM3U x-tvg-url=""\n`;
  m3u += `# Playlist Name: IreenTV\n`;
  m3u += `# Telegram: https://t.me/ireentv\n`;
  m3u += `# Website: https://ireentv.pages.dev\n`;
  m3u += `# Developer: MD ANAMUL HOQUE\n`;
  m3u += `# Version: 2.0\n`;
  m3u += `# Channels Amount: ${channelsCount}\n`;
  m3u += `# Last Update: ${lastUpdate}\n\n`;

  for (const ch of channels) {
    const slug = cleanSlug(ch.name);
    const channelName = (ch.name || "").trim();
    const group = ch.group || "Sports";
    const tvgId = ch.tvg_id || slug;
    const channelStreamUrl = `${BASE_URL.replace(/\/$/, "")}/${slug}.m3u8`;
    const resolvedLogo = ch.logo || "";

    m3u += `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${channelName}" tvg-logo="${resolvedLogo}" group-title="${group}",${channelName}\n`;
    m3u += `${channelStreamUrl}\n\n`;
  }

  // Write files
  const rootM3uPath = path.join(process.cwd(), "playlist.m3u");
  const publicM3uPath = path.join(publicDir, "playlist.m3u");
  const publicM3u8Path = path.join(publicDir, "playlist.m3u8");

  fs.writeFileSync(rootM3uPath, m3u, "utf-8");
  fs.writeFileSync(publicM3uPath, m3u, "utf-8");
  fs.writeFileSync(publicM3u8Path, m3u, "utf-8");

  console.log(`✅ Generated playlist.m3u with ${channels.length} channels at:`);
  console.log(`   - ${rootM3uPath}`);
  console.log(`   - ${publicM3uPath}`);
  console.log(`   - ${publicM3u8Path}`);
}

run().catch((err) => {
  console.error("Fatal Error generating playlist:", err);
  process.exit(1);
});
