import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Info, ExternalLink, X, Eye } from "lucide-react";

export interface Project {
  id: number;
  title: string;
  description: string;
  url: string;
  image: string;
  tags: string[];
}

export const projects: Project[] = [
  {
    id: 1,
    title: "Ireen Live TV",
    description: "Digital media portal providing live television streaming and news updates from Bangladesh in HD.",
    url: "https://ireentvhd.pages.dev/",
    image: "https://images.unsplash.com/photo-1593784991095-a205039470b6?auto=format&fit=crop&q=80&w=1200",
    tags: ["LIVE STREAMING", "HD MEDIA", "CLOUDFLARE PAGES", "WEB PORTAL"],
  },
  {
    id: 2,
    title: "Cine Stream IT",
    description: "Modern cinematic experience platform for streaming and exploring digital media content.",
    url: "https://cinestreamit.netlify.app",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1200",
    tags: ["REACT", "NETLIFY", "UI DESIGN", "DIGITAL MEDIA"],
  },
  {
    id: 3,
    title: "Ireen Technology",
    description: "Business portal for software and website development services with portfolio showcase.",
    url: "https://ireentechnology.netlify.app",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200",
    tags: ["BUSINESS", "PORTFOLIO", "WEB DEVELOPMENT", "SUCCESS"],
  }
];

export default function Projects() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  return (
    <section id="projects" className="py-20 px-6 md:px-12 bg-black border-t border-zinc-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E50914] animate-pulse"></span>
              <span className="text-[#E50914] font-black text-xs uppercase tracking-widest">
                Portfolio Showcase • প্রজেক্টসমূহ
              </span>
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white border-l-4 border-[#E50914] pl-4 tracking-tight">
              Latest Production Releases
            </h2>
            <p className="text-zinc-300 text-sm md:text-base mt-2 max-w-2xl font-medium">
              Explore live platforms, media networks, and client web applications engineered by our team.
            </p>
          </div>
        </div>
        
        {/* Project Cards Grid - High contrast, vivid, mobile optimized */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <motion.div 
              key={project.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="bg-[#181818] border border-zinc-700/80 rounded-lg overflow-hidden flex flex-col group hover:border-[#E50914]/80 hover:bg-[#202020] transition-all duration-300 shadow-xl"
            >
              {/* Preview Image Area - Crystal clear on mobile, no blackouts */}
              <div className="aspect-video relative bg-zinc-900 overflow-hidden border-b border-zinc-800">
                {/* High-res crisp image background */}
                <img 
                  src={project.image} 
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Subtle dark gradient for badge readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />

                {/* Live Status Badge */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live System</span>
                </div>

                {/* Quick Preview Action Button */}
                <div className="absolute top-3 right-3 z-20">
                  <button 
                    onClick={() => setSelectedProject(project)}
                    className="bg-black/80 hover:bg-[#E50914] text-white p-2 rounded-full backdrop-blur-md border border-zinc-700 hover:border-transparent transition-all shadow-md flex items-center justify-center"
                    title="Quick Details"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>

                {/* Overlay Preview Button for Mobile & Desktop */}
                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-[2px]">
                  <button 
                    onClick={() => setSelectedProject(project)}
                    className="bg-[#E50914] hover:bg-[#b00710] text-white px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-transform transform scale-95 group-hover:scale-100"
                  >
                    <Eye className="w-4 h-4" />
                    Preview Details
                  </button>
                </div>

                {/* Bottom title banner on image */}
                <div className="absolute bottom-2 left-3 right-3 z-10">
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300 bg-black/70 px-2 py-0.5 rounded border border-zinc-700">
                    Netflix Edition
                  </span>
                </div>
              </div>

              {/* Content Area - Clear, high contrast text on mobile */}
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white group-hover:text-[#E50914] transition-colors">
                    {project.title}
                  </h3>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    98% Match
                  </span>
                </div>

                <p className="text-zinc-300 text-sm leading-relaxed mb-5 line-clamp-2">
                  {project.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {project.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="text-[10px] font-bold text-zinc-200 bg-zinc-800 px-2.5 py-1 rounded border border-zinc-700 tracking-wider uppercase"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                {/* Actions Row */}
                <div className="mt-auto pt-4 border-t border-zinc-700/60 flex items-center gap-3">
                  <a 
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#E50914] hover:bg-[#b00710] text-white text-xs font-extrabold uppercase tracking-wider transition-all rounded shadow-md"
                  >
                    <span>Visit Live Site</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => setSelectedProject(project)}
                    className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-bold transition-all rounded border border-zinc-700"
                    title="View details"
                  >
                    Details
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal Preview */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-4xl bg-[#181818] border border-zinc-700 rounded-xl overflow-hidden shadow-2xl relative my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedProject(null)}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/80 border border-zinc-700 flex items-center justify-center text-white hover:bg-[#E50914] hover:border-transparent transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="aspect-video relative bg-black">
                <img 
                  src={selectedProject.image} 
                  alt={selectedProject.title}
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-black/30" />
                
                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-400 bg-black/70 px-2.5 py-1 rounded border border-emerald-500/40 uppercase tracking-widest mb-2 inline-block">
                      Production Release
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-black text-white">{selectedProject.title}</h2>
                  </div>
                  
                  <a 
                    href={selectedProject.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-[#E50914] text-white px-6 py-2.5 rounded font-bold hover:bg-[#b00710] transition-all flex items-center gap-2 text-sm shadow-lg"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Open Site
                  </a>
                </div>
              </div>
              
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-300 mb-4 pb-4 border-b border-zinc-800">
                  <span className="text-emerald-400 font-extrabold">98% Match</span>
                  <span className="border border-zinc-700 bg-zinc-800 px-2 py-0.5 rounded text-[10px] text-zinc-300">HD / 4K</span>
                  <span>{new Date().getFullYear()} Edition</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-300">Architecture: Full-Stack & Cloud</span>
                </div>

                <p className="text-zinc-200 leading-relaxed text-base sm:text-lg mb-6">
                  {selectedProject.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedProject.tags.map(tag => (
                    <span key={tag} className="text-xs font-bold text-zinc-300 bg-zinc-800/90 px-3 py-1 rounded border border-zinc-700">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-zinc-800">
                  <a 
                    href={selectedProject.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 bg-white text-black py-3 rounded font-bold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Visit Official Live Website
                  </a>

                  <a 
                    href="#contact" 
                    onClick={() => setSelectedProject(null)}
                    className="px-6 py-3 bg-zinc-800 text-white rounded font-bold hover:bg-zinc-700 transition-all text-center text-sm border border-zinc-700"
                  >
                    Discuss Similar Project
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
