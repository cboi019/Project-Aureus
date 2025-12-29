// server.js
require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const cron = require('node-cron'); 

const app = express();
app.use(express.json());

// --- 🛡️ SECURITY & CORS ---
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://aureus-capital.onrender.com' 
  ],
  credentials: true
}));

// --- 🏗️ DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI, {
  dbName: 'aureus_capital' 
})
.then(() => {
  console.log('>>> 🚀 SYSTEM ONLINE');
})
.catch(err => console.error('❌ DATABASE ERROR:', err.message));

// --- 📧 MAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { 
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS 
  }
});

// --- 🏗️ MODELS ---
const User = mongoose.model('User', new mongoose.Schema({
  fullName: String, 
  email: { type: String, unique: true }, 
  password: String, 
  totalProfit: { type: Number, default: 0 },
  role: { type: String, default: 'investor' }
}));

const Investment = mongoose.model('Investment', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentAmount: { type: Number, required: true },
  planType: { type: String, required: true },
  planDuration: { type: Number, required: true },
  apy: { type: Number, required: true },
  maxAmount: { type: Number, required: true },
  startDate: { type: Date, default: Date.now },
  lockUntil: { type: Date, required: true },
  lastProfitUpdate: { type: Date, default: Date.now },
  status: { type: String, default: 'active' }
}));

const Transaction = mongoose.model('Transaction', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  investmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment' },
  amount: Number, 
  type: { type: String, enum: ['deposit', 'withdrawal'] },
  status: { type: String, default: 'pending' },
  planName: String, 
  targetWallet: String, 
  userWallet: String, 
  months: Number,
  createdAt: { type: Date, default: Date.now }
}));

const Wallet = mongoose.model('Wallet', new mongoose.Schema({ name: String, address: String }));

// --- 🏥 HEALTH CHECK ---
app.get('/', (req, res) => {
  res.json({ status: '🚀 AUREUS API ONLINE', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// --- 🔐 AUTHENTICATION ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ fullName, email: cleanEmail, password: hashedPassword });
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).send("Invalid Credentials");
    const { password: _, ...userData } = user._doc;
    res.json({ user: userData });
  } catch (err) {
    res.status(500).send("Login error");
  }
});

// --- 💸 TRANSACTION REQUESTS (WITH EMAIL FIX) ---
app.post('/api/transactions/request', async (req, res) => {
  const { userId, amount, type, planName, targetWallet, userWallet, months, parentStructId } = req.body;
  
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (type === 'withdrawal') {
      const investment = await Investment.findById(parentStructId);
      if (!investment || new Date() < new Date(investment.lockUntil)) {
        return res.status(403).json({ success: false, message: "PROTOCOL REJECTED: Investment not mature." });
      }

      const trans = new Transaction({ userId, investmentId: parentStructId, amount, type: 'withdrawal', userWallet });
      await trans.save();

      // FIXED: Awaiting the email
      await transporter.sendMail({
        from: `"AUREUS TERMINAL" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `🚨 WITHDRAWAL REQUEST: $${amount} - ${user.fullName}`,
        html: `<div style="background:#000;color:#fff;padding:20px;border:1px solid #fbbf24;">
                <h2 style="color:#fbbf24">AUREUS WITHDRAWAL ALERT</h2>
                <p>USER: ${user.fullName}</p><p>EMAIL: ${user.email}</p>
                <p>AMOUNT: $${amount}</p><p>WALLET: ${userWallet}</p>
              </div>`
      });

      return res.json({ success: true });
    }

    const trans = new Transaction({ userId, amount, type: 'deposit', planName, targetWallet, months, investmentId: parentStructId || null });
    await trans.save();

    const actionType = parentStructId ? 'TOP-UP' : 'NEW DEPOSIT';
    
    // FIXED: Awaiting the email
    await transporter.sendMail({
      from: `"AUREUS TERMINAL" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `🚨 ${actionType} REQUEST: $${amount} - ${user.fullName}`,
      html: `<div style="background:#000;color:#fff;padding:20px;border:1px solid #fbbf24;">
              <h2 style="color:#fbbf24">AUREUS LEDGER ALERT</h2>
              <p>USER: ${user.fullName}</p><p>TYPE: ${actionType}</p>
              <p>PLAN: ${planName}</p><p>AMOUNT: $${amount}</p>
            </div>`
    });

    res.json({ success: true });
  } catch (err) { 
    console.error("TRANSACTION ERROR:", err);
    res.status(500).send("Internal Transmission Error"); 
  }
});

// --- 🛠️ ADMIN PANEL ---
app.get('/api/admin/users', async (req, res) => res.json(await User.find({ role: 'investor' })));
app.get('/api/admin/pending-transactions', async (req, res) => {
  res.json(await Transaction.find({ status: 'pending' }).populate('userId', 'fullName email'));
});

app.post('/api/admin/approve-transaction', async (req, res) => {
  const { transId, userId, amount, type } = req.body;
  try {
    const trans = await Transaction.findById(transId);
    if (!trans) return res.status(404).json({ error: "Transaction not found" });

    if (type === 'deposit') {
      const apyMap = { 'SILVER TIER': 12, 'GOLD TIER': 24, 'DIAMOND TIER': 40 };
      const apy = apyMap[trans.planName] || 12;
      
      if (trans.investmentId) {
        await Investment.findByIdAndUpdate(trans.investmentId, { $inc: { currentAmount: Number(amount) } });
      } else {
        const lockDate = new Date();
        lockDate.setMonth(lockDate.getMonth() + trans.months);
        await new Investment({ userId, currentAmount: Number(amount), planType: trans.planName, planDuration: trans.months, apy, maxAmount: 50000, lockUntil: lockDate }).save();
      }
    } else if (type === 'withdrawal') {
      const inv = await Investment.findById(trans.investmentId);
      if (inv) {
        inv.currentAmount -= Number(amount);
        if (inv.currentAmount <= 0) inv.status = 'closed';
        await inv.save();
      }
    }
    await Transaction.findByIdAndUpdate(transId, { status: 'approved' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Approval failed" });
  }
});

app.delete('/api/admin/transactions/:id', async (req, res) => {
  await Transaction.findByIdAndUpdate(req.params.id, { status: 'denied' });
  res.json({ success: true });
});

app.delete('/api/admin/users/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  await Investment.deleteMany({ userId: req.params.id });
  await Transaction.deleteMany({ userId: req.params.id });
  res.json({ success: true });
});

// --- 💼 WALLETS & PROFILES ---
app.get('/api/wallets', async (req, res) => res.json(await Wallet.find()));
app.post('/api/admin/wallets', async (req, res) => {
  const w = new Wallet(req.body);
  await w.save();
  res.json(w);
});

app.get('/api/user/profile/:id', async (req, res) => res.json(await User.findById(req.params.id)));
app.get('/api/investments/user/:userId', async (req, res) => {
  res.json(await Investment.find({ userId: req.params.userId, status: 'active' }).sort({ createdAt: -1 }));
});
app.get('/api/transactions/user/:userId', async (req, res) => {
  res.json(await Transaction.find({ userId: req.params.userId }).sort({ createdAt: -1 }));
});

// --- 📈 DAILY ROI AUTOMATION ---
cron.schedule('0 0 * * *', async () => {
  const activeInvestments = await Investment.find({ status: 'active' });
  for (let investment of activeInvestments) {
    const dailyProfit = investment.currentAmount * (investment.apy / 365 / 100);
    investment.currentAmount += dailyProfit;
    await investment.save();
    await User.findByIdAndUpdate(investment.userId, { $inc: { totalProfit: dailyProfit } });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`>>> SYSTEM READY ON PORT ${PORT}`));