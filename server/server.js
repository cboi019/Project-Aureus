require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const cron = require('node-cron'); 
const logger = require('./logger');

const app = express();
app.use(express.json());

// 🛡️ UPDATED CORS: Added common Render patterns to prevent "Failed to Fetch"
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://aureus-capital.onrender.com',
    /\.onrender\.com$/ // This allows any sub-branch of your render domain to connect
  ],
  credentials: true
}));

const connectionOptions = {
  dbName: 'aureus_capital',
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000
};

mongoose.connect(process.env.MONGO_URI, connectionOptions)
.then(() => logger.info('SYSTEM ONLINE', { host: mongoose.connection.host, db: mongoose.connection.name }))
.catch(err => logger.error('DATABASE CONNECTION FAILED', err));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
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

// --- 🏥 HEALTH ---
app.get('/', (req, res) => res.json({ status: '🚀 AUREUS API ONLINE' }));

// --- 🔐 AUTH ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    if (await User.findOne({ email: cleanEmail })) return res.status(400).json({ message: "Exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ fullName, email: cleanEmail, password: hashedPassword });
    await user.save();
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ error: "Fail" }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...userData } = user._doc;
      return res.json({ user: userData });
    }
    res.status(400).send("Invalid");
  } catch (err) { res.status(500).send("Error"); }
});

// --- 💸 USER TRANSACTIONS ---
app.get('/api/transactions/user/:userId', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    logger.error('Failed to fetch user transactions', err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/api/transactions/request', async (req, res) => {
  const { userId, amount, type, planName, targetWallet, userWallet, months, parentStructId } = req.body;
  try {
    const user = await User.findById(userId);
    const trans = new Transaction({ 
      userId, amount, type, planName, targetWallet, userWallet, months, 
      investmentId: parentStructId || null 
    });
    await trans.save();
    
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `🚨 ${type.toUpperCase()} REQUEST: $${amount}`,
      html: `<p>User: ${user.fullName}</p><p>Amount: $${amount}</p>`
    }).catch(e => logger.error("Email Fail", e));

    res.json({ success: true });
  } catch (err) { res.status(500).send("Error"); }
});

app.get('/api/investments/user/:userId', async (req, res) => {
  res.json(await Investment.find({ userId: req.params.userId, status: 'active' }).sort({ createdAt: -1 }));
});

// --- 🛠️ RESTORED ADMIN API (THE MISSING PIECE) ---
app.get('/api/admin/users', async (req, res) => {
  res.json(await User.find({ role: 'investor' }));
});

app.get('/api/admin/pending-transactions', async (req, res) => {
  res.json(await Transaction.find({ status: 'pending' }).populate('userId', 'fullName email'));
});

app.post('/api/admin/approve-transaction', async (req, res) => {
  const { transId, userId, amount, type, planName, months } = req.body;
  try {
    const trans = await Transaction.findById(transId);
    if (!trans) return res.status(404).send("Not found");

    if (type === 'deposit') {
      const apyMap = { 'SILVER TIER': 12, 'GOLD TIER': 24, 'DIAMOND TIER': 40 };
      const maxMap = { 'SILVER TIER': 5000, 'GOLD TIER': 10000, 'DIAMOND TIER': 50000 };
      
      if (trans.investmentId) {
        await Investment.findByIdAndUpdate(trans.investmentId, { $inc: { currentAmount: amount } });
      } else {
        const lockDate = new Date();
        lockDate.setMonth(lockDate.getMonth() + (months || 3));
        const newInv = new Investment({
          userId, currentAmount: amount, planType: planName, 
          planDuration: months, apy: apyMap[planName], 
          maxAmount: maxMap[planName], lockUntil: lockDate
        });
        await newInv.save();
      }
    } else if (type === 'withdrawal') {
      await Investment.findByIdAndUpdate(trans.investmentId, { status: 'withdrawn' });
    }

    await Transaction.findByIdAndUpdate(transId, { status: 'approved' });
    res.json({ success: true });
  } catch (err) { logger.error('Approve failed', err); res.status(500).send(err); }
});

// Changed from .delete to .post so we keep the record for the Ledger
app.post('/api/admin/deny-transaction', async (req, res) => {
  try {
    const { transId } = req.body; // Ensure your frontend sends 'transId' in the body
    
    // Instead of deleting, we change the status to 'denied'
    const updatedTx = await Transaction.findByIdAndUpdate(
      transId, 
      { status: 'denied' }, 
      { new: true }
    );
    
    if (!updatedTx) return res.status(404).send("Transaction not found");

    logger.info(`ADMIN ACTION: Transaction ${transId} marked as DENIED.`);
    res.json({ success: true, message: "Transaction denied and recorded." });
  } catch (err) {
    logger.error('DENY ERROR:', err);
    res.status(500).send("Internal Error");
  }
});

// Wallet Management
app.get('/api/wallets', async (req, res) => res.json(await Wallet.find()));
app.post('/api/admin/wallets', async (req, res) => {
  const wallet = new Wallet(req.body);
  await wallet.save();
  res.json(wallet);
});
app.delete('/api/admin/wallets/:id', async (req, res) => {
  await Wallet.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get('/api/user/profile/:id', async (req, res) => res.json(await User.findById(req.params.id)));

// --- 📈 AUTOMATION ---
cron.schedule('0 0 * * *', async () => {
  try {
    const active = await Investment.find({ status: 'active' });
    for (let inv of active) {
      const daily = (inv.currentAmount * (inv.apy / 365 / 100));
      inv.currentAmount += daily;
      inv.lastProfitUpdate = new Date();
      await inv.save();
      await User.findByIdAndUpdate(inv.userId, { $inc: { totalProfit: daily } });
    }
    logger.cron('ROI Updated');
  } catch (err) { logger.error('Cron Failed', err); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`SYSTEM READY ON PORT ${PORT}`));