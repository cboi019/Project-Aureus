//Register.jsx

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Register() {
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    const loading = toast.loading("INITIALIZING ENTITY...");
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success("REGISTRATION LOGGED. PLEASE LOGIN.", { id: loading });
        navigate('/login');
      } else {
        toast.error("ENTITY ALREADY EXISTS", { id: loading });
      }
    } catch (err) {
      toast.error("UPLINK ERROR", { id: loading });
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
          <h2 className="text-xl font-bold tracking-[0.5em] uppercase text-white">REGISTER</h2>
          <p className="text-[8px] text-zinc-600 tracking-[0.3em] uppercase mt-2">Create Institutional Account</p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-1">
            <p className="text-[7px] text-zinc-500 uppercase tracking-widest ml-1">Legal Full Name</p>
            <input 
              type="text" 
              className="w-full bg-black border border-zinc-800 p-4 text-xs font-mono outline-none focus:border-amber-500 text-white"
              onChange={e => setFormData({...formData, fullName: e.target.value})} required
            />
          </div>
          <div className="space-y-1">
            <p className="text-[7px] text-zinc-500 uppercase tracking-widest ml-1">Email Address</p>
            <input 
              type="email" 
              className="w-full bg-black border border-zinc-800 p-4 text-xs font-mono outline-none focus:border-amber-500 text-white"
              onChange={e => setFormData({...formData, email: e.target.value})} required
            />
          </div>
          <div className="space-y-1">
            <p className="text-[7px] text-zinc-500 uppercase tracking-widest ml-1">Security Key (Password)</p>
            <input 
              type="password" 
              className="w-full bg-black border border-zinc-800 p-4 text-xs font-mono outline-none focus:border-amber-500 text-white"
              onChange={e => setFormData({...formData, password: e.target.value})} required
            />
          </div>
          <button type="submit" className="w-full bg-white text-black py-4 text-[10px] font-black uppercase hover:bg-amber-500 transition-all duration-500 mt-4">
            Initialize Account
          </button>
        </form>
        
        <p className="text-center text-[8px] text-zinc-700 uppercase mt-8 tracking-widest">
          Existing User? <Link to="/login" className="text-zinc-400 hover:text-white underline">Client Login</Link>
        </p>
      </div>
    </div>
  );
}