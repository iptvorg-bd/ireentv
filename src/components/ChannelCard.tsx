import React from "react";
import { Star, Play, Tv } from "lucide-react";
import { motion } from "motion/react";
import { Channel } from "../types";

interface ChannelCardProps {
  channel: Channel;
  isActive: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

export default function ChannelCard({ channel, isActive, isFavorite, onSelect, onToggleFavorite }: ChannelCardProps) {
  const [imgError, setImgError] = React.useState<boolean>(false);
  const [logoSrc, setLogoSrc] = React.useState<string>(channel.logo || "");

  React.useEffect(() => {
    setLogoSrc(channel.logo || "");
    setImgError(false);
  }, [channel.logo]);

  const handleImageError = () => {
    setImgError(true);
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`relative group cursor-pointer border rounded-xl overflow-hidden p-3.5 flex flex-col justify-between gap-3 transition-all ${
        isActive 
          ? "bg-white/5 border-white/10 ring-1 ring-red-500 shadow-[0_0_15px_rgba(220,38,38,0.25)]" 
          : "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-neutral-700"
      }`}
    >
      {/* Absolute left red glow indicator bar for active channel */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-red-600 rounded-r-full shadow-[0_0_10px_#dc2626]" />
      )}

      {/* Background ambient lighting for active card */}
      {isActive && (
        <div className="absolute inset-0 bg-radial-gradient from-red-600/10 via-transparent to-transparent opacity-50 pointer-events-none" />
      )}

      {/* Top row: Logo and Star Favorite toggle */}
      <div className="flex items-start justify-between gap-2 z-10">
        <div className="w-14 h-14 bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 flex items-center justify-center overflow-hidden bg-white/5 relative shadow-inner">
          {logoSrc && !imgError ? (
            <img 
              src={logoSrc} 
              alt={channel.name}
              referrerPolicy="no-referrer"
              onError={handleImageError}
              className="w-full h-full object-contain filter group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-red-600 to-red-950 rounded flex items-center justify-center font-black text-neutral-100 text-xs font-sans tracking-tight italic">
              {channel.name.slice(0, 3).toUpperCase()}
            </div>
          )}
          
          {/* Small TV icon indicator */}
          <div className="absolute bottom-0 right-0 p-0.5 bg-neutral-950/70 rounded-tl-md">
            <Tv className="w-2.5 h-2.5 text-neutral-400" />
          </div>
        </div>

        {/* Favorite toggle star */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(e);
          }}
          className={`p-1.5 rounded-lg border transition-all duration-300 ${
            isFavorite 
              ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/20" 
              : "bg-neutral-950/50 border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-950"
          }`}
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Star className={`w-4 h-4 ${isFavorite ? "fill-yellow-500" : ""}`} />
        </button>
      </div>

      {/* Bottom row: Name, Category, and Play Button */}
      <div className="flex flex-col gap-1 z-10">
        <span className="text-[10px] font-mono text-neutral-500 truncate uppercase tracking-wider">
          {channel.group || "Sports"}
        </span>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-sm text-neutral-100 group-hover:text-white truncate font-sans">
            {channel.name}
          </h3>
          
          {/* Mini Play action visualizer */}
          <div className={`p-1 rounded-full transition-all duration-300 ${
            isActive 
              ? "bg-red-600 text-white" 
              : "bg-neutral-950 text-neutral-400 group-hover:bg-red-600 group-hover:text-white"
          }`}>
            <Play className="w-3.5 h-3.5 fill-current" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
