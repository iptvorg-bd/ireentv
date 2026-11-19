import { motion } from "motion/react";

export default function About() {
  return (
    <section id="about" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative aspect-square md:aspect-[4/5] rounded-lg overflow-hidden border border-zinc-800"
        >
          <img 
            src="https://i.ibb.co.com/d4StpdWN/pomelli-image.png" 
            alt="Md Anamul Hoque" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <h2 className="text-sm font-black text-[#E50914] uppercase tracking-[0.3em]">The Creator</h2>
          <h3 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
            Md Anamul Hoque
          </h3>
          <p className="text-lg text-zinc-400 leading-relaxed">
            Leading the next generation of digital media in Bangladesh. With a focus on 
            high-performance web architecture and cinematic user experiences, I bridge 
            the gap between complex backend systems and intuitive frontend design.
          </p>
          <div className="grid grid-cols-2 gap-8 pt-4">
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Location</p>
              <p className="text-white font-medium">Dhaka, Bangladesh</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Focus</p>
              <p className="text-white font-medium">Full Stack Development</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
