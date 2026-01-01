require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const cron = require('node-cron'); 
const logger = require('./logger'); // <--- Import our new logger

const app = express();
app.use(express.json());

app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://aureus-capital.onrender.com'
  ],
  credentials: true
}));

// --- 🛡️ DATABASE CONNECTION (WITH POOLING) ---
const connectionOptions = {
  dbName: 'aureus_capital',
  maxPoolSize: 10,       // Handles up to 10 concurrent heavy tasks
  minPoolSize: 2,        // Keeps 2 connections "warm" at all times
  socketTimeoutMS: 45000,// Close sockets after 45s of inactivity
  serverSelectionTimeoutMS: 5000 // Stop trying to connect after 5s
};

mongoose.connect(process.env.MONGO_URI, connectionOptions)
.then(() => {
  logger.info('SYSTEM ONLINE', { 
    host: mongoose.connection.host, 
    db: mongoose.connection.name 
  });
})
.catch(err => logger.error('DATABASE CONNECTION FAILED', err));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { 
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS 
  }
});

// --- 🏗️ SCHEMAS (KEPT EXACT) ---
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
  res.json({ 
    status: '🚀 AUREUS API ONLINE', 
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
    logger.error('Registration error', err);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).send("Invalid Credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const { password, ...userData } = user._doc;
      res.json({ user: userData });
    } else {
      res.status(400).send("Invalid Credentials");
    }
  } catch (err) {
    logger.error('Login error', err);
    res.status(500).send("Login error");
  }
});

// --- 💸 TRANSACTIONS ---
app.post('/api/transactions/request', async (req, res) => {
  const { userId, amount, type, planName, targetWallet, userWallet, months, parentStructId } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (type === 'withdrawal') {
      const investment = await Investment.findById(parentStructId);
      if (!investment) return res.status(404).json({ error: "Investment not found" });
      if (new Date() < new Date(investment.lockUntil)) {
        return res.status(403).json({ success: false, message: "PROTOCOL REJECTED: Investment not mature." });
      }

      const trans = new Transaction({ userId, investmentId: parentStructId, amount, type: 'withdrawal', userWallet });
      await trans.save();
      // Background email
      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `🚨 WITHDRAWAL REQUEST: $${amount} - ${user.fullName}`,
        html: `<p>USER: ${user.fullName}</p><p>AMOUNT: $${amount}</p>`
      }).catch(e => logger.error("Withdrawal Email Failed", e));

      return res.json({ success: true });
    }

    const trans = new Transaction({ userId, amount, type: 'deposit', planName, targetWallet, months, investmentId: parentStructId || null });
    await trans.save();
    
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `🚨 DEPOSIT REQUEST: $${amount} - ${user.fullName}`,
      html: `<p>USER: ${user.fullName}</p><p>PLAN: ${planName}</p>`
    }).catch(e => logger.error("Deposit Email Failed", e));

    res.json({ success: true });
  } catch (err) { 
    logger.error('Transaction request failed', err);
    res.status(500).send("Internal Transmission Error"); 
  }
});

// --- 💼 WALLETS & PROFILES ---
app.get('/api/wallets', async (req, res) => res.json(await Wallet.find()));
app.get('/api/user/profile/:id', async (req, res) => res.json(await User.findById(req.params.id)));
app.get('/api/investments/user/:userId', async (req, res) => {
  const inv = await Investment.find({ userId: req.params.userId, status: 'active' }).sort({ createdAt: -1 });
  res.json(inv);
});

// --- 📈 DAILY ROI AUTOMATION (WITH LOGGING) ---
cron.schedule('0 0 * * *', async () => {
  logger.cron('Starting Daily ROI Calculation...');
  try {
    const activeInvestments = await Investment.find({ status: 'active' });
    let count = 0;

    for (let investment of activeInvestments) {
      const dailyRate = investment.apy / 365 / 100;
      const dailyProfit = investment.currentAmount * dailyRate;
      
      investment.currentAmount += dailyProfit;
      investment.lastProfitUpdate = new Date();
      await investment.save();
      
      await User.findByIdAndUpdate(investment.userId, { $inc: { totalProfit: dailyProfit } });
      count++;
    }
    logger.cron(`ROI Complete. Updated ${count} accounts.`);
  } catch (err) {
    logger.error('CRON JOB FAILED', err);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`SYSTEM READY ON PORT ${PORT}`));