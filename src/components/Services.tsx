import { type ReactNode } from "react";
import { motion } from "motion/react";
import { 
  Globe, 
  Layout, 
  Tv, 
  Server, 
  Smartphone, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  MessageSquare
} from "lucide-react";

interface ServiceItem {
  id: string;
  title: string;
  badge: string;
  description: string;
  icon: ReactNode;
  iconBg: string;
  accentColor: string;
  features: string[];
}

const services: ServiceItem[] = [
  {
    id: "web-dev",
    title: "Full-Stack Web Development",
    badge: "Popular",
    description: "Custom high-performance websites and complex web applications built with React, Next.js, TypeScript, and modern responsive frameworks.",
    icon: <Globe className="w-6 h-6 text-[#E50914]" />,
    iconBg: "bg-red-950/40 border-red-800/40",
    accentColor: "border-red-600/30",
    features: [
      "React & Next.js SPAs",
      "100% Mobile & PC Responsive",
      "SEO & High Speed Optimized",
      "Clean & Maintainable Code"
    ]
  },
  {
    id: "ui-ux",
    title: "Cinematic UI/UX Design",
    badge: "Creative",
    description: "World-class user interfaces inspired by top-tier entertainment platforms like Netflix, featuring smooth transitions and dark-mode elegance.",
    icon: <Layout className="w-6 h-6 text-purple-400" />,
    iconBg: "bg-purple-950/40 border-purple-800/40",
    accentColor: "border-purple-600/30",
    features: [
      "Netflix-Style Aesthetics",
      "Intuitive User Journeys",
      "Fluid Motion & Animations",
      "Design System & Components"
    ]
  },
  {
    id: "streaming-media",
    title: "Live TV & Streaming Media",
    badge: "Specialty",
    description: "Specialized multimedia and live broadcast portals (like Ireen Live TV & Cine Stream IT) with low latency video playback and custom themes.",
    icon: <Tv className="w-6 h-6 text-amber-400" />,
    iconBg: "bg-amber-950/40 border-amber-800/40",
    accentColor: "border-amber-600/30",
    features: [
      "Live TV Stream Integration",
      "Cinematic Movie Portals",
      "Custom Blogger & CMS Themes",
      "Cross-Platform Video Players"
    ]
  },
  {
    id: "backend-cloud",
    title: "Backend & Cloud Database",
    badge: "Architecture",
    description: "Robust server-side architectures, REST APIs, Firebase Firestore real-time databases, authentication systems, and cloud infrastructure.",
    icon: <Server className="w-6 h-6 text-emerald-400" />,
    iconBg: "bg-emerald-950/40 border-emerald-800/40",
    accentColor: "border-emerald-600/30",
    features: [
      "Firebase Auth & Firestore",
      "Node.js & Express REST APIs",
      "Secure Role-Based Access",
      "Cloud Deployment & Hosting"
    ]
  },
  {
    id: "business-solutions",
    title: "Business & Portfolio Portals",
    badge: "Enterprise",
    description: "Digital business presence for IT agencies and corporate brands (like Ireen Technology) with lead generation and client communication.",
    icon: <Smartphone className="w-6 h-6 text-cyan-400" />,
    iconBg: "bg-cyan-950/40 border-cyan-800/40",
    accentColor: "border-cyan-600/30",
    features: [
      "Corporate Portfolio Showcases",
      "WhatsApp & Lead Inquiries",
      "Worldwide Fast CDN Delivery",
      "Brand Growth & Conversion"
    ]
  },
  {
    id: "speed-maintenance",
    title: "Speed, Security & Maintenance",
    badge: "Support",
    description: "Continuous 24/7 technical monitoring, bug fixes, performance tuning, Core Web Vitals optimization, and security hardening.",
    icon: <Zap className="w-6 h-6 text-yellow-400" />,
    iconBg: "bg-yellow-950/40 border-yellow-800/40",
    accentColor: "border-yellow-600/30",
    features: [
      "Ultra-Fast Load Speeds",
      "Regular Security Updates",
      "Cross-Device Bug Fixing",
      "Direct Priority Support"
    ]
  }
];

export default function Services() {
  return (
    <section id="services" className="py-20 px-6 md:px-12 bg-black border-t border-zinc-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E50914] animate-pulse"></span>
              <span className="text-[#E50914] font-black text-xs uppercase tracking-widest">
                Our Services • সেবাসমূহ
              </span>
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white border-l-4 border-[#E50914] pl-4 tracking-tight">
              Featured Services & Solutions
            </h2>
            <p className="text-zinc-300 text-sm md:text-base mt-2 max-w-2xl font-medium">
              We provide modern, high-speed, and cinematic digital solutions designed to elevate your brand across web and mobile.
            </p>
          </div>

          <a 
            href="#contact"
            className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-white bg-zinc-800 hover:bg-[#E50914] px-5 py-2.5 rounded transition-all border border-zinc-700 hover:border-transparent self-start md:self-auto shadow-md"
          >
            <span>Request a Custom Service</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Services Grid - High visibility, crisp cards on both mobile & desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              className="bg-[#181818] rounded-lg p-6 sm:p-7 border border-zinc-700/80 hover:border-[#E50914]/70 hover:bg-[#202020] transition-all duration-300 flex flex-col justify-between group shadow-xl relative overflow-hidden"
            >
              {/* Top Accent Stripe */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E50914] via-zinc-700 to-transparent" />

              <div>
                {/* Header row with Icon and Badge */}
                <div className="flex items-center justify-between mb-5">
                  <div className={`p-3 rounded-lg border ${service.iconBg} shadow-inner`}>
                    {service.icon}
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-zinc-800/90 text-zinc-200 border border-zinc-600">
                    {service.badge}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2.5 group-hover:text-[#E50914] transition-colors">
                  {service.title}
                </h3>

                {/* Description with high contrast for mobile screens */}
                <p className="text-zinc-300 text-sm leading-relaxed mb-6 font-normal">
                  {service.description}
                </p>

                {/* Feature Bullet Points */}
                <div className="space-y-2 mb-6">
                  {service.features.map((feature, fIndex) => (
                    <div key={fIndex} className="flex items-center gap-2.5 text-xs text-zinc-200">
                      <CheckCircle2 className="w-4 h-4 text-[#E50914] flex-shrink-0" />
                      <span className="font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Link */}
              <div className="pt-4 border-t border-zinc-700/60 mt-auto flex items-center justify-between">
                <a
                  href="#contact"
                  className="text-xs font-bold text-zinc-200 hover:text-white flex items-center gap-1.5 transition-colors group-hover:translate-x-1 duration-200"
                >
                  <span>Order This Service</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E50914]" />
                </a>

                <a
                  href="https://wa.me/8801819676061"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white transition-all"
                  title="Discuss on WhatsApp"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
