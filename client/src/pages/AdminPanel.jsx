// AdminPanel.jsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";
import toast from "react-hot-toast";
import { API_BASE_URL } from '../utils/api';

// --- CUSTOM AUREUS MODAL COMPONENT ---
function AureusModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "AUTHORIZE", cancelText = "ABORT" }) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-zinc-950 border border-zinc-800 p-8 shadow-[0_0_50px_rgba(0,0,0,1)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/20">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: "100%" }} 
              className="h-full bg-amber-500" 
            />
          </div>
          
          <h2 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-4">{title}</h2>
          <p className="text-zinc-400 text-sm font-bold uppercase mb-8 leading-relaxed tracking-tight">{message}</p>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={onCancel}
              className="py-4 text-[9px] font-black uppercase border border-zinc-800 text-zinc-500 hover:bg-zinc-900 transition-all"
            >
              {cancelText}
            </button>
            <button 
              onClick={onConfirm}
              className="py-4 text-[9px] font-black uppercase bg-amber-500 text-black hover:bg-white transition-all shadow-lg shadow-amber-500/10"
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [newWallet, setNewWallet] = useState({ name: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null); 
  const navigate = useNavigate();

  // Modal State
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, data: null });

  useEffect(() => {
    const admin = JSON.parse(localStorage.getItem("aureus_user"));
    if (!admin || admin.role !== "admin") return navigate("/dashboard");
    setAdminUser(admin);
    refreshAllData();
  }, [navigate]);

  const refreshAllData = async () => {
    setLoading(true);
    try {
      const [uRes, pRes, wRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/users`),
        fetch(`${API_BASE_URL}/api/admin/pending-transactions`),
        fetch(`${API_BASE_URL}/api/wallets`)
      ]);
      setUsers(await uRes.json());
      setPending(await pRes.json());
      setWallets(await wRes.json());
    } catch (err) { 
      toast.error("TERMINAL DATA ERROR"); 
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (trans) => {
    const loadingToast = toast.loading("EXECUTING PROTOCOL APPROVAL...");
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/approve-transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          transId: trans._id, 
          userId: trans.userId._id, 
          amount: trans.amount, 
          type: trans.type 
        }),
      });
      if (res.ok) { 
        toast.success("PROTOCOL AUTHORIZED", { id: loadingToast }); 
        refreshAllData(); 
      }
    } catch (err) {
      toast.error("GATEWAY ERROR", { id: loadingToast });
    }
  };

  const executeDecline = async (transId) => {
    setModalConfig({ isOpen: false, type: null, data: null });
    const loadingToast = toast.loading("TERMINATING REQUEST...");
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/transactions/${transId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("REQUEST PURGED", { id: loadingToast });
        refreshAllData();
      }
    } catch (err) {
      toast.error("TERMINATION FAILED", { id: loadingToast });
    }
  };

  const executeUserDelete = async (id) => {
    setModalConfig({ isOpen: false, type: null, data: null });
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("ENTITY REMOVED");
        refreshAllData();
      }
    } catch (err) {
      toast.error("WIPE FAILED");
    }
  };

  const addWallet = async () => {
    if (!newWallet.name || !newWallet.address) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWallet)
      });
      if (res.ok) {
        setNewWallet({ name: "", address: "" });
        toast.success("WALLET REGISTERED");
        refreshAllData();
      }
    } catch (err) {
      toast.error("GATEWAY REGISTRATION FAILED");
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-black text-white p-4 md:p-10 font-sans">
        
        {/* --- CUSTOM MODAL HANDLERS --- */}
        <AureusModal 
          isOpen={modalConfig.isOpen && modalConfig.type === 'decline'}
          title="Security Protocol"
          message="Decline and terminate this transmission request? This action is recorded and irreversible."
          confirmText="TERMINATE"
          onConfirm={() => executeDecline(modalConfig.data)}
          onCancel={() => setModalConfig({ isOpen: false, type: null, data: null })}
        />

        <AureusModal 
          isOpen={modalConfig.isOpen && modalConfig.type === 'deleteUser'}
          title="Entity Wipe"
          message="Permanently remove this entity from the mainframe? All ledger history will be purged."
          confirmText="WIPE ENTITY"
          onConfirm={() => executeUserDelete(modalConfig.data)}
          onCancel={() => setModalConfig({ isOpen: false, type: null, data: null })}
        />

        {/* --- FIXED HEADER WITH ENTITY INFO --- */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-6 mb-10 sticky top-0 bg-black z-50">
          <div className="flex items-center gap-2 md:gap-4">
            <h1 className="text-sm md:text-xl font-black uppercase tracking-tighter shrink-0">
              Admin <span className="text-amber-500">Terminal</span>
            </h1>
            {loading && <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-amber-500 animate-ping rounded-full"></div>}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end leading-none">
              <span className="text-[7px] text-zinc-500 uppercase font-black tracking-widest mb-1">Entity Authorized</span>
              <span className="text-[10px] text-white font-bold uppercase truncate max-w-[100px]">{adminUser?.fullName}</span>
            </div>

            <button 
              onClick={() => navigate('/dashboard')} 
              className="bg-white text-black px-4 md:px-6 py-2 text-[8px] md:text-[10px] font-black uppercase hover:bg-amber-500 transition-colors shrink-0"
            >
              Exit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Pending Authorization</h2>
              <span className="text-[8px] text-zinc-600 font-mono">COUNT: {pending.length}</span>
            </div>
            
            <div className="space-y-3">
              {pending.length === 0 ? (
                <div className="py-10 border border-zinc-900 text-center">
                  <p className="text-zinc-700 text-[10px] uppercase tracking-widest">No pending transmissions...</p>
                </div>
              ) : (
                pending.map(p => (
                  <div key={p._id} className="bg-zinc-900/40 border border-zinc-800 p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-zinc-700 transition-colors">
                    <div className="space-y-1 w-full md:w-auto">
                      <div className="flex items-center justify-between md:justify-start gap-2">
                        <p className="text-[10px] font-bold text-white uppercase truncate">{p.userId?.fullName || "UNKNOWN ENTITY"}</p>
                        <span className={`text-[7px] px-1.5 py-0.5 font-black uppercase ${p.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                          {p.type}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <p className="text-[11px] font-mono text-white">${p.amount?.toLocaleString()}</p>
                        {p.type === 'deposit' && (
                          <div className="flex gap-3 border-l border-zinc-800 pl-3">
                            <span className="text-[8px] text-amber-500 uppercase font-bold">{p.planName}</span>
                            <span className="text-[8px] text-zinc-500 uppercase font-bold">{p.months}M</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex w-full md:w-auto gap-2">
                      <button 
                        onClick={() => setModalConfig({ isOpen: true, type: 'decline', data: p._id })} 
                        className="flex-1 md:flex-none border border-red-900/50 text-red-500 px-4 py-3 text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all"
                      >
                        Decline
                      </button>
                      <button 
                        onClick={() => handleApprove(p)} 
                        className="flex-[2] md:flex-none bg-amber-500 text-black px-6 md:px-8 py-3 text-[9px] font-black uppercase hover:bg-white transition-all shadow-lg shadow-amber-500/10"
                      >
                        Authorize
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <h2 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-16 mb-4">Active Entities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {users.map(u => (
                <div key={u._id} className="bg-zinc-900/20 border border-zinc-900 p-4 flex justify-between items-center group">
                  <div className="truncate pr-2">
                    <p className="text-[10px] font-bold uppercase text-zinc-300 group-hover:text-white transition-colors truncate">{u.fullName}</p>
                    <p className="text-[10px] text-zinc-600 font-mono">${u.totalProfit?.toLocaleString() || 0}</p>
                  </div>
                  <button 
                    onClick={() => setModalConfig({ isOpen: true, type: 'deleteUser', data: u._id })} 
                    className="opacity-100 md:opacity-0 group-hover:opacity-100 border border-red-950 text-red-900 px-3 py-1 text-[8px] font-black uppercase hover:bg-red-900 hover:text-white transition-all shrink-0"
                  >
                    Wipe
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">Gateway Wallets</h2>
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 shadow-2xl">
              <div className="space-y-1">
                <label className="text-[7px] text-zinc-500 uppercase font-black">Node Identifier</label>
                <input 
                  className="w-full bg-black border border-zinc-800 p-3 text-[10px] outline-none focus:border-amber-500 text-white font-mono"
                  placeholder="e.g. BTC_NETWORK_01" 
                  value={newWallet.name}
                  onChange={e => setNewWallet({...newWallet, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[7px] text-zinc-500 uppercase font-black">Public Address</label>
                <input 
                  className="w-full bg-black border border-zinc-800 p-3 text-[10px] outline-none focus:border-amber-500 text-white font-mono"
                  placeholder="0x..." 
                  value={newWallet.address}
                  onChange={e => setNewWallet({...newWallet, address: e.target.value})}
                />
              </div>
              <button onClick={addWallet} className="w-full bg-white text-black py-3 text-[10px] font-black uppercase hover:bg-amber-500 transition-colors">Register Node</button>
            </div>

            <div className="space-y-2">
              {wallets.map(w => (
                <div key={w._id} className="bg-zinc-900/30 p-4 flex justify-between items-center border border-zinc-900 hover:border-zinc-700 transition-all">
                  <div className="overflow-hidden">
                    <p className="text-[9px] font-black uppercase text-white tracking-tighter truncate">{w.name}</p>
                    <p className="text-[8px] text-zinc-600 font-mono truncate w-full mt-1">{w.address}</p>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        await fetch(`${API_BASE_URL}/api/admin/wallets/${w._id}`, { method: 'DELETE' });
                        refreshAllData();
                      } catch (err) {
                        toast.error("DISCONNECT FAILED");
                      }
                    }}
                    className="text-zinc-700 text-[8px] font-black hover:text-red-500 transition-colors ml-2 shrink-0"
                  >DISCONNECT</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageTransition> 
  );
}