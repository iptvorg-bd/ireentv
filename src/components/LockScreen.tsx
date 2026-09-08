import React, { useState, useEffect } from "react";
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight, Tv, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface LockScreenProps {
  onUnlock: () => void;
  lang: "bn" | "en";
}

const CORRECT_PASSWORD = "BSSSireen$1";

export default function LockScreen({ onUnlock, lang }: LockScreenProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505] text-neutral-100 p-4 font-sans select-none overflow-y-auto">
      {/* Background ambient lighting effects */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[350px] h-[200px] bg-red-950/20 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Main Lock Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          x: shake ? [-8, 8, -6, 6, -3, 3, 0] : 0 
        }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Top subtle red accent line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent" />

        {/* Brand & Security Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-950 flex items-center justify-center shadow-xl shadow-red-600/30 ring-4 ring-red-500/20">
              <Tv className="w-8 h-8 text-white stroke-[2.2]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-neutral-900 border-2 border-red-600 flex items-center justify-center text-red-500 shadow-md">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">
              IREEN TV LIVE
            </h1>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/40 border border-red-800/30 text-red-400 text-xs font-semibold mt-1">
            <KeyRound className="w-3.5 h-3.5 text-red-400" />
            <span>{lang === "bn" ? "অ্যাক্সেস সুরক্ষিত" : "Protected Access"}</span>
          </div>

          <p className="text-xs text-neutral-400 mt-3 max-w-xs font-sans leading-relaxed">
            {lang === "bn" 
              ? "ওয়েবসাইটটিতে সরাসরি প্রবেশ করতে নির্ধারিত সিকিউরিটি পাসওয়ার্ড প্রদান করুন।" 
              : "Please enter the security password to unlock and access the full live TV directory."}
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
              <span>{lang === "bn" ? "পাসওয়ার্ড দিন" : "Enter Password"}</span>
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                placeholder={lang === "bn" ? "পাসওয়ার্ড লিখুন..." : "Enter password..."}
                autoFocus
                className={`w-full bg-[#050505] border text-sm text-white placeholder-neutral-500 rounded-xl py-3 pl-4 pr-11 focus:outline-none transition-all ${
                  error 
                    ? "border-red-500 ring-2 ring-red-500/30" 
                    : "border-neutral-800 focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors p-1"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 text-xs text-red-400 font-medium mt-1"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {lang === "bn" 
                    ? "ভুল পাসওয়ার্ড! দয়া করে সঠিক পাসওয়ার্ড দিন।" 
                    : "Incorrect password! Please enter the valid key."}
                </span>
              </motion.div>
            )}
          </div>

          {/* Unlock Submit Button */}
          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer text-sm font-sans"
          >
            <span>{lang === "bn" ? "আনলক করে প্রবেশ করুন" : "Unlock & Access Website"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer info note */}
        <div className="mt-6 pt-4 border-t border-neutral-800/80 text-center flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
            <span>{lang === "bn" ? "নিরাপদ লাইভ স্ট্রিমিং গেটওয়ে" : "Secure Live Streaming Gateway"}</span>
          </div>
          <p className="text-[10px] text-neutral-600 font-mono">
            &copy; 2026 IreenTV. All rights reserved.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
