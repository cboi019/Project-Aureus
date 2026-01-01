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
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('emmariottt@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 3000); // Reset message after 3 seconds
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-amber-500 selection:text-black">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-8 border-b border-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <Link to="/" className="flex flex-col">
          <span className="text-lg font-bold tracking-[0.5em] uppercase">AUREUS</span>
          <span className="text-[7px] text-amber-500 tracking-[0.4em] uppercase font-black">Capital Management</span>
        </Link>
        
        <div className="flex items-center gap-6">
          <Link to="/" className="text-[9px] text-zinc-500 hover:text-white uppercase font-black transition-colors tracking-widest cursor-pointer">
            ← Back to Terminal
          </Link>
          <Link to="/login" className="text-[9px] border border-zinc-800 px-6 py-2 uppercase font-black hover:bg-white hover:text-black transition-all">
            Client Login
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-7xl font-bold tracking-tighter uppercase mb-16">Support <br/><span className="text-zinc-800">Uplink.</span></h1>

          <div className="grid md:grid-cols-2 gap-16 mb-24">
            <div>
              <h4 className="text-amber-500 text-[10px] font-black tracking-widest uppercase mb-4">Direct Communication</h4>
              <p className="text-zinc-500 text-[11px] uppercase tracking-wider leading-loose mb-6">
                For institutional inquiries or technical support, contact the transmission desk:
              </p>
              
              <div className="space-y-4">
                {/* Clickable Email Link */}
                <a href="mailto:emmariottt@gmail.com" className="block text-xl font-mono text-white hover:text-amber-500 transition-colors">
                  emmariottt@gmail.com
                </a>

                {/* Manual Copy Button */}
                <button 
                  onClick={handleCopy}
                  className="text-[9px] text-zinc-600 hover:text-amber-500 uppercase tracking-[0.2em] font-black transition-all flex items-center gap-2"
                >
                  {copied ? (
                    <span className="text-emerald-500 animate-pulse">[ Address Copied to Clipboard ]</span>
                  ) : (
                    <span>[ Copy Transmission Address ]</span>
                  )}
                </button>
              </div>

              <div className="mt-12 p-4 border border-zinc-900 bg-[#080808]">
                <p className="text-[8px] text-zinc-600 uppercase tracking-widest leading-relaxed">
                  Average Response Latency: &lt; 120 Minutes<br/>
                  Encryption: E2E Military Grade (AES-256)
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-amber-500 text-[10px] font-black tracking-widest uppercase mb-8">System FAQ</h4>
              <div className="space-y-4">
                {FAQ_DATA.map((faq, i) => (
                  <div key={i} className="border-b border-zinc-900 pb-4">
                    <button 
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-left hover:text-amber-500 transition-colors group"
                    >
                      <span className={openFaq === i ? 'text-amber-500' : 'text-zinc-400 group-hover:text-white'}>{faq.q}</span>
                      <span className="text-zinc-600">{openFaq === i ? '−' : '+'}</span>
                    </button>
                    {openFaq === i && (
                      <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 text-[9px] text-zinc-500 uppercase leading-relaxed tracking-wider"
                      >
                        {faq.a}
                      </motion.p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}