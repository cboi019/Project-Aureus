require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const cron = require('node-cron'); 

const app = express();
app.use(express.json());

// 2. Restricted CORS for security (replace with your frontend URL later)
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://aureus-capital.onrender.com' // YOUR RENDER FRONTEND URL
  ],
  credentials: true
}));

// --- 🛡️ DATABASE CONNECTION (STRICTLY ADDED POOLING ONLY) ---
const connectionOptions = {
  dbName: 'aureus_capital',
  maxPoolSize: 10,             // Allows up to 10 simultaneous database pipes
  minPoolSize: 2,              // Keeps 2 pipes open at all times for speed
  socketTimeoutMS: 45000,      // Prevents "hanging" requests from crashing the server
  serverSelectionTimeoutMS: 5000
};

mongoose.connect(process.env.MONGO_URI, connectionOptions)
.then(() => {
  console.log('>>> 🚀 SYSTEM ONLINE');
  console.log('>>> 📍 CLUSTER:', mongoose.connection.host);
  console.log('>>> 📂 DATABASE:', mongoose.connection.name);
})
.catch(err => console.error('❌ DATABASE ERROR:', err.message));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { 
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS 
  }
});

// --- 🏗️ SCHEMAS (KEPT EXACTLY AS PROVIDED) ---
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

// --- 🏥 HEALTH CHECK ROUTE ---
app.get('/', (req, res) => {
  res.json({ 
    status: '🚀 AUREUS API ONLINE', 
    message: 'Backend is running successfully',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
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
    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(400).send("Invalid Credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const { password, ...userData } = user._doc;
      res.json({ user: userData });
    } else {
      res.status(400).send("Invalid Credentials");
    }
  } catch (err) {
    res.status(500).send("Login error");
  }
});

// --- 💸 TRANSACTIONS & INVESTMENT MANAGEMENT ---
app.post('/api/transactions/request', async (req, res) => {
  const { userId, amount, type, planName, targetWallet, userWallet, months, parentStructId } = req.body;
  
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (type === 'withdrawal') {
      const investment = await Investment.findById(parentStructId);
      if (!investment) return res.status(404).json({ error: "Investment not found" });
      
      if (new Date() < new Date(investment.lockUntil)) {
        return res.status(403).json({ 
          success: false, 
          message: "PROTOCOL REJECTED: Investment not mature." 
        });
      }

      const trans = new Transaction({ 
        userId, 
        investmentId: parentStructId,
        amount, 
        type: 'withdrawal',
        userWallet 
      });
      await trans.save();

      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `🚨 WITHDRAWAL REQUEST: $${amount} - ${user.fullName}`,
        html: `<div style="background:#000;color:#fff;padding:20px;border:1px solid #fbbf24;">
                <h2 style="color:#fbbf24">AUREUS WITHDRAWAL ALERT</h2>
                <p>USER: ${user.fullName}</p>
                <p>EMAIL: ${user.email}</p>
                <p>AMOUNT: $${amount}</p>
                <p>WALLET: ${userWallet}</p>
              </div>`
      });

      return res.json({ success: true });
    }

    const trans = new Transaction({ 
      userId, 
      amount, 
      type: 'deposit',
      planName, 
      targetWallet, 
      months,
      investmentId: parentStructId || null
    });
    await trans.save();

    const actionType = parentStructId ? 'TOP-UP' : 'NEW DEPOSIT';
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `🚨 ${actionType} REQUEST: $${amount} - ${user.fullName}`,
      html: `<div style="background:#000;color:#fff;padding:20px;border:1px solid #fbbf24;">
              <h2 style="color:#fbbf24">AUREUS LEDGER ALERT</h2>
              <p>USER: ${user.fullName}</p>
              <p>EMAIL: ${user.email}</p>
              <p>TYPE: ${actionType}</p>
              <p>PLAN: ${planName}</p>
              <p>DURATION: ${months} months</p>
              <p>AMOUNT: $${amount}</p>
              <p>TARGET WALLET: ${targetWallet}</p>
            </div>`
    });

    res.json({ success: true });
  } catch (err) { 
    console.error(err);
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
      const maxAmountMap = { 3: 5000, 6: 10000, 12: 50000 };
      const apy = apyMap[trans.planName] || 12;
      const maxAmount = maxAmountMap[trans.months] || 5000;

      if (trans.investmentId) {
        const investment = await Investment.findById(trans.investmentId);
        if (investment) {
          investment.currentAmount += Number(amount);
          await investment.save();
        }
      } else {
        const lockDate = new Date();
        lockDate.setMonth(lockDate.getMonth() + trans.months);

        const investment = new Investment({
          userId,
          currentAmount: Number(amount),
          planType: trans.planName,
          planDuration: trans.months,
          apy,
          maxAmount,
          lockUntil: lockDate,
          startDate: new Date()
        });
        await investment.save();
      }
      await Transaction.findByIdAndUpdate(transId, { status: 'approved' });
    } 
    else if (type === 'withdrawal') {
      const investment = await Investment.findById(trans.investmentId);
      if (investment) {
        investment.currentAmount -= Number(amount);
        if (investment.currentAmount <= 0) investment.status = 'closed';
        await investment.save();
      }
      await Transaction.findByIdAndUpdate(transId, { status: 'approved' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
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

app.delete('/api/admin/wallets/:id', async (req, res) => {
  await Wallet.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get('/api/user/profile/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});

app.get('/api/investments/user/:userId', async (req, res) => {
  const investments = await Investment.find({ 
    userId: req.params.userId,
    status: 'active'
  }).sort({ createdAt: -1 });
  res.json(investments);
});

app.get('/api/transactions/user/:userId', async (req, res) => {
  const transactions = await Transaction.find({ 
    userId: req.params.userId 
  }).sort({ createdAt: -1 });
  res.json(transactions);
});

// --- 📈 DAILY ROI AUTOMATION ---
cron.schedule('0 0 * * *', async () => {
  console.log('>>> Running daily ROI calculation...');
  const activeInvestments = await Investment.find({ status: 'active' });
  
  for (let investment of activeInvestments) {
    const dailyRate = investment.apy / 365 / 100;
    const dailyProfit = investment.currentAmount * dailyRate;
    
    investment.currentAmount += dailyProfit;
    investment.lastProfitUpdate = new Date();
    await investment.save();
    
    await User.findByIdAndUpdate(investment.userId, {
      $inc: { totalProfit: dailyProfit }
    });
  }
  console.log(`>>> Updated ${activeInvestments.length} investments`);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`>>> SYSTEM READY ON PORT ${PORT}`));