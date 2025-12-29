// server.js ....
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

// --- 📧 MAIL ENGINE (FIXES CONNECTION TIMEOUT) ---
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Required for 587
  auth: { 
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS 
  },
  tls: {
    // This is critical for Render; it prevents the SSL handshake from 
    // hanging due to internal proxy delays
    rejectUnauthorized: false,
    minVersion: "TLSv1.2"
  },
  connectionTimeout: 15000, // Kill the attempt if no answer in 15 seconds
  socketTimeout: 15000
});

// THIS WILL PRINT THE TRUTH IN YOUR LOGS ON STARTUP
transporter.verify((error, success) => {
  if (error) {
    console.log("❌ MAIL OFFLINE:", error.message);
  } else {
    console.log("✅ MAIL ONLINE: Protocol Ledger Alerts Active.");
  }
});

// --- 🏗️ SCHEMAS ---
const User = mongoose.model('User', new mongoose.Schema({
  fullName: String, 
  email: { type: String, unique: true }, 
  password: String, 
  totalProfit: { type: Number, default: 0 },
  role: { type: String, default: 'investor' }
}));

const InvestmentSchema = new mongoose.Schema({
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
});
const Investment = mongoose.model('Investment', InvestmentSchema);

const TransactionSchema = new mongoose.Schema({
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
});
const Transaction = mongoose.model('Transaction', TransactionSchema);

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
    if (await User.findOne({ email: cleanEmail })) return res.status(400).json({ message: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ fullName, email: cleanEmail, password: hashedPassword });
    await user.save();
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ error: "Registration failed" }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).send("Invalid Credentials");
    const { password: _, ...userData } = user._doc;
    res.json({ user: userData });
  } catch (err) { res.status(500).send("Login error"); }
});

// --- 💸 TRANSACTION REQUESTS (FIXED HANGING & EMAIL) ---
app.post('/api/transactions/request', async (req, res) => {
  const { userId, amount, type, planName, targetWallet, userWallet, months, parentStructId } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    let transData = { userId, amount, type, createdAt: new Date() };

    if (type === 'withdrawal') {
      const investment = await Investment.findById(parentStructId);
      if (!investment || new Date() < new Date(investment.lockUntil)) {
        return res.status(403).json({ success: false, message: "PROTOCOL REJECTED: Investment not mature." });
      }
      transData.investmentId = parentStructId;
      transData.userWallet = userWallet;
    } else {
      transData.planName = planName;
      transData.targetWallet = targetWallet;
      transData.months = months;
      transData.investmentId = parentStructId || null;
    }

    const trans = new Transaction(transData);
    await trans.save();

    // ⚡ RESPOND IMMEDIATELY TO KILL THE LOADING SCREEN
    res.json({ success: true });

    // 📧 BACKGROUND EMAIL (NO AWAIT SO IT DOESN'T HANG)
    const actionLabel = type === 'withdrawal' ? 'WITHDRAWAL' : (parentStructId ? 'TOP-UP' : 'NEW DEPOSIT');
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `🚨 ${actionLabel} REQUEST: $${amount} - ${user.fullName}`,
      html: `<div style="background:#000;color:#fff;padding:20px;border:1px solid #fbbf24;">
              <h2 style="color:#fbbf24">AUREUS LEDGER ALERT</h2>
              <p>USER: ${user.fullName}</p><p>EMAIL: ${user.email}</p>
              <p>TYPE: ${actionLabel}</p><p>AMOUNT: $${amount}</p>
            </div>`
    }).catch(e => console.error("MAIL ERROR:", e.message));

  } catch (err) { console.error(err); if(!res.headersSent) res.status(500).send("Transmission Error"); }
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
      const maxAmountMap = { 3: 5000, 6: 10000, 12: 50000 };
      if (trans.investmentId) {
        await Investment.findByIdAndUpdate(trans.investmentId, { $inc: { currentAmount: Number(amount) } });
      } else {
        const lockDate = new Date(); lockDate.setMonth(lockDate.getMonth() + trans.months);
        await new Investment({ 
          userId, currentAmount: Number(amount), planType: trans.planName, planDuration: trans.months, 
          apy: apyMap[trans.planName] || 12, maxAmount: maxAmountMap[trans.months] || 5000, 
          lockUntil: lockDate, startDate: new Date() 
        }).save();
      }
    } else if (type === 'withdrawal') {
      const inv = await Investment.findById(trans.investmentId);
      if (inv) { inv.currentAmount -= Number(amount); if (inv.currentAmount <= 0) inv.status = 'closed'; await inv.save(); }
    }
    await Transaction.findByIdAndUpdate(transId, { status: 'approved' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Approval failed" }); }
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
app.post('/api/admin/wallets', async (req, res) => { const w = new Wallet(req.body); await w.save(); res.json(w); });
app.delete('/api/admin/wallets/:id', async (req, res) => { await Wallet.findByIdAndDelete(req.params.id); res.json({ success: true }); });
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
    investment.lastProfitUpdate = new Date();
    await investment.save();
    await User.findByIdAndUpdate(investment.userId, { $inc: { totalProfit: dailyProfit } });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`>>> SYSTEM READY ON PORT ${PORT}`));