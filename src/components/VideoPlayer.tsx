import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { 
  Play, Pause, Volume2, VolumeX, Maximize, RotateCw, 
  Settings, Activity, AlertTriangle, Monitor, Sliders, Check, HelpCircle,
  Share2, Link, Copy, X, Tv, Code, ListVideo, ExternalLink, Server, Radio, Layers
} from "lucide-react";
import { Channel, Language, Translations } from "../types";

interface VideoPlayerProps {
  channel: Channel;
  lang: Language;
  t: Translations;
  isEmbed?: boolean;
  onClose?: () => void;
  onServerChange?: (serverIndex: number) => void;
}

export default function VideoPlayer({ channel, lang, t, isEmbed = false, onClose, onServerChange }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true); // Start muted to allow autoplays
  const [volume, setVolume] = useState<number>(0.8);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isTheater, setIsTheater] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

  // Multi-server state
  const [activeServerIndex, setActiveServerIndex] = useState<number>(channel?.active_server_index || 0);

  // Reset active server index when channel changes
  useEffect(() => {
    setActiveServerIndex(channel?.active_server_index || 0);
  }, [channel?.name]);
  
  // Auto-hide controls helper
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      setShowAspectMenu(false);
    }, 3500);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  // Toggle controls on player tap / click without toggling play/pause
  const handlePlayerTap = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Do not toggle controls if clicking directly on buttons or inputs
    if (target.closest("button") || target.closest("input") || target.closest("a") || target.closest("[role='button']")) {
      return;
    }

    if (showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(false);
      setShowAspectMenu(false);
    } else {
      resetControlsTimeout();
    }
  };

  const handleMouseLeave = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(false);
    setShowAspectMenu(false);
  };



  // Stats
  const [stats, setStats] = useState({
    bufferLength: 0,
    resolution: "Unknown",
    latency: 0,
    fps: 0
  });
  const [showStats, setShowStats] = useState<boolean>(false);
  
  // Video Loading & Errors
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // Custom Aspect Ratios: "video-standard" (16:9), "video-4-3" (4:3), "video-fill" (stretch/cover), "video-original"
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "4:3" | "fill" | "original">("16:9");
  const [showAspectMenu, setShowAspectMenu] = useState<boolean>(false);

  // Share Modal States
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const getCleanSlug = (name: string) => {
    if (!name) return "";
    return name.trim().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
  };

  const getDirectM3u8Url = () => {
    if (!channel) return "";
    const origin = window.location.origin.includes("pages.dev") 
      ? window.location.origin 
      : "https://ireentv.pages.dev";
    return `${origin}/${getCleanSlug(channel.name)}.m3u8`;
  };

  const getEmbedShareUrl = () => {
    if (!channel) return "";
    const base = window.location.href.split("?")[0];
    const params = new URLSearchParams();
    params.set("channel", channel.name);
    if (channel.url) params.set("stream", channel.url);
    if (channel.logo) params.set("logo", channel.logo);
    if (channel.group) params.set("group", channel.group);
    params.set("embed", "true");
    return `${base}?${params.toString()}`;
  };

  const getFullPlaylistUrl = () => {
    const origin = window.location.origin.includes("pages.dev") 
      ? window.location.origin 
      : "https://ireentv.pages.dev";
    return `${origin}/playlist.m3u`;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedType(type);
        setTimeout(() => {
          setCopiedType(null);
        }, 2500);
      })
      .catch((err) => console.error("Could not copy link", err));
  };


  // Get current server info
  const servers = channel?.servers && channel.servers.length > 0 ? channel.servers : [];
  const currentServer = (servers && servers.length > 0 && servers[activeServerIndex]) 
    ? servers[activeServerIndex] 
    : (servers.length > 0 ? servers[0] : null);

  // Construct URL
  const getStreamUrl = () => {
    if (currentServer) {
      if (currentServer.raw_stream_url && currentServer.raw_stream_url.trim()) {
        return currentServer.raw_stream_url.trim();
      }
      if (currentServer.stream_url && currentServer.stream_url.trim()) {
        return currentServer.stream_url.split("|")[0].trim();
      }
      if (currentServer.url && currentServer.url.trim()) {
        return currentServer.url.split("|")[0].trim();
      }
    }
    if (!channel) return "";
    if (channel.raw_stream_url && channel.raw_stream_url.trim()) {
      return channel.raw_stream_url.trim();
    }
    if (channel.stream_url && channel.stream_url.trim()) {
      return channel.stream_url.split("|")[0].trim();
    }
    if (channel.url && channel.url.trim()) {
      return channel.url.split("|")[0].trim();
    }
    return "";
  };

  const streamUrl = getStreamUrl();

  const handleSwitchServer = (index: number) => {
    if (index === activeServerIndex) return;
    setActiveServerIndex(index);
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");
    if (onServerChange) {
      onServerChange(index);
    }
  };

  // Initialize and tear down HLS.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    // Reset player state
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");
    
    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Playback handling
    if (Hls.isSupported()) {
      const hlsConfig = {
        enableWorker: true,
        lowLatencyMode: true, // Enable low latency mode to start playback immediately
        capLevelToPlayerSize: true, // Cap quality level to container size to save bandwidth on mobile
        maxBufferLength: 8, // Keep initial buffering requirement small (8s) so streams start instantly
        maxMaxBufferLength: 15, // Keep maximum buffer reasonably small to save data and prevent lags
        backBufferLength: 10, // Maintain a small back buffer
        abrBandwidthFactor: 0.6, // Be conservative to avoid sudden quality upgrades and subsequent stalls
        abrBandwidthUpFactor: 0.4, // Upgrade quality slowly to ensure connection is genuinely stable
        abrEwmaDefaultEstimate: 150000, // Assume a low-speed connection (150kbps) initially to force loading the lowest quality first
      };
      
      const hls = new Hls(hlsConfig);
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.log("Auto-play was blocked or failed, waiting for user click", err);
            setIsPlaying(false);
          });
      });

      // Handle HLS errors
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS Error:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("Fatal network error, trying to recover...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("Fatal media error, trying to recover...");
              hls.recoverMediaError();
              break;
            default:
              setIsLoading(false);
              setHasError(true);
              setErrorMessage(`${data.type}: ${data.details || "Fatal playback error"}`);
              break;
          }
        }
      });

      // Stats monitoring
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (hls.media) {
          const buffered = hls.media.buffered;
          let bufferLength = 0;
          if (buffered.length > 0) {
            const currentTime = hls.media.currentTime;
            for (let i = 0; i < buffered.length; i++) {
              if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
                bufferLength = buffered.end(i) - currentTime;
                break;
              }
            }
          }

          // Fetch active quality details
          let resolution = "Auto";
          if (hls.levels && hls.currentLevel >= 0) {
            const level = hls.levels[hls.currentLevel];
            if (level && level.width && level.height) {
              resolution = `${level.width}x${level.height}`;
            }
          }

          setStats((prev) => ({
            ...prev,
            bufferLength: parseFloat(bufferLength.toFixed(1)),
            resolution
          }));
        }
      });

    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Fallback for Safari (Native HLS)
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      });

      video.addEventListener("error", (e) => {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage("Native video element reported a loading error");
      });
    } else {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage("Your browser does not support HLS streaming.");
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, activeServerIndex]);

  // Video controller interactions
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    const nextMute = !isMuted;
    video.muted = nextMute;
    setIsMuted(nextMute);
    if (!nextMute && volume === 0) {
      handleVolumeChange(0.5);
    }
  };

  const handleVolumeChange = (val: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = val;
    setVolume(val);
    if (val > 0) {
      video.muted = false;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const handleFullscreenToggle = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
        // Automatically attempt to lock to landscape mode on mobile/touch screens
        const orientation = screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation;
        if (orientation && typeof (orientation as any).lock === "function") {
          (orientation as any).lock("landscape").catch((err: any) => {
            console.log("Screen orientation lock was rejected or not supported:", err);
          });
        }
      }).catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      const orientation = screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation;
      if (orientation && typeof (orientation as any).unlock === "function") {
        try {
          (orientation as any).unlock();
        } catch (err) {
          console.log("Screen orientation unlock failed:", err);
        }
      }
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Sync fullscreen state in case user exits with Esc
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = document.fullscreenElement === containerRef.current;
      setIsFullscreen(isCurrentlyFullscreen);
      const orientation = screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation;
      if (!isCurrentlyFullscreen && orientation && typeof (orientation as any).unlock === "function") {
        try {
          (orientation as any).unlock();
        } catch (err) {
          console.log("Screen orientation unlock failed:", err);
        }
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleReload = () => {
    const currentSrc = streamUrl;
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");
    if (hlsRef.current) {
      hlsRef.current.loadSource(currentSrc);
      hlsRef.current.startLoad();
    } else if (videoRef.current) {
      videoRef.current.src = currentSrc;
      videoRef.current.load();
    }
  };

  // Get Aspect Ratio class
  const getAspectClass = () => {
    switch (aspectRatio) {
      case "16:9": return "aspect-video object-contain";
      case "4:3": return "aspect-[4/3] object-contain";
      case "fill": return "w-full h-full object-fill";
      case "original": return "w-auto h-auto max-w-full max-h-full object-contain";
    }
  };

  return (
    <div 
      id="tv-player-card" 
      className={isEmbed 
        ? "w-full h-full border-0 rounded-none overflow-hidden relative flex flex-col flex-1 bg-black" 
        : "bg-[#050505] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative transition-all duration-300"
      }
    >
      
      {/* Dynamic Player Wrapper */}
      <div 
        ref={containerRef} 
        onMouseMove={handleMouseMove}
        onClick={handlePlayerTap}
        onMouseLeave={handleMouseLeave}
        className={`relative w-full overflow-hidden bg-black flex items-center justify-center transition-all ${
          isEmbed ? "h-full flex-1" : (isTheater ? "h-[70vh]" : "aspect-video")
        } ${showControls ? "cursor-default" : "cursor-none"}`}
      >
        {/* Actual Video Tag - tapping does NOT pause video */}
        <video
          ref={videoRef}
          className={`w-full max-h-full ${getAspectClass()}`}
          playsInline
          muted={isMuted}
        />

        {/* Top Header Bar Overlay: Badges + Channel Title + Top-Right Close Button */}
        <div className={`absolute top-0 inset-x-0 p-3 sm:p-4 z-20 flex items-center justify-between gap-2 transition-all duration-300 pointer-events-none ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
        }`}>
          {/* Channel details & Playback Badge */}
          <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto min-w-0">
            {channel?.logo ? (
              <img 
                src={channel.logo} 
                alt={channel.name} 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-lg bg-black/60 border border-white/10 p-0.5 backdrop-blur-md shrink-0"
              />
            ) : null}

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-white truncate drop-shadow-md font-sans">
                  {channel?.name || "Live TV"}
                </h2>
                <span className="px-1.5 py-0.5 bg-red-600/90 text-[9px] font-mono rounded font-bold uppercase tracking-wider text-white shrink-0">
                  LIVE
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 pointer-events-auto shrink-0">
            {/* Direct Playback badge for desktop */}
            <span className="hidden sm:flex px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase font-sans items-center gap-1.5 backdrop-blur-md shadow-md bg-neutral-900/90 text-neutral-200 border border-neutral-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
              {lang === "bn" ? "ডাইরেক্ট প্লেব্যাক" : "DIRECT PLAYBACK"}
            </span>

            {/* Close Player Cross Button */}
            {onClose && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                title={lang === "bn" ? "প্লেয়ার বন্ধ করুন" : "Close Player"}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-900/90 hover:bg-red-600 border border-white/20 hover:border-red-500 text-neutral-300 hover:text-white flex items-center justify-center transition-all duration-200 shadow-xl backdrop-blur-md active:scale-90 cursor-pointer"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Ambient background glow if logo is present */}
        {channel?.logo && (
          <div 
            className="absolute inset-0 pointer-events-none opacity-10 blur-3xl scale-110 -z-10 transition-all duration-700"
            style={{ backgroundImage: `url(${channel.logo})`, backgroundPosition: 'center', backgroundSize: 'cover' }}
          />
        )}

        {/* Loading Spinner Overlays */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#050505]/90 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-red-600/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-red-600 rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-sm font-bold text-neutral-300 animate-pulse tracking-wide font-sans">
              {lang === "bn" ? "চ্যানেল লোড হচ্ছে..." : "Loading Live Channel..."}
            </p>
          </div>
        )}

        {/* Error / Offline Stream Overlay */}
        {hasError && (
          <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10 animate-fade-in">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-3 animate-bounce" />
            <h3 className="text-xl font-bold text-white mb-1 font-sans">
              {lang === "bn" ? "স্ট্রিম চালু করতে সমস্যা হয়েছে" : "Failed to load Live Stream"}
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mb-4 font-mono">
              {errorMessage || (lang === "bn" ? "অনাকাঙ্ক্ষিত নেটওয়ার্ক বিভ্রাট।" : "An unexpected stream source error occurred.")}
            </p>
            
            {/* Quick alternative servers fallback buttons on error screen */}
            {servers.length > 1 && (
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 max-w-md w-full mb-4 flex flex-col items-center gap-2.5">
                <span className="text-xs font-bold text-amber-400 font-sans flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" />
                  {lang === "bn" ? "অন্য সার্ভারে চেষ্টা করুন:" : "Try an alternative server:"}
                </span>
                <div className="flex flex-wrap gap-2 justify-center">
                  {servers.map((s, idx) => (
                    <button
                      key={s.server_num || idx}
                      onClick={() => handleSwitchServer(idx)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer font-sans ${
                        activeServerIndex === idx
                          ? "bg-red-600/30 text-red-300 border border-red-500/40 cursor-not-allowed opacity-50"
                          : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons to help troubleshoot stream */}
            <div className="flex flex-wrap gap-3 justify-center">
              <button 
                onClick={handleReload}
                className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 text-xs font-sans border border-neutral-700"
              >
                <RotateCw className="w-4 h-4" />
                {t.reloadStream}
              </button>
            </div>
          </div>
        )}

        {/* Controls Overlay Bar - Bottom Gradient */}
        <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-4 transition-all duration-300 z-10 flex flex-col gap-2 ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}>
          
          {/* Progress bar (simulated live dot tracker) */}
          <div className="w-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-red-500 font-bold">
              {t.liveBadge}
            </span>
            <div className="h-0.5 flex-1 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full w-full bg-red-500"></div>
            </div>
          </div>

          {/* Core Player Controls Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-4">
              {/* Play/Pause */}
              <button 
                onClick={handlePlayPause}
                title={isPlaying ? t.pause : t.play}
                className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg text-white transition-all active:scale-90"
              >
                {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-white" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />}
              </button>

              {/* Volume Group */}
              <div className="flex items-center gap-1 sm:gap-2 group/volume">
                <button 
                  onClick={handleMuteToggle}
                  title={isMuted ? t.unmute : t.mute}
                  className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg text-white transition-all active:scale-90"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="hidden sm:inline-block w-14 sm:w-16 md:w-24 h-1 accent-red-600 bg-neutral-700 rounded-lg cursor-pointer transition-all duration-300"
                />
              </div>

            </div>

            <div className="flex items-center gap-0.5 sm:gap-2">
              {/* Stats Panel Toggle */}
              <button 
                onClick={() => setShowStats(!showStats)}
                title={t.stats}
                className={`p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-all ${showStats ? "text-red-500 bg-neutral-800" : "text-white"}`}
              >
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Aspect Ratio Menu Toggle */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowAspectMenu(!showAspectMenu);
                  }}
                  title={t.aspectRatio}
                  className={`p-1.5 sm:p-2 hover:bg-white/10 rounded-lg text-white transition-all ${showAspectMenu ? "text-red-500 bg-neutral-800" : ""}`}
                >
                  <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                {showAspectMenu && (
                  <div className="absolute bottom-12 right-0 bg-[#050505] border border-neutral-800 rounded-lg shadow-xl p-1.5 min-w-[130px] z-20 flex flex-col gap-1 text-xs">
                    {(["16:9", "4:3", "fill", "original"] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => {
                          setAspectRatio(ratio);
                          setShowAspectMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between hover:bg-neutral-800 ${aspectRatio === ratio ? "text-red-500 font-bold" : "text-neutral-300"}`}
                      >
                        <span>{ratio.toUpperCase()}</span>
                        {aspectRatio === ratio && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Channel Share Button */}
              <button 
                onClick={() => {
                  setShowShareModal(true);
                  if (controlsTimeoutRef.current) {
                    clearTimeout(controlsTimeoutRef.current);
                  }
                }}
                title={lang === "bn" ? "চ্যানেল লিংক ও M3U8 শেয়ার করুন" : "Share Channel & M3U8 Link"}
                className="p-1.5 sm:p-2 rounded-lg text-white hover:bg-white/10 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-200" />
                <span className="text-[10px] sm:text-xs font-sans font-bold hidden md:inline text-neutral-200">
                  {lang === "bn" ? "শেয়ার" : "Share"}
                </span>
              </button>

              {/* Reload Stream Button */}
              <button 
                onClick={handleReload}
                title={t.reloadStream}
                className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg text-white transition-all active:scale-90"
              >
                <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Fullscreen Toggle */}
              <button 
                onClick={handleFullscreenToggle}
                className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg text-white transition-all active:scale-90"
              >
                <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Statistics & Performance Info Panel Overlay */}
      {showStats && (
        <div className="bg-[#050505] border-t border-neutral-850 px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <div>
            <div className="text-[10px] uppercase font-mono text-neutral-500 tracking-wider mb-1">
              {t.resolution}
            </div>
            <div className="font-mono text-sm text-red-500 font-bold">
              {stats.resolution}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-neutral-500 tracking-wider mb-1">
              {t.buffer}
            </div>
            <div className="font-mono text-sm text-red-500 font-bold">
              {stats.bufferLength}s
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-neutral-500 tracking-wider mb-1">
              Playback Technology
            </div>
            <div className="font-mono text-sm text-neutral-300">
              Hls.js Engine
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-neutral-500 tracking-wider mb-1">
              Active Connection Mode
            </div>
            <div className="font-mono text-sm text-neutral-300">
              Direct IP Access
            </div>
          </div>
        </div>
      )}

      {/* Under-Player Metadata & Live Playlist Stream Controls Info */}
      {!isEmbed && (
        <div className="bg-[#050505] px-5 py-4 sm:px-6 sm:py-5 border-t border-neutral-800 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              {channel?.logo ? (
                <img 
                  src={channel.logo} 
                  alt={channel.name} 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // If logo fails to load, replace with dummy text initials
                    e.currentTarget.style.display = "none";
                  }}
                  className="w-14 h-14 object-contain rounded-xl bg-[#050505] border border-neutral-800 p-1 bg-white/5"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-600 to-red-950 flex items-center justify-center font-bold text-white text-xl font-sans italic">
                  {channel?.name?.slice(0, 2).toUpperCase()}
                </div>
              )}
              
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-red-600/10 text-red-500 text-[10px] font-mono rounded-full font-bold uppercase tracking-wider">
                    {channel?.group || "Sports"}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-red-500 font-semibold animate-pulse font-sans">
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span>
                    {t.liveBadge}
                  </span>
                  {servers.length > 1 && (
                    <span className="px-2 py-0.5 bg-red-950/70 border border-red-800/50 text-red-300 text-[10px] font-mono rounded-full flex items-center gap-1">
                      <Radio className="w-2.5 h-2.5 text-red-400 animate-pulse" />
                      <span>{servers.length} {lang === "bn" ? "টি সার্ভার" : "Servers"}</span>
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-white font-sans tracking-tight">
                  {channel?.name}
                </h2>
              </div>
            </div>

            {/* Current Active Server indicator pill */}
            {currentServer && servers.length > 1 && (
              <div className="flex items-center gap-2 bg-neutral-900/80 border border-neutral-800 px-3.5 py-2 rounded-xl text-xs font-mono text-neutral-300 self-start md:self-auto shadow-inner">
                <span className="text-neutral-500 font-sans text-[11px]">{lang === "bn" ? "চলমান সার্ভার:" : "Playing:"}</span>
                <span className="text-red-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {currentServer.label || `Server ${activeServerIndex + 1}`}
                </span>
              </div>
            )}
          </div>

          {/* DEDICATED LIVE STREAM SERVER SWITCHER */}
          {servers.length > 1 && (
            <div className="mt-1 pt-4 border-t border-neutral-850 flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-red-500" />
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-sans">
                    {lang === "bn" ? "লাইভ সার্ভারসমূহ (সার্ভার পরিবর্তন করতে ক্লিক করুন):" : "Available Live Servers:"}
                  </span>
                </div>
                <span className="text-[11px] font-sans text-neutral-400 bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 rounded-full">
                  {lang === "bn" ? `মোট ${servers.length}টি সার্ভার সংযুক্ত` : `${servers.length} Servers Online`}
                </span>
              </div>

              {/* Server Switching Buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {servers.map((srv, idx) => {
                  const isCurrent = activeServerIndex === idx;
                  return (
                    <button
                      key={srv.server_num || idx}
                      onClick={() => handleSwitchServer(idx)}
                      className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95 cursor-pointer font-sans shadow-md ${
                        isCurrent
                          ? "bg-red-600 text-white shadow-red-600/30 ring-2 ring-red-500 border border-red-400"
                          : "bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full flex items-center justify-center ${
                        isCurrent ? "bg-white animate-pulse" : "bg-neutral-600"
                      }`} />
                      <span className="tracking-wide">{srv.label}</span>
                      {srv.quality && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                          isCurrent ? "bg-red-950 text-red-200 border border-red-800/60" : "bg-neutral-950 text-neutral-400 border border-neutral-800"
                        }`}>
                          {srv.quality}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-white/20 text-white font-extrabold uppercase">
                          {lang === "bn" ? "চালু" : "Active"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Informative Guidance */}
              <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 font-sans pt-1">
                <span className="text-red-500 font-bold">💡</span>
                <span>
                  {lang === "bn" 
                    ? "যদি বর্তমান সার্ভারটিতে বাফারিং বা লোডিং সমস্যা দেখা দেয়, তবে ওপরের অন্য যেকোনো সার্ভার বোতামে ক্লিক করে সাথে সাথে খেলা উপভোগ করুন।" 
                    : "If you experience buffering or lag on the current server, click another server button above to switch streams instantly."}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Share Modal Dialog Overlay */}
      {showShareModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setShowShareModal(false)}
        >
          <div 
            className="w-full max-w-lg bg-neutral-900 border border-neutral-750 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-neutral-100 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {lang === "bn" ? "চ্যানেল ও স্ট্রিম লিংক শেয়ার" : "Share Channel & Stream"}
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    {channel.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Option 1: Direct .m3u8 Stream Link */}
              <div className="p-3.5 bg-[#050505] border border-neutral-800 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {lang === "bn" ? "সরাসরি M3U8 লিংক (VLC / IPTV)" : "Direct M3U8 Stream URL"}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-mono font-bold rounded">
                    .m3u8
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getDirectM3u8Url()}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-300 select-all outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(getDirectM3u8Url(), "m3u8")}
                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                      copiedType === "m3u8"
                        ? "bg-green-600 text-white"
                        : "bg-red-600 hover:bg-red-500 text-white"
                    }`}
                  >
                    {copiedType === "m3u8" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedType === "m3u8" ? (lang === "bn" ? "কপি হয়েছে" : "Copied") : (lang === "bn" ? "কপি" : "Copy")}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-400">
                  {lang === "bn"
                    ? "এই লিংকটি সরাসরি VLC Player, OTT Navigator, TiviMate অথবা যেকোনো IPTV প্লেয়ারে চলবে।"
                    : "Use this link in VLC Player, OTT Navigator, TiviMate, or any IPTV app."}
                </p>
              </div>

              {/* Option 2: Web Embed Player Link */}
              <div className="p-3.5 bg-[#050505] border border-neutral-800 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-neutral-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {lang === "bn" ? "ওয়েব প্লেয়ার এম্বেড লিংক" : "Web Player Embed Link"}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 text-[10px] font-mono rounded">
                    WEB EMBED
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getEmbedShareUrl()}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-300 select-all outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(getEmbedShareUrl(), "embed")}
                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                      copiedType === "embed"
                        ? "bg-green-600 text-white"
                        : "bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700"
                    }`}
                  >
                    {copiedType === "embed" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedType === "embed" ? (lang === "bn" ? "কপি হয়েছে" : "Copied") : (lang === "bn" ? "কপি" : "Copy")}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-400">
                  {lang === "bn"
                    ? "অন্য ব্রাউজারে ওপেন করলে সরাসরি শুধু এই চ্যানেলটির প্লেয়ার চালু হবে (কোনো লক স্ক্রিন ছাড়াই)।"
                    : "Opens only this standalone channel player in any browser without full website or lock screen."}
                </p>
              </div>

              {/* Option 3: HTML iFrame Code */}
              <div className="p-3.5 bg-[#050505] border border-neutral-800 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-neutral-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      HTML iFrame Embed
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`<iframe src="${getEmbedShareUrl()}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-300 select-all outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(`<iframe src="${getEmbedShareUrl()}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`, "iframe")}
                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                      copiedType === "iframe"
                        ? "bg-green-600 text-white"
                        : "bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700"
                    }`}
                  >
                    {copiedType === "iframe" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedType === "iframe" ? (lang === "bn" ? "কপি হয়েছে" : "Copied") : (lang === "bn" ? "কপি" : "Copy")}
                  </button>
                </div>
              </div>

              {/* Option 4: Full M3U Playlist */}
              <div className="p-3.5 bg-[#050505] border border-neutral-800 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListVideo className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {lang === "bn" ? "সম্পূর্ণ M3U প্লেলিস্ট লিংক" : "Full M3U Playlist URL"}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-mono font-bold rounded">
                    ALL CHANNELS
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getFullPlaylistUrl()}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-300 select-all outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(getFullPlaylistUrl(), "playlist")}
                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                      copiedType === "playlist"
                        ? "bg-green-600 text-white"
                        : "bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700"
                    }`}
                  >
                    {copiedType === "playlist" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedType === "playlist" ? (lang === "bn" ? "কপি হয়েছে" : "Copied") : (lang === "bn" ? "কপি" : "Copy")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
