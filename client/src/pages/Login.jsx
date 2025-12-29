// login.jsx

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const loading = toast.loading("AUTHENTICATING...");
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('aureus_user', JSON.stringify(data.user));
        toast.success("ACCESS GRANTED", { id: loading });
        navigate('/dashboard');
      } else {
        toast.error("CREDENTIALS REJECTED", { id: loading });
      }
    } catch (err) {
      toast.error("CONNECTION REFUSED", { id: loading });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full border border-zinc-900 bg-[#0a0a0a] p-10 md:p-14 relative">
        {/* BACK TO HOME COMMAND */}
        <Link to="/" className="absolute top-6 left-6 text-[8px] text-zinc-600 uppercase tracking-widest hover:text-amber-500 transition-colors">
          ← Back to Gateway
        </Link>

        <div className="text-center mb-10 mt-4">
          <h2 className="text-xl font-bold tracking-[0.5em] uppercase text-white">AUREUS</h2>
          <p className="text-[8px] text-zinc-600 tracking-[0.3em] uppercase mt-2">Authorized Access Only</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <p className="text-[7px] text-zinc-500 uppercase tracking-widest ml-1">Identity (Email)</p>
            <input 
              type="email" 
              className="w-full bg-black border border-zinc-800 p-4 text-xs font-mono outline-none focus:border-amber-500 text-white transition-all"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
          </div>
          <div className="space-y-1">
            <p className="text-[7px] text-zinc-500 uppercase tracking-widest ml-1">Key (Password)</p>
            <input 
              type="password" 
              className="w-full bg-black border border-zinc-800 p-4 text-xs font-mono outline-none focus:border-amber-500 text-white transition-all"
              value={password} onChange={e => setPassword(e.target.value)} required
            />
          </div>
          <button type="submit" className="w-full bg-white text-black py-4 text-[10px] font-black uppercase hover:bg-amber-500 transition-all duration-500 mt-4">
            Initialize Session
          </button>
        </form>
        
        <p className="text-center text-[8px] text-zinc-700 uppercase mt-8 tracking-widest">
          New Entity? <Link to="/register" className="text-zinc-400 hover:text-white underline">Apply for Access</Link>
        </p>
      </div>
    </div>
  );
}