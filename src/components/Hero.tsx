import { motion } from "motion/react";
import { Play, Info, Plus } from "lucide-react";

export default function Hero() {
  return (
    <section id="home" className="relative h-[95vh] w-full flex items-center justify-start overflow-hidden pt-16">
      {/* Cinematic Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070" 
          alt="Developer Backdrop" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#000] to-transparent" />
      </div>
      
      <div className="relative z-10 px-6 md:px-12 max-w-4xl space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <div className="bg-[#E50914] px-2 py-0.5 rounded-sm text-[10px] font-black tracking-widest uppercase">Special</div>
          <span className="text-zinc-400 text-sm font-bold tracking-widest uppercase">Featured Production</span>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
        >
          <h1 className="text-5xl md:text-8xl font-black font-display tracking-tight leading-[1] mb-4">
            MD ANAMUL<br />
            <span className="text-zinc-300">HOQUE</span>
          </h1>
          
          <div className="flex items-center gap-3 text-sm font-bold text-zinc-400 mb-6">
            <span className="text-emerald-500">98% Match</span>
            <span>2024</span>
            <span className="border border-zinc-600 px-2 py-0.5 rounded text-[10px]">18+</span>
            <span>Experienced</span>
          </div>
          
          <p className="text-lg text-zinc-300 max-w-xl leading-relaxed font-medium mb-8 drop-shadow-lg">
            A software mastermind based in Bangladesh, redefining digital media and technology interfaces. Join the journey through code, architecture, and innovation.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-4"
        >
          <a href="#projects" className="netflix-button-primary scale-100 active:scale-95 transition-transform">
            <Play className="fill-black w-5 h-5" />
            Watch Projects
          </a>
          <a href="https://ireentechnology.netlify.app" target="_blank" className="netflix-button-secondary scale-100 active:scale-95 transition-transform">
            <Info className="w-5 h-5" />
            More Info
          </a>
          <button className="w-10 h-10 rounded-full border-2 border-zinc-500/50 flex items-center justify-center text-white hover:border-white transition-colors">
            <Plus className="w-6 h-6" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
