import React, { useEffect, useState, useMemo } from "react";
import { 
  Search, Tv, Globe, Languages, X, ExternalLink, Info, 
  Sparkles, Heart, ListFilter, Send, Share2, Star, Check, AlertCircle, RefreshCw, ArrowLeft,
  Lock, KeyRound, ListVideo, Copy, Github, GitBranch, UploadCloud, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Channel, PlaylistData, Language } from "./types";
import { normalizeChannel, normalizePlaylistData, parseM3uToPlaylistData } from "./channelUtils";
import { translations } from "./translations";
import VideoPlayer from "./components/VideoPlayer";
import ChannelCard from "./components/ChannelCard";
import LockScreen from "./components/LockScreen";

export default function App() {
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [lang, setLang] = useState<Language>("en"); // English default as requested
  const [favorites, setFavorites] = useState<string[]>([]);
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const [showCreditsModal, setShowCreditsModal] = useState<boolean>(false);
  const [showM3uModal, setShowM3uModal] = useState<boolean>(false);
  const [copiedM3u, setCopiedM3u] = useState<string | null>(null);

  // GitHub & Playlist Sync States
  const [githubRepo, setGithubRepo] = useState<string>(() => {
    return localStorage.getItem("ireentv_github_repo") || "Romancecity/channel-filter";
  });
  const [githubToken, setGithubToken] = useState<string>(() => {
    return localStorage.getItem("ireentv_github_token") || "";
  });
  const [githubBranch, setGithubBranch] = useState<string>("main");
  const [isSyncingGithub, setIsSyncingGithub] = useState<boolean>(false);
  const [isRefreshingPlaylist, setIsRefreshingPlaylist] = useState<boolean>(false);
  const [githubSyncResult, setGithubSyncResult] = useState<{
    type: "success" | "error" | "warning";
    message: string;
    commitUrl?: string;
  } | null>(null);
  const [showGithubConfig, setShowGithubConfig] = useState<boolean>(false);

  // Synchronous check for embed mode directly on initialization (before any render)
  const [isEmbed, setIsEmbed] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        return params.get("embed") === "true";
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  });

  // Initial channel from URL params if present (allows instant playback in embed mode)
  const [activeChannel, setActiveChannel] = useState<Channel | null>(() => {
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const name = params.get("channel");
        const url = params.get("stream") || params.get("url") || params.get("stream_url") || params.get("raw_stream_url");
        const logo = params.get("logo") || "";
        const group = params.get("group") || "Sports";
        if (name && url) {
          return normalizeChannel({ name, url, logo, group });
        }
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  // Authentication State for direct website visits
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("ireentv_unlocked") === "true" ||
             localStorage.getItem("ireentv_unlocked") === "true";
    } catch {
      return false;
    }
  });

  const handleUnlock = () => {
    setIsUnlocked(true);
    try {
      sessionStorage.setItem("ireentv_unlocked", "true");
      localStorage.setItem("ireentv_unlocked", "true");
    } catch (e) {
      console.error("Failed to save unlock state", e);
    }
    // Instantly trigger playlist loading if not already loaded
    if (!playlist) {
      fetchPlaylist();
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    try {
      sessionStorage.removeItem("ireentv_unlocked");
      localStorage.removeItem("ireentv_unlocked");
    } catch (e) {
      console.error("Failed to remove unlock state", e);
    }
  };

  // Load translations
  const t = translations[lang];

  // Load cached playlist from localStorage for instant offline/speedy rendering
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem("ireentv_favorites");
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
      
      const savedLang = localStorage.getItem("ireentv_lang");
      if (savedLang === "en") {
        setLang("en");
      } else {
        setLang("en"); // Enforce English
      }

      const cachedRaw = localStorage.getItem("ireentv_cached_playlist_v2");
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        const normalized = normalizePlaylistData(parsed);
        if (normalized && normalized.channels && normalized.channels.length > 0) {
          setPlaylist(normalized);
        }
      }
    } catch (e) {
      console.error("Failed to load local storage preferences", e);
    }
  }, []);

  // Fetch playlist data from Express API with direct GitHub raw M3U fallbacks
  const fetchPlaylist = async () => {
    setLoading((prev) => (!playlist ? true : prev));
    setFetchError(null);
    try {
      let data: PlaylistData | null = null;
      
      // Tier 1: Local server cached API
      try {
        const res = await fetch("/api/playlist");
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (!contentType.includes("text/html") && !contentType.includes("application/xml") && !contentType.includes("text/xml")) {
            const json = await res.json();
            const normalized = normalizePlaylistData(json);
            if (normalized && normalized.channels && normalized.channels.length > 0) {
              data = normalized;
            }
          }
        }
      } catch (err: any) {
        console.warn("Express API failed, trying direct fallbacks:", err);
      }

      // Tier 2: Direct Raw GitHub endpoint for working_playlist.m3u
      if (!data) {
        try {
          const res = await fetch("https://raw.githubusercontent.com/Romancecity/channel-filter/refs/heads/main/working_playlist.m3u");
          if (res.ok) {
            const text = await res.text();
            if (text && (text.includes("#EXTINF:") || text.includes("#EXTM3U"))) {
              const parsed = parseM3uToPlaylistData(text);
              if (parsed && parsed.channels && parsed.channels.length > 0) {
                data = parsed;
              }
            }
          }
        } catch (err: any) {
          console.warn("Direct GitHub raw fetch failed:", err);
        }
      }

      // Tier 3: Direct Raw GitHub fallback branch
      if (!data) {
        try {
          const fallbackUrl = "https://raw.githubusercontent.com/Romancecity/channel-filter/main/working_playlist.m3u";
          const res = await fetch(fallbackUrl);
          if (res.ok) {
            const text = await res.text();
            if (text && (text.includes("#EXTINF:") || text.includes("#EXTM3U"))) {
              const parsed = parseM3uToPlaylistData(text);
              if (parsed && parsed.channels && parsed.channels.length > 0) {
                data = parsed;
              }
            }
          }
        } catch (err: any) {
          console.warn("Direct Raw GitHub fallback failed:", err);
        }
      }
      
      if (data && data.channels && data.channels.length > 0) {
        setPlaylist(data);
        try {
          localStorage.setItem("ireentv_cached_playlist_v2", JSON.stringify(data));
          localStorage.removeItem("ireentv_cached_playlist"); // remove stale previous playlist
        } catch (e) {
          console.warn("Could not save playlist to local storage", e);
        }
      } else if (!playlist) {
        throw new Error("No channels found in the playlist. Please retry.");
      }
    } catch (err: any) {
      console.error("Error loading playlist:", err);
      if (!playlist) {
        setFetchError(err.message || "Could not fetch playlist. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylist();
  }, []);

  // 1-Click Refresh Playlist from Remote Source & Server Cache
  const handleRefreshPlaylist = async () => {
    setIsRefreshingPlaylist(true);
    setGithubSyncResult(null);
    try {
      const res = await fetch("/api/refresh-playlist", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setGithubSyncResult({
          type: "success",
          message: `${lang === "bn" ? "প্লেলিস্ট সফলভাবে রিফ্রেশ হয়েছে! মোট চ্যানেল:" : "Playlist refreshed successfully! Total channels:"} ${data.channels_count}`
        });
        await fetchPlaylist();
      } else {
        setGithubSyncResult({
          type: "error",
          message: data.error || (lang === "bn" ? "প্লেলিস্ট রিফ্রেশ ব্যর্থ হয়েছে" : "Failed to refresh playlist")
        });
      }
    } catch (e: any) {
      setGithubSyncResult({
        type: "error",
        message: e.message || (lang === "bn" ? "সার্ভারের সাথে সংযোগ করা সম্ভব হয়নি" : "Network connection error")
      });
    } finally {
      setIsRefreshingPlaylist(false);
    }
  };

  // Direct Push / Update playlist.m3u to GitHub Repository
  const handleGithubSync = async () => {
    setIsSyncingGithub(true);
    setGithubSyncResult(null);

    // Save preferences
    localStorage.setItem("ireentv_github_repo", githubRepo);
    if (githubToken) {
      localStorage.setItem("ireentv_github_token", githubToken);
    }

    try {
      const res = await fetch("/api/sync-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken.trim(),
          repo: githubRepo.trim(),
          branch: githubBranch.trim(),
          filePath: "playlist.m3u"
        })
      });

      const data = await res.json();
      if (data.success) {
        setGithubSyncResult({
          type: "success",
          message: data.message || (lang === "bn" ? "সফলভাবে গিটহাবে playlist.m3u আপডেট হয়েছে!" : "Successfully updated playlist.m3u on GitHub!"),
          commitUrl: data.commitUrl
        });
        await fetchPlaylist();
      } else if (data.needToken) {
        setGithubSyncResult({
          type: "warning",
          message: data.message || (lang === "bn" ? "ওয়েবসাইটে প্লেলিস্ট রিফ্রেশ সম্পন্ন হয়েছে! তবে গিটহাবে পুশ করতে একটি GitHub Personal Access Token (PAT) প্রয়োজন।" : "Website playlist updated, but a GitHub Personal Access Token (PAT) is required to push to GitHub.")
        });
        setShowGithubConfig(true);
      } else {
        setGithubSyncResult({
          type: "error",
          message: data.error || (lang === "bn" ? "গিটহাব আপডেট এরর হয়েছে" : "GitHub update failed")
        });
      }
    } catch (e: any) {
      setGithubSyncResult({
        type: "error",
        message: e.message || (lang === "bn" ? "গিটহাব রিকোয়েস্টে এরর হয়েছে" : "GitHub request failed")
      });
    } finally {
      setIsSyncingGithub(false);
    }
  };

  // Handle Favorite Toggling
  const handleToggleFavorite = (channel: Channel) => {
    let nextFavs: string[];
    const isFav = favorites.includes(channel.name);
    if (isFav) {
      nextFavs = favorites.filter((name) => name !== channel.name);
    } else {
      nextFavs = [...favorites, channel.name];
    }
    setFavorites(nextFavs);
    localStorage.setItem("ireentv_favorites", JSON.stringify(nextFavs));
  };

  // Toggle Language
  const handleLanguageToggle = () => {
    const nextLang = lang === "bn" ? "en" : "bn";
    setLang(nextLang);
    localStorage.setItem("ireentv_lang", nextLang);
  };

  // Extract unique categories (groups) from playlist
  const categories = useMemo(() => {
    if (!playlist || !playlist.channels) return [];
    const groups = playlist.channels.map((c) => c.group || "Sports");
    // Return sorted unique categories
    return Array.from(new Set(groups)).sort();
  }, [playlist]);

  // Filter channels based on category and search query
  const filteredChannels = useMemo(() => {
    if (!playlist || !playlist.channels) return [];
    
    return playlist.channels.filter((c) => {
      // Category filter
      if (activeCategory === "favorites") {
        if (!favorites.includes(c.name)) return false;
      } else if (activeCategory !== "all") {
        if (c.group !== activeCategory) return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesGroup = (c.group || "").toLowerCase().includes(query);
        return matchesName || matchesGroup;
      }

      return true;
    });
  }, [playlist, activeCategory, searchQuery, favorites]);

  // Handle Share Click (copies the dedicated embed stream URL)
  const handleShare = () => {
    if (!activeChannel) return;
    const base = window.location.href.split("?")[0];
    const params = new URLSearchParams();
    params.set("channel", activeChannel.name);
    if (activeChannel.url) params.set("stream", activeChannel.url);
    if (activeChannel.logo) params.set("logo", activeChannel.logo);
    if (activeChannel.group) params.set("group", activeChannel.group);
    params.set("embed", "true");
    
    const shareUrl = `${base}?${params.toString()}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      })
      .catch((err) => console.error("Could not copy share link", err));
  };

  // Handle direct sharing checks via URL params
  useEffect(() => {
    if (playlist && playlist.channels && playlist.channels.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const targetChannelName = params.get("channel");
      if (targetChannelName) {
        const found = playlist.channels.find(
          (c) => c.name.toLowerCase() === targetChannelName.toLowerCase()
        );
        if (found) {
          setActiveChannel(found);
          if (!isEmbed) {
            document.getElementById("tv-player-card")?.scrollIntoView({ behavior: "smooth" });
          }
        }
      }
    }
  }, [playlist, isEmbed]);

  // If in embed/single-channel mode, render ONLY the dedicated video player without lock screen
  if (isEmbed) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-black text-neutral-100 flex flex-col items-center justify-center font-sans overflow-hidden select-none">
        {loading && !activeChannel && (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <div className="relative w-12 h-12 mb-4 animate-pulse">
              <div className="absolute inset-0 border-4 border-red-600/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-red-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-xs text-neutral-400 font-sans">
              {lang === "bn" ? "চ্যানেল লোড হচ্ছে..." : "Loading channel..."}
            </p>
          </div>
        )}

        {fetchError && !activeChannel && (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm">
            <AlertCircle className="w-10 h-10 text-red-500 mb-4 animate-bounce" />
            <p className="text-xs text-neutral-400 mb-4 font-mono">{fetchError}</p>
            <button
              onClick={fetchPlaylist}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-xs font-bold rounded-lg transition-all"
            >
              {lang === "bn" ? "আবার চেষ্টা করুন" : "Retry"}
            </button>
          </div>
        )}

        {activeChannel && (
          <div className="w-full h-full flex flex-col">
            <VideoPlayer 
              channel={activeChannel}
              lang={lang}
              t={t}
              isEmbed={true}
            />
          </div>
        )}

        {!loading && !fetchError && !activeChannel && (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-10 h-10 text-yellow-500 mb-4 animate-bounce" />
            <p className="text-sm text-neutral-400 font-sans">
              {lang === "bn" ? "চ্যানেলটি পাওয়া যায়নি" : "Channel not found"}
            </p>
          </div>
        )}
      </div>
    );
  }

  // If visiting directly and not unlocked yet, render Lock Screen
  if (!isUnlocked) {
    return (
      <LockScreen 
        onUnlock={handleUnlock}
        lang={lang}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100 flex flex-col font-sans select-none selection:bg-red-600 selection:text-white">
      
      {/* Background radial atmosphere for top-tier sports look */}
      <div className="fixed top-0 left-0 w-full h-[600px] bg-gradient-to-b from-red-950/15 via-neutral-950/0 to-transparent pointer-events-none -z-10" />

      {/* TOP HEADER */}
      <header className="border-b border-white/5 bg-[#050505]/75 backdrop-blur-md sticky top-0 z-40 px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-950 flex items-center justify-center shadow-lg shadow-red-600/30 ring-2 ring-red-500/20">
              <Tv className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight uppercase italic">
                  {t.title}
                </h1>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium tracking-wide">
                {t.subtitle}
              </p>
            </div>
          </div>

          {/* All Channels and Favorite Channels Navigation Buttons */}
          <div className="flex items-center gap-2 bg-neutral-900/60 p-1.5 rounded-xl border border-neutral-800">
            <button
              onClick={() => {
                setActiveCategory("all");
                setActiveChannel(null); // Go back to Home View with all channels
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 active:scale-95 ${
                activeCategory === "all" && activeChannel === null
                  ? "bg-red-600 text-white shadow-md shadow-red-600/10"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40"
              }`}
            >
              <Tv className="w-4 h-4 text-red-500" />
              <span>{lang === "bn" ? "সব চ্যানেল" : "All Channels"}</span>
            </button>
            <button
              onClick={() => {
                setActiveCategory("favorites");
                setActiveChannel(null); // Go back to Home View with favorites
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 active:scale-95 ${
                activeCategory === "favorites" && activeChannel === null
                  ? "bg-yellow-600 text-white shadow-md shadow-yellow-600/10"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40"
              }`}
            >
              <Heart className={`w-4 h-4 ${activeCategory === "favorites" && activeChannel === null ? "fill-white text-white" : "text-yellow-500 fill-yellow-500"}`} />
              <span>{lang === "bn" ? "প্রিয় চ্যানেলসমূহ" : "Favorite Channels"}</span>
            </button>
          </div>

          {/* Quick Playlist Metadata or Info Ticker + Lock Button */}
          <div className="flex items-center gap-3">
            {playlist && (
              <div className="hidden lg:flex items-center gap-6 bg-[#050505]/60 px-4 py-1.5 rounded-full border border-neutral-800/60 text-xs text-neutral-400 font-sans">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                  <span>{t.channelsCount}: <strong className="text-white font-mono">{playlist.channels_amount || playlist.channels.length}</strong></span>
                </div>
                <div className="h-3 w-px bg-neutral-800" />
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{t.lastUpdate}: <strong className="text-white font-mono">{playlist.Last_update || "Just Now"}</strong></span>
                </div>
              </div>
            )}

            {/* M3U Playlist URL & GitHub Sync Button */}
            <button
              onClick={() => setShowM3uModal(true)}
              title={lang === "bn" ? "M3U প্লেলিস্ট ও গিটহাব সিঙ্ক" : "M3U Playlist & GitHub Sync"}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-yellow-950/30 border border-neutral-800 hover:border-yellow-600/40 rounded-xl text-neutral-300 hover:text-yellow-400 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
            >
              <ListVideo className="w-3.5 h-3.5 text-yellow-500" />
              <span>{lang === "bn" ? "M3U ও সিঙ্ক" : "M3U & Sync"}</span>
            </button>

            {/* Quick Lock Button */}
            <button
              onClick={handleLock}
              title={lang === "bn" ? "সাইটটি লক করুন" : "Lock Site"}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-red-950/40 border border-neutral-800 hover:border-red-900/50 rounded-xl text-neutral-400 hover:text-red-400 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden sm:inline">{lang === "bn" ? "লক করুন" : "Lock"}</span>
            </button>
          </div>


        </div>
      </header>

      {/* Broadcast Sports Live News Ticker Strip */}
      <div className="h-10 bg-red-600 flex items-center px-4 sm:px-8 relative overflow-hidden shrink-0 select-none border-b border-red-700">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,rgba(0,0,0,0.1)_20px,rgba(0,0,0,0.1)_40px)] opacity-30"></div>
        <div className="relative z-10 flex w-full justify-between items-center text-[10px] sm:text-xs font-bold uppercase tracking-widest italic text-white font-mono gap-4">
          <div className="overflow-hidden whitespace-nowrap flex-1">
            <div className="animate-marquee-seamless">
              <span className="pr-12 shrink-0">🏏 TODAY LIVE BROADCAST SPORTING ACTIONS: CRICKET, FOOTBALL, RACING, GRAND SLAMS, OLYMPICS, T20 LEAGUES, CLUB HIGHLIGHTS AND HIGH SPEED CHANNELS LIVE FROM IREEN TV JSON PLAYLIST.</span>
              <span className="pr-12 shrink-0">🏏 TODAY LIVE BROADCAST SPORTING ACTIONS: CRICKET, FOOTBALL, RACING, GRAND SLAMS, OLYMPICS, T20 LEAGUES, CLUB HIGHLIGHTS AND HIGH SPEED CHANNELS LIVE FROM IREEN TV JSON PLAYLIST.</span>
            </div>
          </div>
          <span className="flex items-center gap-1.5 shrink-0 bg-black/40 px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-black tracking-wider shadow-sm">
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-400 animate-ping"></span>
            TICKER FEED LIVE
          </span>
        </div>
      </div>

      {/* CORE WRAPPER */}
      <main className="flex-1 w-full px-4 py-6 md:px-8 lg:px-12 xl:px-16 flex flex-col gap-6">
        
        {/* Playlists Loading State */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 border-4 border-red-600/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-red-600 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-lg font-bold text-white mb-1 font-sans">
              {lang === "bn" ? "লাইভ টিভি চ্যানেল তালিকা লোড হচ্ছে..." : "Loading Sports TV Playlist..."}
            </h3>
            <p className="text-sm text-neutral-500 font-sans">
              {lang === "bn" ? "দয়া করে কিছুক্ষণ অপেক্ষা করুন।" : "Please wait while we connect to the server."}
            </p>
          </div>
        )}

        {/* Playlists Loading Failure State */}
        {fetchError && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 font-sans">
              {lang === "bn" ? "প্লেলিস্ট লোড করা যায়নি" : "Failed to Load Playlist"}
            </h3>
            <p className="text-sm text-neutral-400 font-mono mb-6 leading-relaxed">
              {fetchError}
            </p>
            <button
              onClick={fetchPlaylist}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-red-600/20 active:scale-95 font-sans"
            >
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
              {lang === "bn" ? "আবার চেষ্টা করুন" : "Retry Connection"}
            </button>
          </div>
        )}

        {/* Main Interactive Live TV Dashboard */}
        {!loading && !fetchError && playlist && (
          <div className="w-full">
            {activeChannel === null ? (
              /* --- VIEW 1: HOME PAGE DIRECTORY VIEW (All channels on home page - Full Width) --- */
              <div className="w-full flex flex-col gap-6 animate-fade-in">
                

                {/* Search Bar & Header Wrapper */}
                <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-neutral-200 font-sans uppercase tracking-wider">
                      {lang === "bn" ? "লাইভ টিভি চ্যানেল তালিকা" : "LIVE TV CHANNELS"}
                    </span>
                    <span className="text-xs font-mono text-neutral-400 bg-[#050505] px-3 py-1 rounded-xl border border-neutral-800 shadow-sm">
                      {filteredChannels.length} {lang === "bn" ? "টি চ্যানেল পাওয়া গেছে" : "Channels Found"}
                    </span>
                  </div>

                  {/* Beautifully integrated Search Box */}
                  <div className="relative w-full sm:w-80 md:w-96">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchPlaceholder}
                      className="w-full bg-[#050505] border border-neutral-800 rounded-xl py-2.5 pl-10 pr-9 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-all font-sans"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Channels Listing Grid */}
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-5">
                    <AnimatePresence mode="popLayout">
                      {filteredChannels.length > 0 ? (
                        filteredChannels.map((chan) => (
                          <motion.div
                            key={chan.name}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.18 }}
                          >
                            <ChannelCard 
                              channel={chan}
                              isActive={false}
                              isFavorite={favorites.includes(chan.name)}
                              onSelect={() => {
                                setActiveChannel(chan);
                                // Scroll window smoothly to player start
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              onToggleFavorite={() => handleToggleFavorite(chan)}
                            />
                          </motion.div>
                        ))
                      ) : (
                        <div className="col-span-full py-20 text-center flex flex-col items-center justify-center text-neutral-500 border border-neutral-800/50 rounded-2xl bg-neutral-900/10">
                          <AlertCircle className="w-12 h-12 text-neutral-700 mb-3" />
                          <p className="text-base font-bold text-neutral-400 font-sans mb-1">{t.noChannels}</p>
                          <p className="text-xs text-neutral-600 max-w-xs font-sans px-4">
                            {lang === "bn" ? "দয়া করে অন্য কিছু অনুসন্ধান করুন।" : "Try searching with a different channel name."}
                          </p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

              </div>
            ) : (
              /* --- VIEW 2: DEDICATED PLAYER PAGE VIEW --- */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
                
                {/* LEFT COLUMN: ACTIVE VIDEO STREAM (Large Area) */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                  
                  {/* Top back actions row */}
                  <div className="flex items-center justify-between gap-4 bg-neutral-900/30 p-2.5 rounded-2xl border border-neutral-850">
                    <button
                      onClick={() => {
                        setActiveChannel(null);
                        // Clean URL query parameter when going back to directory home
                        window.history.pushState({}, "", window.location.pathname);
                      }}
                      className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 active:scale-95 shadow-lg"
                    >
                      <ArrowLeft className="w-4 h-4 text-red-500" />
                      <span>{lang === "bn" ? "⬅️ সব চ্যানেল তালিকা" : "⬅️ Back to All Channels"}</span>
                    </button>
                    
                    <span className="text-[10px] sm:text-xs font-black text-neutral-400 font-sans tracking-wide uppercase italic bg-red-950/25 px-3.5 py-1.5 rounded-xl border border-red-900/20 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                      {lang === "bn" ? "লাইভ প্লেয়ার পেজ" : "Live Player Screen"}
                    </span>
                  </div>

                  {/* Main TV Player component */}
                  <VideoPlayer 
                    channel={activeChannel}
                    lang={lang}
                    t={t}
                    onClose={() => {
                      setActiveChannel(null);
                      window.history.pushState({}, "", window.location.pathname);
                    }}
                  />
                </div>

                {/* RIGHT COLUMN: SWITCH CHANNELS SIDEBAR (Other Channels, Search & Channels list) */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  
                  {/* Selector Title */}
                  <div className="bg-neutral-900/30 p-2.5 rounded-2xl border border-neutral-850 flex items-center justify-between">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-sans italic">
                      <Tv className="w-4 h-4 text-red-500" />
                      <span>{lang === "bn" ? "অন্যান্য লাইভ চ্যানেল" : "Other Live Channels"}</span>
                    </h3>
                  </div>

                  {/* Directory Filter Box with Search Box */}
                  <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4">
                    
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t.searchPlaceholder}
                        className="w-full bg-[#050505] border border-neutral-800 rounded-xl py-2.5 pl-10 pr-9 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-all font-sans"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Channels Grid / List wrapper */}
                  <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-400 font-sans uppercase tracking-wider">
                        {activeCategory === "favorites" ? t.favorites : (activeCategory === "all" ? t.allCategories : activeCategory)}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                        {filteredChannels.length} Channels
                      </span>
                    </div>

                    {/* Grid container with scrolling for sidebar context */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-[440px] overflow-y-auto pr-1 custom-scrollbar">
                      <AnimatePresence mode="popLayout">
                        {filteredChannels.length > 0 ? (
                          filteredChannels.map((chan) => (
                            <motion.div
                              key={chan.name}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.18 }}
                            >
                              <ChannelCard 
                                channel={chan}
                                isActive={activeChannel?.name === chan.name}
                                isFavorite={favorites.includes(chan.name)}
                                onSelect={() => {
                                  setActiveChannel(chan);
                                  // Scroll window to top
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                onToggleFavorite={() => handleToggleFavorite(chan)}
                              />
                            </motion.div>
                          ))
                        ) : (
                          <div className="col-span-full py-12 text-center flex flex-col items-center justify-center text-neutral-500">
                            <AlertCircle className="w-10 h-10 text-neutral-600 mb-2" />
                            <p className="text-sm font-sans mb-1">{t.noChannels}</p>
                            {activeCategory === "favorites" && (
                              <p className="text-xs text-neutral-600 max-w-xs font-sans px-4">
                                {t.noFavorites}
                              </p>
                            )}
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-neutral-900 bg-[#050505] py-8 px-4 md:px-8 mt-12 text-center text-neutral-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <Tv className="w-3.5 h-3.5 text-red-500" />
            </div>
            <span className="font-extrabold text-neutral-300 font-sans tracking-wide uppercase italic">
              {t.title}
            </span>
          </div>
          
          <p className="max-w-md leading-relaxed font-sans text-neutral-500">
            {lang === "bn" 
              ? "একটি প্রিমিয়াম অটো-আপডেটেড লাইভ টিভি সার্ভিস। সকল লাইভ স্ট্রিমিং লিঙ্ক এবং চ্যানেলের মূল সোর্স স্বয়ংক্রিয়ভাবে গিটহাব প্লেলিস্ট সোর্স থেকে প্রাপ্ত।"
              : "A premium auto-updating sports TV streaming dashboard. All streaming assets and layouts are loaded and dynamically rendered from open IPTV sources."}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-neutral-400 mt-2 font-sans font-semibold text-xs">
            <span>Developer: <strong className="text-white">MD ANAMUL HOQUE</strong></span>
            <span className="hidden sm:inline text-neutral-700">|</span>
            <a 
              href="https://ireentv.pages.dev/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-red-500 hover:text-red-400 underline transition-colors"
            >
              https://ireentv.pages.dev/
            </a>
          </div>

          <p className="text-[10px] text-neutral-600 font-mono mt-4">
            &copy; 2026 IreenTV. Built with ❤️ using React, Tailwind & Express.
          </p>
        </div>
      </footer>

      {/* CREDITS AND PLAYLIST DETAILS MODAL */}
      <AnimatePresence>
        {showCreditsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full relative shadow-2xl"
            >
              <button
                onClick={() => setShowCreditsModal(false)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-white p-1 hover:bg-neutral-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2 font-sans">
                <Info className="w-5 h-5 text-red-500" />
                <span>প্লেলিস্ট তথ্য ও ক্রেডিট</span>
              </h3>

              <div className="flex flex-col gap-3 text-sm font-sans">
                <div className="p-3 bg-[#050505] border border-neutral-850 rounded-xl flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">প্লেলিস্টের নাম:</span>
                    <span className="text-white font-bold">{playlist?.name || "Live Sports"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">{t.owner}:</span>
                    <span className="text-red-500 font-black">{playlist?.owner || "IreenTv"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">{t.developer}:</span>
                    <span className="text-white font-bold">{playlist?.developer || "IreenTv"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">প্লেলিস্ট সংস্করণ:</span>
                    <span className="text-white font-mono">{playlist?.version || "1.0"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">{t.lastUpdate}:</span>
                    <span className="text-neutral-300 font-mono text-xs">{playlist?.Last_update || "N/A"}</span>
                  </div>
                </div>

                <div className="text-xs text-neutral-400 leading-relaxed py-2 font-sans border-b border-neutral-800">
                  {lang === "bn"
                    ? "এই অ্যাপ্লিকেশনটির প্লেলিস্ট ফাইলটি আইরিনটিভি অফিসিয়াল গিটহাব রিপোজিটরি থেকে লোড করা হচ্ছে। সকল প্রকার চ্যানেল স্ট্রিমিং লিংক এবং লোগো আইরিনটিভির মালিকানাধীন।"
                    : "The live playlist file is actively fetched from the official IreenTV GitHub Repository. All channel stream keys, headers, and media remain credit of their respective owners."}
                </div>

                {/* Social Links from JSON */}
                <div className="flex flex-col gap-2.5 mt-2">
                  {playlist?.telegram && (
                    <a
                      href={playlist.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
                    >
                      <Send className="w-4 h-4 fill-white" />
                      <span>অফিসিয়াল টেলিগ্রাম চ্যানেলে যুক্ত হোন</span>
                    </a>
                  )}

                  {playlist?.website && (
                    <a
                      href={playlist.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-4 bg-neutral-800 hover:bg-neutral-750 text-white font-bold rounded-xl border border-neutral-750 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>অফিসিয়াল ওয়েবসাইট ভিজিট করুন</span>
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Dynamic M3U Playlist & Direct Links Modal */}
        {showM3uModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
            onClick={() => setShowM3uModal(false)}
          >
            <div 
              className="w-full max-w-lg bg-neutral-900 border border-neutral-750 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-neutral-100 font-sans"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
                    <ListVideo className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      {lang === "bn" ? "M3U প্লেলিস্ট ও সরাসরি চ্যানেল লিংক" : "M3U Playlist & Direct Stream URLs"}
                    </h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      Cloudflare Pages & GitHub Sync
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowM3uModal(false)}
                  className="w-8 h-8 rounded-lg hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
                {/* Full M3U Playlist URL */}
                <div className="p-3.5 bg-[#050505] border border-neutral-800 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {lang === "bn" ? "সম্পূর্ণ M3U প্লেলিস্ট লিংক" : "Full M3U Playlist URL"}
                    </span>
                    <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-mono font-bold rounded">
                      IPTV / TIVIMATE
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value="https://ireentv.pages.dev/playlist.m3u"
                      className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-300 select-all outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("https://ireentv.pages.dev/playlist.m3u");
                        setCopiedM3u("playlist");
                        setTimeout(() => setCopiedM3u(null), 2500);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                        copiedM3u === "playlist"
                          ? "bg-green-600 text-white"
                          : "bg-yellow-600 hover:bg-yellow-500 text-white"
                      }`}
                    >
                      {copiedM3u === "playlist" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedM3u === "playlist" ? (lang === "bn" ? "কপি হয়েছে" : "Copied") : (lang === "bn" ? "কপি" : "Copy")}
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    {lang === "bn"
                      ? "এই লিংকটি আপনার যেকোনো IPTV প্লেয়ারে দিলে স্বয়ংক্রিয়ভাবে সব লাইভ চ্যানেল যুক্ত হয়ে যাবে।"
                      : "Add this URL to any IPTV player (TiviMate, OTT Navigator, VLC) to load all live channels."}
                  </p>
                </div>

                {/* Direct Channel Link Pattern */}
                <div className="p-3.5 bg-[#050505] border border-neutral-800 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {lang === "bn" ? "যেকোনো চ্যানেলের সরাসরি .m3u8 ফরম্যাট" : "Individual Channel .m3u8 Pattern"}
                    </span>
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-mono font-bold rounded">
                      DIRECT .m3u8
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value="https://ireentv.pages.dev/T_Sports_HD.m3u8"
                      className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-300 select-all outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("https://ireentv.pages.dev/T_Sports_HD.m3u8");
                        setCopiedM3u("channel");
                        setTimeout(() => setCopiedM3u(null), 2500);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                        copiedM3u === "channel"
                          ? "bg-green-600 text-white"
                          : "bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700"
                      }`}
                    >
                      {copiedM3u === "channel" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedM3u === "channel" ? (lang === "bn" ? "কপি হয়েছে" : "Copied") : (lang === "bn" ? "কপি" : "Copy")}
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    {lang === "bn"
                      ? "যেকোনো চ্যানেলের নামের সাথে .m3u8 যোগ করলেই (যেমন: /T_Sports_HD.m3u8, /BTV_National.m3u8) সরাসরি লাইভ স্ট্রিম চলবে।"
                      : "Access any live channel directly by appending .m3u8 to its name (e.g. /T_Sports_HD.m3u8)."}
                  </p>
                </div>

                {/* GitHub Playlist Sync & Update Section */}
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Github className="w-4 h-4 text-white" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {lang === "bn" ? "গিটহাব প্লেলিস্ট সিঙ্ক ও পুশ" : "GitHub Playlist Sync & Push"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGithubConfig(!showGithubConfig)}
                      className="text-[11px] text-yellow-500 hover:text-yellow-400 underline cursor-pointer"
                    >
                      {showGithubConfig 
                        ? (lang === "bn" ? "সেটিংস লুকান" : "Hide Config") 
                        : (lang === "bn" ? "টোকেন / কনফিগ পরিবর্তন" : "Token / Config")}
                    </button>
                  </div>

                  {/* Status Banner */}
                  {githubSyncResult && (
                    <div
                      className={`p-3 rounded-lg text-xs flex flex-col gap-1.5 border ${
                        githubSyncResult.type === "success"
                          ? "bg-green-500/10 border-green-500/30 text-green-300"
                          : githubSyncResult.type === "warning"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                          : "bg-red-500/10 border-red-500/30 text-red-300"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {githubSyncResult.type === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        )}
                        <span className="font-medium">{githubSyncResult.message}</span>
                      </div>
                      {githubSyncResult.commitUrl && (
                        <a
                          href={githubSyncResult.commitUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-green-400 underline ml-6 hover:text-green-300"
                        >
                          <span>{lang === "bn" ? "গিটহাব কমিট ও পরিবর্তন দেখুন" : "View Commit on GitHub"}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Config Inputs */}
                  {showGithubConfig && (
                    <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col gap-2.5 text-xs">
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1 font-mono">
                          {lang === "bn" ? "গিটহাব রিপোজিটরি (Owner/Repo):" : "GitHub Repository (Owner/Repo):"}
                        </label>
                        <input
                          type="text"
                          value={githubRepo}
                          onChange={(e) => setGithubRepo(e.target.value)}
                          placeholder="Romancecity/channel-filter"
                          className="w-full bg-black border border-neutral-800 rounded-md px-2.5 py-1.5 text-neutral-200 font-mono text-xs focus:border-yellow-500 outline-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[11px] text-neutral-400 mb-1 font-mono">
                            {lang === "bn" ? "GitHub Personal Access Token (PAT):" : "GitHub Personal Access Token (PAT):"}
                          </label>
                          <input
                            type="password"
                            value={githubToken}
                            onChange={(e) => setGithubToken(e.target.value)}
                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                            className="w-full bg-black border border-neutral-800 rounded-md px-2.5 py-1.5 text-neutral-200 font-mono text-xs focus:border-yellow-500 outline-none"
                          />
                        </div>
                        <div className="w-24">
                          <label className="block text-[11px] text-neutral-400 mb-1 font-mono">
                            {lang === "bn" ? "ব্রাঞ্চ:" : "Branch:"}
                          </label>
                          <input
                            type="text"
                            value={githubBranch}
                            onChange={(e) => setGithubBranch(e.target.value)}
                            placeholder="main"
                            className="w-full bg-black border border-neutral-800 rounded-md px-2.5 py-1.5 text-neutral-200 font-mono text-xs focus:border-yellow-500 outline-none"
                          />
                        </div>
                      </div>

                      <p className="text-[10.5px] text-neutral-400 leading-relaxed">
                        {lang === "bn"
                          ? "টোকেন তৈরি করতে GitHub > Settings > Developer settings > Personal access tokens (classic) এ গিয়ে 'repo' পারমিশন দিয়ে তৈরি করে এখানে পেস্ট করুন।"
                          : "Generate a token from GitHub > Settings > Developer settings > Personal access tokens (classic) with 'repo' scope."}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleRefreshPlaylist}
                      disabled={isRefreshingPlaylist || isSyncingGithub}
                      className="flex-1 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-200 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingPlaylist ? "animate-spin text-yellow-500" : ""}`} />
                      <span>
                        {isRefreshingPlaylist
                          ? (lang === "bn" ? "রিফ্রেশ হচ্ছে..." : "Refreshing...")
                          : (lang === "bn" ? "ওয়েবসাইট প্লেলিস্ট রিফ্রেশ" : "Refresh Local Playlist")}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGithubSync}
                      disabled={isSyncingGithub || isRefreshingPlaylist}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <UploadCloud className={`w-3.5 h-3.5 ${isSyncingGithub ? "animate-pulse" : ""}`} />
                      <span>
                        {isSyncingGithub
                          ? (lang === "bn" ? "গিটহাবে পুশ হচ্ছে..." : "Syncing to GitHub...")
                          : (lang === "bn" ? "গিটহাবে প্লেলিস্ট পুশ করুন" : "Push to GitHub")}
                      </span>
                    </button>
                  </div>

                  {/* GitHub Action CI/CD Note */}
                  <div className="p-2.5 bg-neutral-900/60 border border-neutral-850 rounded-lg text-[11px] text-neutral-400 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-neutral-300">
                        {lang === "bn" ? "GitHub Actions অটো-আপডেট এরর সমাধান:" : "GitHub Actions Auto-Update Error Fix:"}
                      </span>
                      <span>
                        {lang === "bn"
                          ? "আপনার রিপোজিটরির Settings ➔ Actions ➔ General ➔ 'Workflow permissions'-এ গিয়ে 'Read and write permissions' সিলেক্ট করে সেভ করুন। এতে কোনো টোকেন ছাড়াও প্রতি ১ ঘন্টায় গিটহাব নিজে থেকেই প্লেলিস্ট আপডেট করবে।"
                          : "Go to your GitHub repo Settings ➔ Actions ➔ General ➔ 'Workflow permissions' and select 'Read and write permissions'. This allows GitHub Actions to auto-push updates every hour."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
