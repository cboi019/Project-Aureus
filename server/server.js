require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const cron = require('node-cron'); 

const app = express();
app.use(express.json());

// --- 🛡️ SECURITY & DATABASE ---
app.use(cors({
  origin: ['http://localhost:5173', 'https://aureus-capital.onrender.com'],
  credentials: true
}));

mongoose.connect(process.env.MONGO_URI, { dbName: 'aureus_capital' })
.then(() => console.log('>>> 🚀 SYSTEM ONLINE'))
.catch(err => console.error('❌ DATABASE ERROR:', err.message));

// --- 📧 MAIL ENGINE ---
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: { 
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS 
  },
  tls: { rejectUnauthorized: false }
});

// Non-blocking verification
transporter.verify().catch(() => console.log("⚠️ MAIL PORTS BLOCKED: Normal for Render Free."));

// --- 🏗️ SCHEMAS (Kept exactly as your original) ---
const User = mongoose.model('User', new mongoose.Schema({
  fullName: String, email: { type: String, unique: true }, password: String, totalProfit: { type: Number, default: 0 }, role: { type: String, default: 'investor' }
}));

const Investment = mongoose.model('Investment', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, currentAmount: Number, planType: String, planDuration: Number, apy: Number, maxAmount: Number, startDate: { type: Date, default: Date.now }, lockUntil: Date, lastProfitUpdate: { type: Date, default: Date.now }, status: { type: String, default: 'active' }
}));

const Transaction = mongoose.model('Transaction', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, investmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment' }, amount: Number, type: { type: String, enum: ['deposit', 'withdrawal'] }, status: { type: String, default: 'pending' }, planName: String, targetWallet: String, userWallet: String, months: Number, createdAt: { type: Date, default: Date.now }
}));

const Wallet = mongoose.model('Wallet', new mongoose.Schema({ name: String, address: String }));

// --- 💸 TRANSACTION REQUESTS (FIXED: RESPONSE FIRST) ---
app.post('/api/transactions/request', async (req, res) => {
  const { userId, amount, type, planName, targetWallet, userWallet, months, parentStructId } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const trans = new Transaction({ 
      userId, amount, type, planName, targetWallet, userWallet, months, investmentId: parentStructId || null 
    });
    await trans.save();

    // Kill the frontend loading screen immediately
    res.json({ success: true });

    // Handle mail in the background queue so it never hangs the UI
    setImmediate(() => {
      const actionLabel = type.toUpperCase();
      transporter.sendMail({
        from: `"AUREUS TERMINAL" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `🚨 ${actionLabel} ALERT: $${amount} - ${user.fullName}`,
        html: `<div style="background:#000;color:#fff;padding:20px;border:1px solid #fbbf24;"><h2>AUREUS LEDGER ALERT</h2><p>USER: ${user.fullName}</p><p>TYPE: ${actionLabel}</p><p>AMOUNT: $${amount}</p></div>`
      }).catch(e => console.log("📧 Background Mail blocked by Render Firewall."));
    });

  } catch (err) { console.error(err); if(!res.headersSent) res.status(500).send("System Error"); }
});

// --- 🛠️ ADMIN PANEL (FIXED: RESOLVES HANGING) ---
app.post('/api/admin/approve-transaction', async (req, res) => {
  const { transId, userId, amount, type } = req.body;
  try {
    const trans = await Transaction.findById(transId);
    if (!trans) return res.status(404).json({ error: "Trans not found" });

    // 1. Process Logic
    if (type === 'deposit') {
      const apyMap = { 'SILVER TIER': 12, 'GOLD TIER': 24, 'DIAMOND TIER': 40 };
      if (trans.investmentId) {
        await Investment.findByIdAndUpdate(trans.investmentId, { $inc: { currentAmount: Number(amount) } });
      } else {
        const lockDate = new Date(); lockDate.setMonth(lockDate.getMonth() + (trans.months || 1));
        await new Investment({ 
          userId, currentAmount: Number(amount), planType: trans.planName, planDuration: trans.months, 
          apy: apyMap[trans.planName] || 12, maxAmount: 50000, lockUntil: lockDate, startDate: new Date() 
        }).save();
      }
    } else if (type === 'withdrawal') {
      const inv = await Investment.findById(trans.investmentId);
      if (inv) { inv.currentAmount -= Number(amount); if (inv.currentAmount <= 0) inv.status = 'closed'; await inv.save(); }
    }

    await Transaction.findByIdAndUpdate(transId, { status: 'approved' });

    // 2. Respond to Admin Terminal immediately to clear the "TERMINATING REQUEST" spinner
    res.json({ success: true });

  } catch (err) { 
    console.error("Approval Error:", err); 
    if(!res.headersSent) res.status(500).json({ error: "Approval failed" }); 
  }
});

// --- 🏥 REMAINING ROUTES (Kept identical for stability) ---
app.get('/', (req, res) => res.json({ status: '🚀 AUREUS API ONLINE', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' }));
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    if (await User.findOne({ email: cleanEmail })) return res.status(400).json({ message: "User exists" });
    const user = new User({ fullName, email: cleanEmail, password: await bcrypt.hash(password, 10) });
    await user.save(); res.json({ success: true, user });
  } catch (err) { res.status(500).json({ error: "Fail" }); }
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).send("Invalid");
    const { password: _, ...userData } = user._doc; res.json({ user: userData });
  } catch (err) { res.status(500).send("Error"); }
});
app.get('/api/admin/users', async (req, res) => res.json(await User.find({ role: 'investor' })));
app.get('/api/admin/pending-transactions', async (req, res) => res.json(await Transaction.find({ status: 'pending' }).populate('userId', 'fullName email')));
app.get('/api/wallets', async (req, res) => res.json(await Wallet.find()));
app.post('/api/admin/wallets', async (req, res) => { const w = new Wallet(req.body); await w.save(); res.json(w); });
app.get('/api/user/profile/:id', async (req, res) => res.json(await User.findById(req.params.id)));
app.get('/api/investments/user/:userId', async (req, res) => res.json(await Investment.find({ userId: req.params.userId, status: 'active' }).sort({ createdAt: -1 })));
app.get('/api/transactions/user/:userId', async (req, res) => res.json(await Transaction.find({ userId: req.params.userId }).sort({ createdAt: -1 })));

// --- 📈 DAILY ROI ---
cron.schedule('0 0 * * *', async () => {
  const activeInvestments = await Investment.find({ status: 'active' });
  for (let investment of activeInvestments) {
    const dailyProfit = investment.currentAmount * (investment.apy / 365 / 100);
    investment.currentAmount += dailyProfit; investment.lastProfitUpdate = new Date(); await investment.save();
    await User.findByIdAndUpdate(investment.userId, { $inc: { totalProfit: dailyProfit } });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`>>> SYSTEM READY ON PORT ${PORT}`));