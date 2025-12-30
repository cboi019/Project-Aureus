import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import toast from "react-hot-toast";
import { API_BASE_URL } from '../utils/api';

const PLANS = [
  { name: "SILVER TIER", apy: 12 },
  { name: "GOLD TIER", apy: 24 },
  { name: "DIAMOND TIER", apy: 40 }
];

const amountRanges = {
  3: { min: 500, max: 5000 },
  6: { min: 1000, max: 10000 },
  12: { min: 5000, max: 50000 }
};

const TIMEFRAMES = [
  { label: "3 MONTHS", value: 3 },
  { label: "6 MONTHS", value: 6 },
  { label: "12 MONTHS", value: 12 }
];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [amount, setAmount] = useState("");
  const [walletOptions, setWalletOptions] = useState([]);
  const [investments, setInvestments] = useState([]);
  
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedMonths, setSelectedMonths] = useState(3);
  const [selectedTxForWithdraw, setSelectedTxForWithdraw] = useState(null);
  const [activeStructId, setActiveStructId] = useState(null);

  const [selectedWallet, setSelectedWallet] = useState("");
  const [withdrawalAddress, setWithdrawalAddress] = useState("");
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [now, setNow] = useState(new Date());
  
  const navigate = useNavigate();

  const currentRange = amountRanges[selectedMonths];
  const isInvalidAmount = amount && (Number(amount) < currentRange.min || Number(amount) > currentRange.max);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("aureus_user"));
    if (!storedUser) return navigate("/login");
    fetchUserData(storedUser._id);
    refreshInvestments(storedUser._id);

    fetch(`${API_BASE_URL}/api/wallets`)
      .then(res => res.json())
      .then(data => setWalletOptions(data || []))
      .catch(() => console.error("Wallet fetch failed"));
  }, [navigate]);

  const fetchUserData = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/profile/${id}`);
      const data = await res.json();
      setUser(data);
    } catch (err) { console.error("User update failed"); }
  };

  const refreshInvestments = (userId) => {
    fetch(`${API_BASE_URL}/api/investments/user/${userId}`)
      .then(res => res.json())
      .then(data => setInvestments(data || []))
      .catch(() => console.error("Investment fetch failed"));
  };

  const getLockCountdown = (lockUntil) => {
    if (!lockUntil) return null;
    const diff = new Date(lockUntil) - now;
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / 1000 / 60) % 60);
    const secs = Math.floor((diff / 1000) % 60);
    return `${days}D ${hours}H ${mins}M ${secs}S`;
  };

  const calculateTotalLiquidity = () => {
    return investments.reduce((acc, inv) => acc + (Number(inv.currentAmount) || 0), 0);
  };

  const handleTopUpRequest = (investment) => {
    const planConfig = PLANS.find(p => p.name === investment.planType);
    setSelectedPlan(planConfig);
    setSelectedMonths(investment.planDuration);
    setActiveStructId(investment._id);
    setActiveTab("deposit");
  };

  const handleWithdrawRequest = (investment) => {
    const countdown = getLockCountdown(investment.lockUntil);
    if (countdown) {
      return toast.error("ACCESS DENIED: INVESTMENT NOT MATURE", {
        style: { background: '#7f1d1d', color: '#fff', fontSize: '10px', fontWeight: '900', border: '1px solid #ef4444' }
      });
    }
    setSelectedTxForWithdraw(investment);
    setWithdrawalAddress("");
    setActiveTab("withdraw");
  };

  const handleDepositSubmit = async () => {
    if (!selectedWallet) return toast.error("SELECT A TRANSMISSION NODE");
    const numAmount = Number(amount);
    const range = amountRanges[selectedMonths];
    
    if (!activeStructId && (numAmount < range.min || numAmount > range.max)) {
      return toast.error(`PROTOCOL REJECTED: Amount must be between $${range.min} and $${range.max}`);
    }

    const loading = toast.loading("BROADCASTING TO LEDGER...");
    try {
      const res = await fetch(`${API_BASE_URL}/api/transactions/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id, 
          amount: numAmount, 
          type: 'deposit',
          planName: selectedPlan.name, 
          targetWallet: selectedWallet, 
          months: selectedMonths,
          parentStructId: activeStructId 
        })
      });
      if (res.ok) {
        toast.success("PROTOCOL TRANSMITTED", { id: loading });
        setActiveTab("overview"); 
        setAmount(""); 
        setSelectedPlan(null);
        setActiveStructId(null);
        refreshInvestments(user._id);
      }
    } catch (err) { toast.error("TRANSMISSION ERROR", { id: loading }); }
  };

  const handleWithdrawExecute = async (e) => {
    e.preventDefault();
    const countdown = getLockCountdown(selectedTxForWithdraw?.lockUntil);
    if (countdown) {
        toast.error("RETRIEVAL BLOCKED: TIME REMAINING");
        return; 
    }
    const loading = toast.loading("EXECUTING WITHDRAWAL...");
    try {
      const res = await fetch(`${API_BASE_URL}/api/transactions/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: user._id, 
          amount: selectedTxForWithdraw.currentAmount,
          type: "withdrawal", 
          userWallet: withdrawalAddress,
          parentStructId: selectedTxForWithdraw._id
        }),
      });
      if (res.ok) {
        toast.success("RETRIEVAL QUEUED", { id: loading });
        setSelectedTxForWithdraw(null);
        refreshInvestments(user._id);
        setActiveTab("overview");
      }
    } catch (err) { toast.error("ERROR", { id: loading }); }
  };

  if (!user) return null;

  return (
    <PageTransition>
      <div className="min-h-screen bg-black text-white font-sans selection:bg-amber-500">
        <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-zinc-900 px-4 py-4 md:px-10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 onClick={() => navigate('/')} className="text-sm md:text-xl font-bold tracking-[0.3em] uppercase cursor-pointer">AUREUS <span className="text-amber-500">CAPITAL</span></h1>
            <div className="flex items-center gap-3 relative">
              <div className="text-right">
                <p className="text-[7px] text-zinc-600 uppercase font-bold hidden md:block">Authorized Node</p>
                <p className="text-[9px] md:text-[10px] font-black text-amber-500 uppercase truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">{user.fullName}</p>
              </div>
              <button onClick={() => setShowLogoutMenu(!showLogoutMenu)} className={`w-9 h-9 shrink-0 rounded-full bg-zinc-900 border flex items-center justify-center text-[10px] font-black transition-all ${showLogoutMenu ? 'border-amber-500 text-amber-500' : 'border-zinc-800 text-zinc-500'}`}>ID</button>
              <AnimatePresence>
                {showLogoutMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} 
                    className="absolute right-0 top-12 w-64 bg-zinc-900 border border-zinc-800 shadow-2xl z-[100]"
                  >
                    <div className="p-4 border-b border-zinc-800 bg-zinc-950">
                      <p className="text-[7px] text-zinc-600 uppercase font-bold tracking-wider mb-1">Logged in as</p>
                      <p className="text-[10px] text-amber-500 font-mono break-all">{user.email}</p>
                    </div>
                    <div className="p-4 space-y-2">
                      {user.role === 'admin' && (
                        <button onClick={() => navigate('/admin')} className="w-full text-[9px] font-black text-amber-500 border border-amber-500/40 px-3 py-3 hover:bg-amber-500 hover:text-black transition-all">ADMIN TERMINAL</button>
                      )}
                      <button onClick={() => navigate('/transactions')} className="w-full text-[9px] font-black text-zinc-400 border border-zinc-800 px-3 py-3 hover:bg-zinc-800 transition-all">VIEW LEDGER</button>
                      <button onClick={() => { localStorage.removeItem("aureus_user"); navigate("/login"); }} className="w-full bg-red-500/10 text-red-500 py-3 text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">TERMINATE SESSION</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto p-4 md:p-10 space-y-10 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatBox label="Total Protocol Liquidity" value={calculateTotalLiquidity()} color="text-white" />
            <StatBox label="Total Accrued Profit" value={user.totalProfit || 0} color="text-emerald-500" prefix="+" />
          </div>

          <div className="pt-6 border-t border-zinc-900">
            <div className="flex gap-6 border-b border-zinc-900 text-[10px] font-black uppercase mb-8">
              <button onClick={() => {setActiveTab("overview"); setActiveStructId(null); setSelectedTxForWithdraw(null);}} className={`pb-4 ${activeTab === "overview" ? "text-amber-500 border-b border-amber-500" : "text-zinc-600"}`}>Summary</button>
              <button onClick={() => {setActiveTab("deposit"); setActiveStructId(null); setSelectedTxForWithdraw(null);}} className={`pb-4 ${activeTab === "deposit" ? "text-amber-500 border-b border-amber-500" : "text-zinc-600"}`}>New Protocol</button>
              <button onClick={() => navigate('/transactions')} className="pb-4 text-zinc-600 hover:text-white">Ledger</button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                  <div>
                    <div className="flex justify-between items-end mb-6">
                      <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Active Investments</h3>
                      <button onClick={() => navigate('/transactions')} className="text-[9px] font-black text-zinc-600 hover:text-amber-500 uppercase border-b border-zinc-900">Full History →</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {investments.length > 0 ? (
                        investments.map((inv) => (
                          <ActivePlanCard key={inv._id} investment={inv} onFund={() => handleTopUpRequest(inv)} onWithdraw={() => handleWithdrawRequest(inv)} getLockCountdown={getLockCountdown} />
                        ))
                      ) : (
                        <div className="col-span-full border-2 border-dashed border-zinc-900 p-16 flex flex-col items-center justify-center text-center">
                          <p className="text-[12px] text-zinc-500 font-black uppercase mb-6">No active smart-contracts detected</p>
                          <button onClick={() => setActiveTab("deposit")} className="text-[10px] font-black text-amber-500 border border-amber-500/30 px-10 py-4 hover:bg-amber-500 hover:text-black">INITIALIZE NEW PLAN</button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "deposit" && (
                <motion.div key="deposit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  {!selectedPlan ? (
                    <div className="grid gap-4">
                      {PLANS.map(plan => (
                        <div key={plan.name} className="bg-zinc-900 border border-zinc-800 p-6 flex justify-between items-center hover:border-amber-500 group">
                          <div>
                            <h4 className="text-white group-hover:text-amber-500 font-black text-lg uppercase">{plan.name}</h4>
                            <p className="text-[10px] text-zinc-500 uppercase mt-1">Fixed Yield Index: {plan.apy}% APY</p>
                          </div>
                          <button onClick={() => setSelectedPlan(plan)} className="bg-white text-black text-[9px] font-black px-8 py-3 uppercase hover:bg-amber-500">Select Node</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-6 max-w-2xl mx-auto">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                        <p className="text-amber-500 text-[10px] font-black uppercase">{activeStructId ? `TOP-UP: ${selectedPlan.name}` : `${selectedPlan.name} INITIALIZATION`}</p>
                        <button onClick={() => {setSelectedPlan(null); setActiveStructId(null);}} className="text-[8px] text-zinc-600 underline uppercase">Abort</button>
                      </div>
                      {!activeStructId && (
                        <div className="grid grid-cols-3 gap-2">
                          {TIMEFRAMES.map(t => (
                            <button key={t.value} onClick={() => { setSelectedMonths(t.value); setAmount(""); }} className={`py-4 text-[9px] font-black border ${selectedMonths === t.value ? 'bg-amber-500 text-black border-amber-500' : 'border-zinc-800 text-zinc-500'}`}>{t.label}</button>
                          ))}
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                           <label className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Transaction Amount (USD)</label>
                           <span className={`text-[8px] font-mono italic ${isInvalidAmount ? 'text-red-500 animate-pulse' : 'text-amber-500/60'}`}>{isInvalidAmount ? 'OUTSIDE LIMITS' : `LIMITS: $${currentRange.min.toLocaleString()} — $${currentRange.max.toLocaleString()}`}</span>
                        </div>
                        <input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} className={`w-full bg-black border p-6 text-sm font-mono outline-none ${isInvalidAmount ? 'border-red-500/50 text-red-500' : 'border-zinc-800 text-white focus:border-amber-500'}`} placeholder="0.00" />
                      </div>
                      <select value={selectedWallet} onChange={(e) => setSelectedWallet(e.target.value)} className="w-full bg-black border border-zinc-800 p-6 text-[10px] font-black outline-none text-zinc-400 focus:border-amber-500 uppercase">
                        <option value="">SELECT TRANSMISSION NODE</option>
                        {walletOptions.map(w => <option key={w._id} value={w.address}>{w.name}</option>)}
                      </select>

                      {selectedWallet && (
                        <div className="bg-zinc-950 border border-amber-500/30 p-4 space-y-2">
                          <p className="text-[7px] text-amber-500 uppercase font-black tracking-widest">DESTINATION WALLET ADDRESS</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] text-white font-mono break-all flex-1">{selectedWallet}</p>
                            <button type="button" onClick={() => { navigator.clipboard.writeText(selectedWallet); toast.success("ADDRESS COPIED"); }}
                              className="shrink-0 bg-amber-500 text-black px-4 py-2 text-[8px] font-black uppercase hover:bg-white transition-all"
                            >COPY</button>
                          </div>
                          <p className="text-[8px] text-zinc-600 uppercase italic">Send exact amount to this address externally</p>
                        </div>
                      )}

                      <button onClick={handleDepositSubmit} disabled={isInvalidAmount || !amount || !selectedWallet} className="w-full bg-amber-500 text-black py-6 text-[11px] font-black uppercase hover:opacity-90 disabled:opacity-20 transition-all">Confirm Protocol Entry</button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "withdraw" && (
                <motion.div key="withdraw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-zinc-900 border border-zinc-800 p-10 max-w-xl mx-auto space-y-8">
                  {!selectedTxForWithdraw ? (
                    <div className="text-center py-10">
                       <p className="text-red-500 font-black text-[10px] uppercase tracking-widest">Access Denied: Return to Terminal</p>
                       <button onClick={() => setActiveTab("overview")} className="mt-4 text-[9px] text-zinc-500 underline uppercase">Back</button>
                    </div>
                  ) : (
                    <>
                      <div className="text-center">
                        <p className="text-[9px] text-zinc-600 uppercase font-black mb-2">Authorized Struct Liquidity</p>
                        <p className="text-4xl font-mono font-bold text-white">${Number(selectedTxForWithdraw.currentAmount).toLocaleString()}</p>
                        {getLockCountdown(selectedTxForWithdraw.lockUntil) && (
                           <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 text-red-500">
                             <p className="text-[9px] font-black uppercase tracking-tighter">⚠️ PROTOCOL LOCKED: IMMATURE ASSET</p>
                             <p className="text-[8px] font-mono mt-1 opacity-70">REMAINING: {getLockCountdown(selectedTxForWithdraw.lockUntil)}</p>
                           </div>
                        )}
                      </div>
                      <form onSubmit={handleWithdrawExecute} className="space-y-4">
                        <input type="text" value={withdrawalAddress} onChange={(e) => setWithdrawalAddress(e.target.value)} 
                          className="w-full bg-black border border-zinc-800 p-6 text-[10px] font-mono outline-none focus:border-amber-500 text-amber-500 disabled:opacity-30" 
                          placeholder="DESTINATION WALLET ADDRESS" disabled={!!getLockCountdown(selectedTxForWithdraw.lockUntil)} required 
                        />
                        <button type="submit" disabled={!!getLockCountdown(selectedTxForWithdraw.lockUntil)}
                          className="w-full bg-white text-black py-6 text-[11px] font-black uppercase hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all"
                        >
                          {getLockCountdown(selectedTxForWithdraw.lockUntil) ? "Protocol Locked" : "Execute Retrieval Protocol"}
                        </button>
                        <button type="button" onClick={() => setActiveTab("overview")} className="w-full border border-zinc-800 text-zinc-500 py-4 text-[9px] font-black uppercase hover:text-white">Abort Retrieval</button>
                      </form>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}

function ActivePlanCard({ investment, onFund, onWithdraw, getLockCountdown }) {
  const countdown = getLockCountdown(investment.lockUntil);
  const isLocked = !!countdown;
  const capital = Number(investment.currentAmount) || 0;
  const apy = Number(investment.apy) || 0;
  const months = Number(investment.planDuration) || 3;
  const estProfit = (capital * (apy / 100) * (months / 12)).toFixed(2);
  const canFundMore = capital < investment.maxAmount;

  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 p-6 flex flex-col justify-between min-h-[360px] hover:border-zinc-600 transition-all">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-black text-white uppercase italic">{investment.planType}</h3>
          <span className="text-[9px] text-amber-500 font-mono">NODE ACTIVE // ID: {investment._id?.slice(-6)}</span>
        </div>
        <div className="text-right">
           <p className="text-[7px] text-zinc-500 uppercase font-bold">Yield</p>
           <p className="text-emerald-500 font-mono text-xs">{apy}% APY</p>
        </div>
      </div>
      <div className="space-y-3 my-6">
        <div className="bg-zinc-950/50 p-3 border border-zinc-900">
          <p className="text-[7px] text-zinc-600 uppercase font-black mb-1">Contract Capital</p>
          <p className="text-lg font-mono font-bold text-white">${capital.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-950/50 p-3 border border-zinc-900">
          <p className="text-[7px] text-zinc-600 uppercase font-black mb-1">Expected Return (+{months}mo)</p>
          <p className="text-lg font-mono font-bold text-emerald-500">+${Number(estProfit).toLocaleString()}</p>
        </div>
      </div>
      <div className="pt-4 border-t border-zinc-900 space-y-4">
        <div className="flex flex-col">
          <span className="text-[7px] text-zinc-500 uppercase font-black">Contract Status</span>
          <span className={`text-[10px] font-mono font-bold ${isLocked ? 'text-red-500' : 'text-amber-500'}`}>
            {isLocked ? `LOCKED: ${countdown}` : "RETRIEVAL AUTHORIZED"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onFund} disabled={!canFundMore} className="py-3 text-[8px] font-black uppercase border border-zinc-700 hover:bg-white hover:text-black disabled:opacity-20">Top Up</button>
          <button onClick={onWithdraw} className={`py-3 text-[8px] font-black uppercase transition-all ${isLocked ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-amber-500 text-black hover:bg-amber-600'}`}>
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color, prefix = "" }) {
  return (
    <div className="bg-[#0a0a0a] border border-zinc-900 p-10 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-zinc-800 group-hover:bg-amber-500 transition-colors"></div>
      <p className="text-[9px] text-zinc-600 uppercase tracking-[0.3em] mb-4 font-black">{label}</p>
      <p className={`text-4xl md:text-5xl font-mono font-bold tracking-tighter ${color}`}>{prefix}${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
  );
}