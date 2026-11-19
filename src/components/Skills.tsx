import { motion } from "motion/react";
import { Atom, Server, Wind, FileJson, Layers, Flame, Zap, FastForward } from "lucide-react";

const skills = [
  { name: "React", icon: <Atom className="w-7 h-7 text-[#61DAFB]" />, level: "Advanced", color: "from-[#61DAFB]/20" },
  { name: "Node.js", icon: <Server className="w-7 h-7 text-[#339933]" />, level: "Intermediate", color: "from-[#339933]/20" },
  { name: "Tailwind", icon: <Wind className="w-7 h-7 text-[#06B6D4]" />, level: "Advanced", color: "from-[#06B6D4]/20" },
  { name: "TypeScript", icon: <FileJson className="w-7 h-7 text-[#3178C6]" />, level: "Advanced", color: "from-[#3178C6]/20" },
  { name: "Next.js", icon: <Layers className="w-7 h-7 text-white" />, level: "Intermediate", color: "from-white/20" },
  { name: "Firebase", icon: <Flame className="w-7 h-7 text-[#FFCA28]" />, level: "Expert", color: "from-[#FFCA28]/20" },
  { name: "Express", icon: <Zap className="w-7 h-7 text-amber-400" />, level: "Intermediate", color: "from-amber-400/20" },
  { name: "Vite", icon: <FastForward className="w-7 h-7 text-[#646CFF]" />, level: "Advanced", color: "from-[#646CFF]/20" },
];

export default function Skills() {
  return (
    <section id="skills" className="py-20 px-6 md:px-12 bg-black border-t border-zinc-900">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E50914] animate-pulse"></span>
            <span className="text-[#E50914] font-black text-xs uppercase tracking-widest">
              Tech Stack • প্রযুক্তি দক্ষতা
            </span>
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-white border-l-4 border-[#E50914] pl-4 tracking-tight">
            Mastered Technologies & Frameworks
          </h2>
          <p className="text-zinc-300 text-sm md:text-base mt-2 max-w-2xl font-medium">
            Core toolset used to engineer scalable web architectures, fast APIs, and modern user experiences.
          </p>
        </div>
        
        {/* High visibility grid for both mobile and desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {skills.map((skill, index) => (
            <motion.div
              key={skill.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.04 }}
              className="group relative bg-[#181818] rounded-lg p-5 flex flex-col items-center justify-center gap-3 border border-zinc-700/80 hover:border-[#E50914] hover:bg-[#202020] transition-all duration-300 cursor-pointer overflow-hidden shadow-lg"
            >
              {/* Top Accent line on hover */}
              <div className="absolute top-0 left-0 w-full h-1 bg-[#E50914] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              
              {/* Icon Container with border and backdrop */}
              <div className="p-3 rounded-full bg-zinc-800/90 border border-zinc-700/80 group-hover:scale-110 transition-transform duration-300 shadow-md">
                {skill.icon}
              </div>
              
              <div className="text-center w-full">
                <h3 className="font-bold text-sm text-white mb-1.5">{skill.name}</h3>
                
                {/* Always visible badge on mobile, not hidden behind hover */}
                <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/50">
                  {skill.level}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
