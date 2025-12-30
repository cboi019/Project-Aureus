import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import { API_BASE_URL } from '../utils/api';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("aureus_user"));
    if (!storedUser) return navigate("/login");

    fetch(`${API_BASE_URL}/api/transactions/user/${storedUser._id}`)
      .then(res => res.json())
      .then(data => {
        setTransactions(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [navigate]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-black text-white font-sans p-6 md:p-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-12 border-b border-zinc-900 pb-6">
            <h1 className="text-sm md:text-xl font-black uppercase tracking-[0.3em]">
              Transaction <span className="text-amber-500">Ledger</span>
            </h1>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="text-[10px] font-black text-zinc-500 uppercase hover:text-white transition-colors border border-zinc-800 px-6 py-2"
            >
              Back to Dashboard
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-[10px] text-zinc-600 animate-pulse uppercase py-20 tracking-[0.5em]">Syncing with Mainframe...</p>
            ) : transactions.length > 0 ? (
              // Reversing to show latest first
              [...transactions].reverse().map((tx) => (
                <TransactionRow key={tx._id} transaction={tx} />
              ))
            ) : (
              <div className="border border-zinc-900 p-20 text-center">
                <p className="text-[10px] text-zinc-700 uppercase tracking-widest font-black">No transaction history detected</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function TransactionRow({ transaction }) {
  const statusColors = {
    pending: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    approved: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    denied: 'text-red-500 bg-red-500/10 border-red-500/20'
  };

  const date = new Date(transaction.createdAt);
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-[#080808] border border-zinc-900 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:border-zinc-700 transition-colors gap-4">
      <div className="flex items-center gap-6">
        <div className="min-w-[80px]">
          <p className="text-[10px] text-zinc-500 font-mono">{formattedDate}</p>
          <p className="text-[9px] text-zinc-600 font-mono">{formattedTime}</p>
        </div>
        <div className="h-8 w-[1px] bg-zinc-800 hidden sm:block"></div>
        <div>
          <p className={`text-[11px] font-black uppercase ${transaction.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'}`}>
            {transaction.type === 'deposit' ? '+' : '-'}${Number(transaction.amount).toLocaleString()}
          </p>
          <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">{transaction.type} Protocol</p>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
         <span className={`text-[8px] px-4 py-1.5 font-black uppercase border ${statusColors[transaction.status]}`}>
            {transaction.status}
         </span>
      </div>
    </div>
  );
}