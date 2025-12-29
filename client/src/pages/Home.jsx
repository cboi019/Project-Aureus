import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';

// --- FAKE DATA GENERATOR ---
const generateFakePayouts = (count) => {
  const statuses = ['PROCESSED', 'VERIFIED', 'SETTLED', 'AUTHORIZED'];
  const prefixes = ['0X', 'BC1', 'TRX', 'BNB'];
  return Array.from({ length: count }).map((_, i) => {
    const address = `${prefixes[Math.floor(Math.random() * prefixes.length)]}${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`;
    const rawAmount = Math.random() * (100000 - 450) + 450;
    const amountStr = rawAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const time = Math.floor(Math.random() * 59) + 1;
    return {
      id: i,
      address: address.toUpperCase(),
      amount: `$${amountStr}`,
      isHighValue: rawAmount > 50000, 
      status: statuses[Math.floor(Math.random() * statuses.length)],
      time: `${time}m ago`
    };
  });
};

const LivePayoutLedger = () => {
  const payouts = useMemo(() => generateFakePayouts(50), []);
  const displayPayouts = [...payouts, ...payouts]; 
  const [activeNodes, setActiveNodes] = useState(12);

  useEffect(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const dailyNodes = 24 + (dayOfYear % 9); 
    setActiveNodes(dailyNodes);
  }, []);

  return (
    <div className="bg-black border-y border-zinc-900 overflow-hidden py-6 relative">
      <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-black via-black/80 to-transparent z-10"></div>
      <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black via-black/80 to-transparent z-10"></div>
      
      <div className="max-w-7xl mx-auto px-6 mb-6 flex justify-between items-end">
        <div>
          <h3 className="text-[9px] font-black text-amber-500 uppercase tracking-[0.4em] flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
            Live Transmission Ledger
          </h3>
          <p className="text-[7px] text-zinc-600 uppercase tracking-widest font-bold">Protocol: Global-Liquidity-V4</p>
        </div>
        <span className="text-[8px] text-zinc-400 font-mono uppercase bg-zinc-900/50 px-3 py-1 border border-zinc-800">
          Verified Nodes: {activeNodes} Active
        </span>
      </div>

      <div className="h-64 overflow-hidden relative">
        <motion.div 
          animate={{ y: [0, -2800] }} 
          transition={{ 
            duration: 120, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="space-y-1"
        >
          {displayPayouts.map((p, i) => (
            <div key={i} className="grid grid-cols-4 items-center px-6 py-3 border-y border-zinc-900/20 bg-[#080808]/30 hover:bg-zinc-900/80 transition-colors group">
              <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">{p.address}</span>
              <span className={`text-[11px] font-mono font-bold ${p.isHighValue ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'text-emerald-500'}`}>
                {p.amount}
              </span>
              <span className="text-[8px] font-black text-zinc-600 text-center uppercase tracking-tighter group-hover:text-zinc-400 transition-colors">{p.status}</span>
              <span className="text-[9px] font-mono text-zinc-500 text-right">{p.time}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

const Counter = ({ target, duration = 2, prefix = "" }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(target.replace(/[^0-9]/g, ""));
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
  }, [target, duration]);
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

  const scrollToAbout = (e) => {
    e.preventDefault();
    const element = document.getElementById('about');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-amber-500 selection:text-black overflow-x-hidden">
      
      <nav className="flex justify-between items-center px-6 md:px-12 py-8 border-b border-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-[0.5em] uppercase">AUREUS</span>
          <span className="text-[7px] text-amber-500 tracking-[0.4em] uppercase font-black">Capital Management</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#about" onClick={scrollToAbout} className="text-[9px] text-zinc-500 hover:text-white uppercase font-black transition-colors tracking-widest cursor-pointer">About</a>
          <Link to="/login" className="text-[9px] border border-zinc-800 px-6 py-2 uppercase font-black hover:bg-white hover:text-black transition-all">Client Login</Link>
        </div>
      </nav>

      <section className="relative pt-24 pb-32 px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="max-w-6xl mx-auto text-center relative z-10">
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

      <LivePayoutLedger />

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
              <Link to="/about-protocol" className="ml-2 text-amber-500 hover:text-white transition-colors font-black border-b border-amber-500/30 pb-0.5 whitespace-nowrap">READ MORE →</Link>
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

      <section className="bg-[#030303] py-32 px-6 border-t border-zinc-900">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="text-center mb-20">
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