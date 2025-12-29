import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const Counter = ({ target, duration = 2, prefix = "" }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(target.replace(/[^0-9]/g, ""));
    const totalMiliseconds = duration * 1000;
    const incrementTime = totalMiliseconds / end;

    const timer = setInterval(() => {
      start += Math.ceil(end / 100);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [target]);

  return <span>{prefix}{count.toLocaleString()}{target.includes('+') ? '+' : ''}{target.includes('M') ? 'M' : ''}</span>;
};

export default function Home() {
  const stats = [
    { label: "Active Investors", value: "12840+" },
    { label: "Total Assets", value: "412M", prefix: "$" },
    { label: "Daily Volume", value: "18M", prefix: "$" },
    { label: "System Uptime", value: "100", suffix: "%" }
  ];

  const slideUp = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-amber-500 selection:text-black overflow-x-hidden">
      
      <nav className="flex justify-between items-center px-6 md:px-12 py-8 border-b border-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-[0.5em] uppercase">AUREUS</span>
          <span className="text-[7px] text-amber-500 tracking-[0.4em] uppercase font-black">Capital Management</span>
        </div>
        <div className="flex items-center gap-6">
          {/* Smooth Scroll Link */}
          <a href="#about" className="text-[9px] text-zinc-500 hover:text-white uppercase font-black transition-colors tracking-widest">
            About
          </a>
          <Link to="/login" className="text-[9px] border border-zinc-800 px-6 py-2 uppercase font-black hover:bg-white hover:text-black transition-all">
            Client Login
          </Link>
        </div>
      </nav>

      <section className="relative pt-24 pb-32 px-6">
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp}
          className="max-w-6xl mx-auto text-center relative z-10"
        >
          <h4 className="text-amber-500 text-[10px] font-black tracking-[0.8em] uppercase mb-6">Tier-1 Liquidity Terminal</h4>
          <h1 className="text-5xl md:text-9xl font-bold tracking-tighter uppercase leading-[0.9] mb-8">
            QUANTUM <br/> <span className="text-zinc-800">GROWTH.</span>
          </h1>
          <p className="text-xs md:text-sm text-zinc-500 max-w-2xl mx-auto uppercase tracking-widest leading-relaxed mb-12">
            Institutional-grade algorithmic trading strategies and non-custodial wealth management for the digital frontier.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-amber-500 text-black px-12 py-5 text-[10px] font-black uppercase hover:bg-white transition-all">Sign Up</Link>
            <Link to="/login" className="bg-zinc-900 text-white px-12 py-5 text-[10px] font-black uppercase hover:bg-zinc-800 transition-all">Login</Link>
          </div>
        </motion.div>
      </section>

      <section className="bg-[#080808] border-y border-zinc-900 py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-[8px] text-zinc-600 uppercase tracking-widest mb-2 font-bold">{s.label}</p>
              <p className="text-2xl md:text-5xl font-mono font-bold text-white tracking-tighter">
                <Counter target={s.value} prefix={s.prefix} />{s.suffix}
              </p>
            </div>
          ))}
        </div>
      </section>

      <motion.section 
        id="about"
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={slideUp}
        className="py-32 px-6 max-w-6xl mx-auto"
      >
        <div className="grid md:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-3xl font-bold uppercase tracking-tighter mb-8 italic text-amber-500">Neural Arbitrage</h2>
            <p className="text-zinc-500 text-xs uppercase tracking-[0.2em] leading-loose mb-6">
              Aureus leverages a proprietary neural network designed to identify arbitrage opportunities across 40+ global liquidity hubs simultaneously. 
            </p>
            <div className="h-[1px] w-20 bg-amber-500/50 mb-6"></div>
            <p className="text-zinc-400 text-[10px] uppercase tracking-[0.2em] leading-relaxed">
              We focus on risk-adjusted returns, ensuring investor capital is protected by automated delta-neutral hedging protocols.
              {/* --- NEW READ MORE LINK --- */}
              <Link to="/about-protocol" className="ml-2 text-amber-500 hover:text-white transition-colors font-black border-b border-amber-500/30 pb-0.5 whitespace-nowrap">
                READ MORE →
              </Link>
            </p>
          </div>
          <div className="bg-[#0a0a0a] border border-zinc-800 p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
               <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
            </div>
            <h3 className="text-white text-[10px] font-black uppercase mb-8 tracking-widest border-b border-zinc-900 pb-4">Protocol Specs</h3>
            <ul className="space-y-8">
              <li className="flex gap-6 items-start">
                <span className="text-amber-500 font-mono text-xs">01</span>
                <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Low Latency Execution Engine</p>
              </li>
              <li className="flex gap-6 items-start">
                <span className="text-amber-500 font-mono text-xs">02</span>
                <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Multi-Sig Cold Storage Custody</p>
              </li>
              <li className="flex gap-6 items-start">
                <span className="text-amber-500 font-mono text-xs">03</span>
                <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">24/7 Real-time Ledger Sync</p>
              </li>
            </ul>
          </div>
        </div>
      </motion.section>

      {/* Infrastructure and Footer sections remain unchanged */}
      <section className="bg-[#030303] py-32 px-6 border-t border-zinc-900">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp}
            className="text-center mb-20"
          >
            <h3 className="text-4xl font-bold uppercase tracking-tighter italic">Infrastructure</h3>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard title="Secure Uplink" delay={0.1} desc="End-to-end military grade encryption for all financial transmissions." />
            <FeatureCard title="Instant Settlement" delay={0.2} desc="Withdrawals are processed via automated smart-contract gateways." />
            <FeatureCard title="Verified APY" delay={0.3} desc="Returns generated by high-frequency diamond-tier strategies." />
          </div>
        </div>
      </section>

      <footer className="py-20 border-t border-zinc-900 px-6 bg-black">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-bold tracking-[0.5em] uppercase">AUREUS CAPITAL</p>
            <p className="text-[8px] text-zinc-700 uppercase mt-2 tracking-widest">Institutional Wealth Management © 2025</p>
          </div>
          <div className="flex gap-10">
            <Link to="/register" className="text-[9px] text-zinc-500 hover:text-white uppercase tracking-widest font-black transition-colors">Register</Link>
            <Link to="/login" className="text-[9px] text-zinc-500 hover:text-white uppercase tracking-widest font-black transition-colors">Terminal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, desc, delay }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      className="bg-[#080808] border border-zinc-900 p-12 hover:border-amber-500/40 transition-all cursor-crosshair"
    >
      <div className="w-1 h-10 bg-amber-500 mb-6"></div>
      <h4 className="text-[11px] font-black uppercase tracking-widest mb-4">{title}</h4>
      <p className="text-[9px] text-zinc-600 uppercase leading-loose tracking-wider">{desc}</p>
    </motion.div>
  );
}