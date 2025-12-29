require('dotenv').config({ path: '../.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  role: { type: String, default: 'user', enum: ['user', 'admin'] }
});

const walletSchema = new mongoose.Schema({
  name: String, // BTC, ETH, USDT, USDC
  address: String
});

const depositRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  cryptoType: String,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Wallet = mongoose.model('Wallet', walletSchema);
const Deposit = mongoose.model('Deposit', depositRequestSchema);

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ VAULT ONLINE'));

// --- AUTH & PROFILE ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).send("Denied");
  res.json({ user: { id: user._id, fullName: user.fullName, role: user.role } });
});

app.get('/api/user/profile/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  res.json(user);
});

// --- DEPOSIT SYSTEM ---
app.get('/api/wallets', async (req, res) => res.json(await Wallet.find()));
app.post('/api/deposits/request', async (req, res) => {
  const deposit = new Deposit(req.body);
  await deposit.save();
  res.json({ message: "Request sent" });
});

// --- ADMIN OVERSIGHT ---
app.get('/api/admin/users', async (req, res) => res.json(await User.find().select('-password')));
app.get('/api/admin/pending-deposits', async (req, res) => {
  res.json(await Deposit.find({ status: 'pending' }).populate('userId', 'fullName email'));
});
app.post('/api/admin/wallets', async (req, res) => {
  const wallet = new Wallet(req.body);
  await wallet.save();
  res.json(wallet);
});
app.post('/api/admin/approve-deposit', async (req, res) => {
  const { depositId, userId, amount } = req.body;
  await User.findByIdAndUpdate(userId, { $inc: { balance: parseFloat(amount) } });
  await Deposit.findByIdAndUpdate(depositId, { status: 'approved' });
  res.json({ message: "Approved" });
});

app.listen(5000, () => console.log('🚀 ENGINE PORT 5000'));