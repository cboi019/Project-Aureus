import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState } from 'react';

const FAQ_DATA = [
  { q: "How are yields generated?", a: "Returns are generated via high-frequency neural arbitrage across 40+ global liquidity hubs." },
  { q: "Is there a lock-up period?", a: "Standard capital cycles operate on 3-month (Silver) and 6-month (Gold) intervals." },
  { q: "Are funds insured?", a: "Assets are secured in multi-sig cold storage with automated delta-neutral hedging protocols." }
];

export default function Contact() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-amber-500 selection:text-black">
      <nav className="flex justify-between items-center px-6 md:px-12 py-8 border-b border-zinc-900/50">
        <Link to="/" className="flex flex-col">
          <span className="text-lg font-bold tracking-[0.5em] uppercase">AUREUS</span>
          <span className="text-[7px] text-amber-500 tracking-[0.4em] uppercase font-black">Capital Management</span>
        </Link>
        <Link to="/login" className="text-[9px] border border-zinc-800 px-6 py-2 uppercase font-black hover:bg-white hover:text-black transition-all">Client Login</Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-4xl md:text-7xl font-bold tracking-tighter uppercase mb-16">Support <br/><span className="text-zinc-800">Uplink.</span></h1>

        <div className="grid md:grid-cols-2 gap-16 mb-24">
          <div>
            <h4 className="text-amber-500 text-[10px] font-black tracking-widest uppercase mb-4">Direct Communication</h4>
            <p className="text-zinc-500 text-[11px] uppercase tracking-wider leading-loose mb-6">For institutional inquiries or technical support, contact the transmission desk:</p>
            <a href="mailto:emmariottt@gmail.com" className="text-xl font-mono text-white hover:text-amber-500 transition-colors">emmariottt@gmail.com</a>
          </div>

          <div>
            <h4 className="text-amber-500 text-[10px] font-black tracking-widest uppercase mb-8">System FAQ</h4>
            <div className="space-y-4">
              {FAQ_DATA.map((faq, i) => (
                <div key={i} className="border-b border-zinc-900 pb-4">
                  <button 
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-left hover:text-amber-500 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span>{openFaq === i ? '-' : '+'}</span>
                  </button>
                  {openFaq === i && (
                    <p className="mt-4 text-[9px] text-zinc-600 uppercase leading-relaxed tracking-wider">{faq.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}