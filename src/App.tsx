/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Services from "./components/Services";
import Skills from "./components/Skills";
import Projects from "./components/Projects";
import Contact from "./components/Contact";
import { motion } from "motion/react";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <main>
        <Hero />
        <About />
        <Services />
        <Skills />
        <Projects />
        <Contact />
      </main>

      <footer className="py-20 px-6 md:px-12 bg-black border-t border-zinc-900">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-6 mb-8 text-zinc-100">
             <a href="https://www.facebook.com/Ireentechnology" target="_blank" rel="noopener noreferrer"><Facebook className="w-6 h-6 cursor-pointer hover:text-[#E50914] transition-colors" /></a>
             <a href="https://www.instagram.com/ireentechnology" target="_blank" rel="noopener noreferrer"><Instagram className="w-6 h-6 cursor-pointer hover:text-[#E50914] transition-colors" /></a>
             <a href="https://x.com/ireentechnology" target="_blank" rel="noopener noreferrer"><Twitter className="w-6 h-6 cursor-pointer hover:text-[#E50914] transition-colors" /></a>
             <a href="https://www.youtube.com/@ireentechnology" target="_blank" rel="noopener noreferrer"><Youtube className="w-6 h-6 cursor-pointer hover:text-[#E50914] transition-colors" /></a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
             {["Audio Description", "Help Center", "Gift Cards", "Media Center", "Investor Relations", "Jobs", "Terms of Use", "Privacy", "Legal Notices", "Cookie Preferences", "Corporate Information", "Contact Us"].map(link => (
                <a key={link} href="#" className="text-zinc-500 text-xs hover:underline">{link}</a>
             ))}
          </div>

          <div className="mb-8">
             <button className="border border-zinc-500 px-2 py-1 text-zinc-500 text-xs hover:text-white hover:border-white transition-colors">
                Service Code
             </button>
          </div>

          <div className="text-[10px] text-zinc-500">
            © 1997-{new Date().getFullYear()} Md Anamul Hoque • Full Stack Productions
          </div>
        </div>
      </footer>
    </div>
  );
}

