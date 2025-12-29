import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

const generateHash = () =>
  '0x' +
  Math.random().toString(16).slice(2, 10) +
  '...' +
  Math.random().toString(16).slice(2, 6);

const protocols = [
  'Aave V3',
  'Yearn Vault',
  'Binance Inst.',
  'Compound',
  'Uniswap LP',
];

export default function AboutDetail() {
  const [txs, setTxs] = useState([
    {
      id: 1,
      hash: generateHash(),
      protocol: 'AAVE V3',
      amount: '$124,000.00',
      type: 'LENDING',
    },
    {
      id: 2,
      hash: generateHash(),
      protocol: 'BINANCE',
      amount: '$45,210.50',
      type: 'ARB',
    },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const isEth = Math.random() > 0.7;
      const amount = isEth
        ? `${(Math.random() * 10 + 0.5).toFixed(2)} ETH`
        : `$${(Math.random() * 120000 + 200).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })} USDC`;

      const newTx = {
        id: Date.now(),
        hash: generateHash(),
        protocol:
          protocols[Math.floor(Math.random() * protocols.length)].toUpperCase(),
        amount,
        type: Math.random() > 0.5 ? 'YIELD' : 'HEDGE',
      };

      setTxs((prev) => [newTx, ...prev.slice(0, 4)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full min-h-screen bg-[#050505] text-white font-sans selection:bg-amber-500 overflow-x-hidden">
      {/* NAV - REMOVED FANCY BUTTON */}
      <nav className="w-full max-w-[1400px] mx-auto px-4 sm:px-10 py-8 flex justify-start items-center">
        <Link
          to="/"
          className="text-amber-500 text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-all border-b border-transparent hover:border-amber-500"
        >
          ← BACK TO TERMINAL
        </Link>
      </nav>

      <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-10 pb-24">
        {/* HEADER */}
        <header className="mt-8 mb-20">
          <h1
            className="leading-[0.9] font-bold uppercase tracking-tighter break-words"
            style={{ fontSize: 'clamp(2.5rem, 11vw, 8.5rem)' }}
          >
            THE <span className="text-amber-500 italic">AUREUS</span>
            <br />
            ARCHITECTURES
          </h1>

          <p className="text-zinc-500 text-[9px] sm:text-[11px] uppercase tracking-[0.4em] mt-8 border-l-2 border-amber-500 pl-6 max-w-xl leading-relaxed">
            Institutional Liquidity & Yield Aggregation Engine
          </p>
        </header>

        {/* STATS + LEDGER */}
        <section className="grid lg:grid-cols-2 gap-8 md:gap-16 items-start mb-24 overflow-hidden">
          <div className="space-y-8 order-2 lg:order-1">
            <div className="space-y-4">
              <h3 className="text-amber-500 text-[10px] font-black tracking-[0.4em] uppercase">
                Real-Time Data
              </h3>
              <h2 className="text-3xl sm:text-5xl font-bold uppercase italic leading-tight">
                Live Ledger
              </h2>
              <p className="text-zinc-500 text-xs sm:text-sm uppercase leading-relaxed tracking-widest max-w-lg">
                Monitoring sub-millisecond rebalancing across the DeFi and CeFi
                layers.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 font-mono">
              <div className="bg-zinc-900/20 p-6 border border-zinc-800 flex-1 min-w-0">
                <p className="text-[8px] text-zinc-500 uppercase mb-2">
                  TVL Aggregate
                </p>
                <p className="text-xl sm:text-2xl font-bold truncate">
                  $412.8M
                </p>
              </div>

              <div className="bg-zinc-900/20 p-6 border border-zinc-800 flex-1 min-w-0">
                <p className="text-[8px] text-zinc-500 uppercase mb-2">
                  Network Latency
                </p>
                <p className="text-xl sm:text-2xl font-bold text-amber-500">
                  12.4ms
                </p>
              </div>
            </div>
          </div>

          {/* LEDGER */}
          <div className="order-1 lg:order-2 bg-black border border-zinc-800 rounded-sm overflow-hidden h-[380px] flex flex-col w-full">
            <div className="bg-zinc-900/40 px-6 py-4 border-b border-zinc-800 flex justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                SYSTEM_LIVE
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence initial={false}>
                {txs.map((tx) => (
                  <motion.div
                    key={tx.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-between items-center p-4 border border-zinc-900 bg-[#080808] w-full"
                  >
                    <div className="min-w-0 flex-1 mr-4">
                      <p className="text-[9px] font-mono text-zinc-400 truncate tracking-tighter">
                        {tx.hash}
                      </p>
                      <p className="text-[8px] text-amber-500 font-black uppercase mt-1">
                        {tx.protocol}
                      </p>
                    </div>
                    <div className="text-right font-bold text-[10px] sm:text-xs font-mono text-white whitespace-nowrap">
                      {tx.amount}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* DETAILS */}
        <div className="space-y-24 md:space-y-32">
          <DetailSection num="01" title="DECENTRALIZED AGGREGATION">
            Aureus utilizes{' '}
            <span className="text-white">Yearn Finance (yVaults)</span> to
            automate the shifting of capital.
          </DetailSection>

          <DetailSection num="02" title="CENTRALIZED EFFICIENCY">
            We bridge DeFi returns with CeFi Yield Aggregators like{' '}
            <span className="text-white font-bold italic uppercase">
              Binance Institutional
            </span>
            .
          </DetailSection>

          <section className="border-l-4 border-amber-500 pl-6 sm:pl-16 md:pl-12">
            <h2 className="text-3xl sm:text-6xl font-bold uppercase italic tracking-tighter mb-8 leading-none">
              03. REVENUE
            </h2>
            <p className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-[0.3em] leading-loose max-w-xl mb-12">
              10% Performance fee on{' '}
              <span className="text-white font-black italic underline underline-offset-8 decoration-amber-500/50">
                realized profits only
              </span>
              .
            </p>

            <Link
              to="/register"
              className="w-full sm:w-auto bg-amber-500 text-black px-12 py-6 text-[10px] font-black uppercase hover:bg-white transition-all inline-block text-center tracking-[0.4em]"
            >
              INITIALIZE PORTFOLIO
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}

/* SUB COMPONENTS */

function DetailSection({ num, title, children }) {
  return (
    <div className="border-l-2 border-zinc-800 pl-6 sm:pl-16 md:pl-12 w-full">
      <h2 className="text-white text-xl sm:text-4xl font-bold italic tracking-tighter uppercase mb-6 flex items-center gap-4">
        <span className="text-amber-500 font-mono text-sm tracking-widest">
          {num}
        </span>
        {title}
      </h2>
      <p className="text-zinc-400 text-[10px] sm:text-xs uppercase leading-[2.2] tracking-[0.2em] max-w-3xl">
        {children}
      </p>
    </div>
  );
}