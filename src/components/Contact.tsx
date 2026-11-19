import { useState } from "react";
import { motion } from "motion/react";
import { Mail, MessageSquare, Send, Copy, Check } from "lucide-react";

export default function Contact() {
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText("ireentechnology@gmail.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="contact" className="py-24 px-6 md:px-12 max-w-5xl mx-auto border-t border-zinc-800">
      <div className="mb-12">
        <h2 className="text-3xl md:text-5xl font-bold mb-4">Contact Me</h2>
        <p className="text-zinc-400 font-medium">Ready to start a new production? Reach out via any of the channels below.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           whileInView={{ opacity: 1, x: 0 }}
           viewport={{ once: true }}
           className="space-y-8"
        >
          <div className="flex items-center gap-4 group cursor-pointer p-4 bg-zinc-900/80 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors" onClick={copyEmail}>
             <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:bg-[#E50914] transition-colors border border-zinc-700">
                <Mail className="w-6 h-6 text-white" />
             </div>
             <div className="flex-grow">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Email Address</p>
                <p className="text-base sm:text-lg font-medium text-white break-all">ireentechnology@gmail.com</p>
             </div>
             <div className="text-zinc-400 hover:text-white transition-colors">
                 {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
             </div>
          </div>

          <a href="https://wa.me/8801819676061" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group p-4 bg-zinc-900/80 rounded-lg border border-zinc-800 hover:border-emerald-600 transition-colors">
             <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:bg-emerald-600 transition-colors border border-zinc-700">
                <MessageSquare className="w-6 h-6 text-white" />
             </div>
             <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">WhatsApp Direct</p>
                <p className="text-base sm:text-lg font-medium text-white">+880 1819-676061</p>
             </div>
          </a>

          <a 
            href="https://ireentechnology.netlify.app" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block p-6 bg-zinc-900/80 rounded-lg border border-zinc-700/80 hover:border-[#E50914] hover:bg-zinc-800/90 transition-all group shadow-md"
          >
             <p className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Available Worldwide • Global Delivery
             </p>
             <p className="text-zinc-300 text-sm group-hover:text-white transition-colors font-medium">
                I'm currently accepting new projects and consulting opportunities in web development, digital architecture, and media platforms.
             </p>
          </a>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <input 
            type="text" 
            placeholder="Full Name" 
            className="w-full h-14 bg-zinc-900 border border-zinc-700 rounded-lg px-6 focus:ring-2 focus:ring-[#E50914] focus:border-[#E50914] outline-none transition-all placeholder:text-zinc-500 text-white font-medium"
          />
          <input 
            type="email" 
            placeholder="Email Address" 
            className="w-full h-14 bg-zinc-900 border border-zinc-700 rounded-lg px-6 focus:ring-2 focus:ring-[#E50914] focus:border-[#E50914] outline-none transition-all placeholder:text-zinc-500 text-white font-medium"
          />
          <textarea 
            placeholder="Message Delivery / Project Requirements" 
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-6 py-4 focus:ring-2 focus:ring-[#E50914] focus:border-[#E50914] outline-none transition-all placeholder:text-zinc-500 text-white font-medium resize-none"
          />
          <button className="w-full h-14 bg-[#E50914] hover:bg-[#b00710] text-white font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
             Send Transmission
             <Send className="w-4 h-4" />
          </button>
        </motion.form>
      </div>
    </section>
  );
}
