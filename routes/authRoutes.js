import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Please provide name, email, and password.' });
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered.' });
    const zones = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center-left', 'center-right', 'inline'];
    const randomZone = zones[Math.floor(Math.random() * zones.length)];
    const user = await User.create({ name, email, password, layoutZone: randomZone });
    
    // Log registration activity
    try {
      await (await import('../models/Activity.js')).default.create({
        userId: user._id,
        userName: user.name,
        status: 'success',
        metadata: { type: 'registration' }
      });
    } catch (actErr) {
      console.warn('Failed to log registration activity:', actErr.message);
    }

    res.status(201).json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role, layoutZone: user.layoutZone },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Please provide email and password.' });
  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid email or password.' });
    res.json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role, layoutZone: user.layoutZone },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({
    user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, layoutZone: req.user.layoutZone },
  });
});

export default router;
