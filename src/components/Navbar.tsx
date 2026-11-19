import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Bell, User, Menu, X } from "lucide-react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navItems = ["Home", "About", "Services", "Skills", "Projects", "Contact"];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 md:px-12 h-16 transition-colors duration-500 ${isScrolled || isMobileMenuOpen ? 'bg-black shadow-lg' : 'bg-gradient-to-b from-black/80 to-transparent'}`}
      >
        <div className="flex items-center gap-10">
          <div className="text-[#E50914] font-black text-2xl md:text-3xl tracking-tighter uppercase font-display cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            ANAMUL
          </div>
          
          <div className="hidden md:flex items-center gap-5">
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4 md:gap-6 text-white">
          <Search className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform hidden sm:block" />
          <Bell className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform hidden sm:block" />
          <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center cursor-pointer overflow-hidden border border-zinc-700 hidden sm:flex">
            <User className="w-5 h-5 text-zinc-500" />
          </div>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed top-16 left-0 right-0 z-40 bg-black/95 backdrop-blur-lg border-b border-zinc-800 md:hidden overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4">
              {navItems.map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-lg font-bold text-zinc-300 hover:text-[#E50914] transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
