import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Hardcoded headers requested by the user
const PROXY_HEADERS = {
  "Referer": "https://cdnlivetv.tv/api/v1/channels/player/?name=ABC&code=us&user=streamsports99&plan=vip",
  "Origin": "https://cdnlivetv.tv/api/v1/channels/player/?name=ABC&code=us&user=streamsports99&plan=vip",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
  "x-forwarded-for": "109.236.88.82",
};

// CORS Setup
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// In-memory cache for the playlist to avoid hitting rate limits and speed up client loading
let cachedPlaylist: any = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

function normalizeChannel(raw: any, index: number = 0): any {
  if (!raw) return { name: `Channel ${index + 1}`, url: "", group: "Sports" };

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

  const name = (raw.name || raw.title || raw.channel || `Channel ${index + 1}`).toString().trim();
  const logo = (raw.logo || raw.image || raw.icon || "").toString().trim();
  const group = (raw.group || raw.category || raw.group_title || "Sports").toString().trim();
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

function cleanUnicodeText(str: string): string {
  if (!str) return "";
  let res = "";
  for (const char of str) {
    const cp = char.codePointAt(0) || 0;
    if (cp >= 0x1D400 && cp <= 0x1D419) {
      res += String.fromCharCode(cp - 0x1D400 + 65);
    } else if (cp >= 0x1D41A && cp <= 0x1D433) {
      res += String.fromCharCode(cp - 0x1D41A + 97);
    } else if (cp >= 0x1D5D4 && cp <= 0x1D5ED) {
      res += String.fromCharCode(cp - 0x1D5D4 + 65);
    } else if (cp >= 0x1D5EE && cp <= 0x1D607) {
      res += String.fromCharCode(cp - 0x1D5EE + 97);
    } else {
      res += char;
    }
  }
  return res;
}

function getBaseChannelName(rawName: string): string {
  if (!rawName) return "Channel";
  let s = cleanUnicodeText(rawName).trim();
  // Strip quality tags like HD, SD, FHD, UHD, 4K, 2K, 720p, 1080p, HEVC, HQ
  // e.g. "T Sports HD", "T Sports (HD)", "TSports [SD]", "Sony Max - HD"
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
    const origName = (ch.name || ch.title || "").trim();
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

function normalizePlaylistData(raw: any): any {
  if (!raw) return { channels: [] };
  let rawChannels: any[] = [];
  if (Array.isArray(raw.channels)) {
    rawChannels = raw.channels;
  } else if (Array.isArray(raw)) {
    rawChannels = raw;
  }

  let channels = rawChannels.map((c, i) => normalizeChannel(c, i));
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

function parseM3uToPlaylistData(m3uContent: string): any {
  const lines = m3uContent.split(/\r?\n/);
  const channels: any[] = [];
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

      const channelObj = normalizeChannel({
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

async function fetchPlaylistFromRemote(): Promise<any> {
  const sources = [
    {
      url: "https://raw.githubusercontent.com/Romancecity/channel-filter/refs/heads/main/working_playlist.m3u",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      }
    },
    {
      url: "https://raw.githubusercontent.com/Romancecity/channel-filter/main/working_playlist.m3u",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      }
    },
    {
      url: "https://api.github.com/repos/Romancecity/channel-filter/contents/working_playlist.m3u",
      headers: {
        "User-Agent": "IreenTV-Live-Stream-App/1.0",
        "Accept": "application/vnd.github.v3.raw",
      }
    }
  ];

  let lastError = null;
  for (const source of sources) {
    try {
      const response = await fetch(source.url, { headers: source.headers });
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim()) {
          const trimmed = text.trim();
          if (trimmed.includes("#EXTINF:") || trimmed.includes("#EXTM3U")) {
            const parsed = parseM3uToPlaylistData(trimmed);
            if (parsed && parsed.channels && parsed.channels.length > 0) {
              return parsed;
            }
          } else if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            const data = JSON.parse(trimmed);
            if (data && (Array.isArray(data.channels) || Array.isArray(data))) {
              return normalizePlaylistData(data);
            }
          }
        }
      } else {
        lastError = new Error(`Source ${source.url} returned status ${response.status}`);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // Resilient fallback: Try reading local playlist.m3u if exists
  try {
    const localPath = path.join(process.cwd(), "playlist.m3u");
    if (fs.existsSync(localPath)) {
      const content = fs.readFileSync(localPath, "utf-8");
      if (content && content.includes("#EXTINF:")) {
        const parsed = parseM3uToPlaylistData(content);
        if (parsed && parsed.channels && parsed.channels.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {}

  throw lastError || new Error("Failed to fetch playlist from all sources");
}

function slugifyName(str: string): string {
  if (!str) return "";
  return str.trim().replace(/[^\w]/g, "").toLowerCase();
}

function cleanSlugName(name: string): string {
  if (!name) return "";
  return name.trim().replace(/\s+/g, "_").replace(/[^\w\-]/g, "").replace(/-+/g, "_").replace(/_+/g, "_");
}

function findMatchingChannelInList(channels: any[], query: string): any | null {
  if (!channels || !query) return null;
  const clean = query.replace(/\.m3u8?$/i, "").trim();
  
  // Exact match
  const exact = channels.find(c => c.name.trim().toLowerCase() === clean.toLowerCase());
  if (exact) return exact;

  // Slug match
  const qSlug = slugifyName(clean);
  const slugMatch = channels.find(c => slugifyName(c.name) === qSlug);
  if (slugMatch) return slugMatch;

  // Partial match
  const partial = channels.find(c => slugifyName(c.name).includes(qSlug) || qSlug.includes(slugifyName(c.name)));
  if (partial) return partial;

  return null;
}

function buildM3uString(channels: any[], data: any, baseUrl: string): string {
  const lastUpdate = data?.last_update || data?.Last_update || new Date().toUTCString();
  const channelsCount = channels.length;

  let m3u = `#EXTM3U x-tvg-url=""\n`;
  m3u += `# Playlist Name: IreenTV\n`;
  m3u += `# Telegram: ${data?.telegram || "https://t.me/ireentv"}\n`;
  m3u += `# Website: ${data?.website || "https://ireentv.pages.dev"}\n`;
  m3u += `# Developer: ${data?.developer || "MD ANAMUL HOQUE"}\n`;
  m3u += `# Version: ${data?.version || "2.0"}\n`;
  m3u += `# Channels Amount: ${channelsCount}\n`;
  m3u += `# Last Update: ${lastUpdate}\n\n`;

  for (const ch of channels) {
    const slug = cleanSlugName(ch.name);
    const channelName = ch.name.trim();
    const group = ch.group || "Sports";
    const channelStreamUrl = `${baseUrl}/${slug}.m3u8`;
    const logo = ch.logo || "";

    m3u += `#EXTINF:-1 tvg-id="${ch.tvg_id || slug}" tvg-name="${channelName}" tvg-logo="${logo}" group-title="${group}",${channelName}\n`;
    m3u += `${channelStreamUrl}\n\n`;
  }

  return m3u;
}

// Full M3U / M3U8 Playlist Generator Endpoint
app.get(["/playlist.m3u", "/playlist.m3u8"], async (req, res) => {
  try {
    const data = cachedPlaylist || await fetchPlaylistFromRemote();
    const channels = data?.channels || [];
    const host = req.get("host") || "ireentv.pages.dev";
    const protocol = req.protocol || "https";
    const baseUrl = `${protocol}://${host}`;

    const m3u = buildM3uString(channels, data, baseUrl);

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="ireentv_playlist.m3u"');
    res.send(m3u);
  } catch (error: any) {
    res.status(500).send(`#EXTM3U\n# Error: ${error.message}`);
  }
});

// Dynamic Channel M3U8 Handler (e.g. /LaLigaTV.m3u8 or /channel/LaLigaTV.m3u8)
app.get(["/:channelName.m3u8", "/channel/:channelName.m3u8"], async (req, res) => {
  const channelParam = req.params.channelName;
  if (!channelParam) {
    res.status(400).send("Missing channel name");
    return;
  }

  try {
    const data = cachedPlaylist || await fetchPlaylistFromRemote();
    const channels = data?.channels || [];
    const matched = findMatchingChannelInList(channels, channelParam);

    const streamUrl = matched ? (matched.url || matched.raw_stream_url || (matched.stream_url ? matched.stream_url.split("|")[0] : "")) : null;

    if (!matched || !streamUrl) {
      res.status(404).send(`Channel "${channelParam}" not found in playlist.`);
      return;
    }

    const mode = req.query.mode;
    if (mode === "proxy") {
      res.redirect(`/api/stream?url=${encodeURIComponent(streamUrl)}`);
      return;
    }

    // Direct 302 Found redirect to the live stream
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=60");
    res.redirect(302, streamUrl);
  } catch (error: any) {
    res.status(500).send(`Error resolving stream: ${error.message}`);
  }
});

// Refresh playlist endpoint to force remote re-fetch and re-generate local M3U files
app.post("/api/refresh-playlist", async (req, res) => {
  try {
    const data = await fetchPlaylistFromRemote();
    cachedPlaylist = data;
    lastCacheTime = Date.now();

    const baseUrl = "https://ireentv.pages.dev";
    const m3uContent = buildM3uString(data.channels || [], data, baseUrl);

    // Save locally to disk
    try {
      fs.writeFileSync(path.join(process.cwd(), "playlist.m3u"), m3uContent, "utf-8");
      const pubDir = path.join(process.cwd(), "public");
      if (fs.existsSync(pubDir)) {
        fs.writeFileSync(path.join(pubDir, "playlist.m3u"), m3uContent, "utf-8");
        fs.writeFileSync(path.join(pubDir, "playlist.m3u8"), m3uContent, "utf-8");
      }
    } catch (e: any) {
      console.warn("Could not write local playlist files:", e.message);
    }

    res.json({
      success: true,
      message: "প্লেলিস্ট সফলভাবে রিফ্রেশ ও আপডেট হয়েছে!",
      channels_count: data.channels?.length || 0,
      last_update: data.Last_update || data.last_update || "Just Now"
    });
  } catch (error: any) {
    console.error("Error refreshing playlist:", error.message);
    res.status(500).json({ success: false, error: "প্লেলিস্ট ফেচ করতে ব্যর্থ হয়েছে: " + error.message });
  }
});

// Sync playlist directly to GitHub repository
app.post("/api/sync-github", async (req, res) => {
  try {
    const token = (req.body?.token || process.env.GITHUB_TOKEN || "").trim();
    const repo = (req.body?.repo || process.env.GITHUB_REPO || "Romancecity/channel-filter").trim();
    const branch = (req.body?.branch || process.env.GITHUB_BRANCH || "main").trim();
    const filePath = (req.body?.filePath || "playlist.m3u").trim();

    // 1. Force remote fetch and update local playlist first
    const data = await fetchPlaylistFromRemote();
    cachedPlaylist = data;
    lastCacheTime = Date.now();

    const baseUrl = "https://ireentv.pages.dev";
    const m3uContent = buildM3uString(data.channels || [], data, baseUrl);

    // Save locally
    try {
      fs.writeFileSync(path.join(process.cwd(), "playlist.m3u"), m3uContent, "utf-8");
      const pubDir = path.join(process.cwd(), "public");
      if (fs.existsSync(pubDir)) {
        fs.writeFileSync(path.join(pubDir, "playlist.m3u"), m3uContent, "utf-8");
        fs.writeFileSync(path.join(pubDir, "playlist.m3u8"), m3uContent, "utf-8");
      }
    } catch (e: any) {
      console.warn("Could not write local playlist files:", e.message);
    }

    // 2. Check for token
    if (!token) {
      return res.status(200).json({
        success: false,
        needToken: true,
        channelCount: data.channels?.length || 0,
        message: "ওয়েবসাইটে প্লেলিস্ট রিফ্রেশ সফল হয়েছে! তবে গিটহাবে সরাসরি আপডেট করতে একটি GitHub Personal Access Token (PAT) প্রয়োজন।"
      });
    }

    // 3. Parse owner and repo
    const parts = repo.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return res.status(400).json({
        success: false,
        error: `ইনভ্যালিড রিপোজিটরি ফরম্যাট: "${repo}"। ফরম্যাট হতে হবে owner/repository (যেমন: Romancecity/channel-filter)`
      });
    }
    const [owner, repoName] = parts;

    const ghHeaders = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "IreenTV-Live-App",
      "Content-Type": "application/json"
    };

    // 4. Check if file already exists to get its SHA
    let existingSha: string | undefined;
    const checkRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}?ref=${encodeURIComponent(branch)}`,
      { headers: ghHeaders }
    );

    if (checkRes.ok) {
      const fileData: any = await checkRes.json();
      existingSha = fileData.sha;
    } else if (checkRes.status !== 404) {
      const errJson: any = await checkRes.json().catch(() => ({}));
      let msg = errJson.message || `GitHub error (Status ${checkRes.status})`;
      if (checkRes.status === 401) {
        msg = "GitHub Token টি সঠিক নয় বা মেয়াদ শেষ (401 Bad Credentials)। অনুগ্রহ করে একটি নতুন Personal Access Token দিন।";
      } else if (checkRes.status === 403) {
        msg = "GitHub Token-এ রিপোজিটরিতে লেখার অনুমতি নেই (403 Permission Denied)। Token Scope-এ 'repo' অথবা 'contents: write' পারমিশন দিন।";
      }
      return res.status(checkRes.status).json({ success: false, error: msg });
    }

    // 5. Commit/Push file to GitHub via Contents API
    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`,
      {
        method: "PUT",
        headers: ghHeaders,
        body: JSON.stringify({
          message: `Auto-update ${filePath} (${data.channels?.length || 0} channels) [via IreenTV Website]`,
          content: Buffer.from(m3uContent, "utf-8").toString("base64"),
          sha: existingSha,
          branch: branch
        })
      }
    );

    if (!putRes.ok) {
      const errJson: any = await putRes.json().catch(() => ({}));
      let msg = errJson.message || `GitHub PUT Error (Status ${putRes.status})`;
      if (putRes.status === 401) {
        msg = "GitHub Token টি ভুল (401 Bad credentials)।";
      } else if (putRes.status === 403) {
        msg = "গিটহাবে ফাইল পুশ করার পারমিশন নেই (403 Forbidden)। Token Scope এ 'repo' চেক করুন।";
      } else if (putRes.status === 404) {
        msg = `রিপোজিটরি "${repo}" অথবা ব্রাঞ্চ "${branch}" পাওয়া যায়নি (404 Not Found)।`;
      } else if (putRes.status === 409) {
        msg = "কনফ্লিক্ট হয়েছে (409 Conflict)। অনুগ্রহ করে কয়েক সেকেন্ড পর আবার চেষ্টা করুন।";
      }
      return res.status(putRes.status).json({ success: false, error: msg });
    }

    const putData: any = await putRes.json();

    return res.json({
      success: true,
      message: `সফলভাবে গিটহাবে (${repo}) ${filePath} আপডেট হয়েছে!`,
      commitUrl: putData.commit?.html_url,
      channelCount: data.channels?.length || 0,
      lastUpdate: data.Last_update || data.last_update
    });
  } catch (err: any) {
    console.error("Error in /api/sync-github:", err);
    return res.status(500).json({ success: false, error: "GitHub সিঙ্ক এরর: " + (err.message || "Internal server error") });
  }
});

// JSON API proxy to get the Live Sports playlist with caching
app.get("/api/playlist", async (req, res) => {
  const now = Date.now();
  const forceRefresh = req.query.refresh === "true";

  // Return cached version if still fresh
  if (!forceRefresh && cachedPlaylist && (now - lastCacheTime < CACHE_TTL_MS)) {
    return res.json(cachedPlaylist);
  }

  try {
    const data = await fetchPlaylistFromRemote();
    cachedPlaylist = data;
    lastCacheTime = Date.now();
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching playlist:", error.message);
    if (cachedPlaylist) {
      console.warn("Serving stale cached playlist due to fetch error");
      return res.json(cachedPlaylist);
    }
    res.status(500).json({ error: "Failed to load playlist", details: error.message });
  }
});

// HLS Stream proxy with URI rewriting to support playing restricted streams in browser
app.get("/api/stream", async (req, res) => {
  const targetUrl = req.query.url as string;

  if (!targetUrl) {
    res.status(400).send("Missing 'url' query parameter");
    return;
  }

  try {
    // Get headers from query params, falling back to defaults if not provided
    const referer = (req.query.referer as string) || PROXY_HEADERS["Referer"];
    const origin = (req.query.origin as string) || PROXY_HEADERS["Origin"];
    const userAgent = (req.query.userAgent as string) || PROXY_HEADERS["User-Agent"];
    const xff = (req.query.xff as string) || PROXY_HEADERS["x-forwarded-for"];

    const headers: Record<string, string> = {
      "User-Agent": userAgent,
      "Referer": referer,
      "Origin": origin,
      "x-forwarded-for": xff,
    };

    const response = await fetch(targetUrl, { headers });

    if (!response.ok) {
      res.status(response.status).send(`Failed to fetch remote stream asset. Status: ${response.status}`);
      return;
    }

    const contentType = response.headers.get("content-type") || "";
    
    // Check if it's an M3U8 playlist or manifest
    const isPlaylist = 
      contentType.includes("mpegurl") || 
      contentType.includes("mpegURL") || 
      targetUrl.includes(".m3u8") || 
      targetUrl.includes(".m3u");

    if (isPlaylist) {
      const text = await response.text();
      const parentUrl = targetUrl;
      const lines = text.split("\n");

      // Pass along the query parameters to subsequent segment files in the playlist
      const queryParams = new URLSearchParams();
      queryParams.set("referer", referer);
      queryParams.set("origin", origin);
      queryParams.set("userAgent", userAgent);
      queryParams.set("xff", xff);

      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        // Rewrite absolute/relative URLs (lines not starting with #)
        if (!trimmed.startsWith("#")) {
          try {
            const absoluteUrl = new URL(trimmed, parentUrl).href;
            queryParams.set("url", absoluteUrl);
            return `/api/stream?${queryParams.toString()}`;
          } catch (e) {
            return line;
          }
        }

        // Rewrite tags containing URI references (e.g., #EXT-X-KEY, #EXT-X-MEDIA, #EXT-X-STREAM-INF)
        if (trimmed.startsWith("#")) {
          let updatedLine = line;
          
          // Match URI="some_url"
          const uriRegex = /URI="([^"]+)"/g;
          updatedLine = updatedLine.replace(uriRegex, (match, p1) => {
            try {
              const absoluteUrl = new URL(p1, parentUrl).href;
              queryParams.set("url", absoluteUrl);
              return `URI="/api/stream?${queryParams.toString()}"`;
            } catch (e) {
              return match;
            }
          });

          return updatedLine;
        }

        return line;
      });

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.send(rewrittenLines.join("\n"));
    } else {
      // For TS video segments or other binary assets, pipe the stream back to the client
      res.setHeader("Content-Type", contentType || "video/MP2T");
      
      // Buffer & send body directly
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (error: any) {
    console.error(`Error in proxy for URL ${targetUrl}:`, error.message);
    res.status(500).send(`Proxy Error: ${error.message}`);
  }
});

// Configure Vite or Static Assets based on environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
