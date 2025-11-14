const express = require('express');
const router = express.Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { logAuth } = require('../utils/auditLogger');

// JWT Secret validation
if (!process.env.JWT_SECRET) {
    console.error('🔴 CRITICAL: JWT_SECRET is not set in environment variables!');
}
const JWT_SECRET = process.env.JWT_SECRET || 'INSECURE_FALLBACK_KEY_CHANGE_THIS';

// Register
router.post('/register', authLimiter, async (req, res) => {
    try {
        const { username, phone, password } = req.body;
        
        if (!username || !phone || !password) {
            return res.status(400).json({ error: 'Username, phone and password are required' });
        }
        
        const existingUser = await User.findOne({ $or: [{ phone }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this phone or username' });
        }
        
        const user = new User({ username, phone, password });
        await user.save();
        
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
        
        // Log successful registration
        await logAuth(user._id, 'register', 'success', { username: user.username, phone: user.phone }, req);
        
        res.json({ 
            token, 
            user: { 
                id: user._id, 
                username: user.username, 
                phone: user.phone,
                balance: user.balance,
                isAdmin: user.isAdmin,
                isSuperAdmin: user.isSuperAdmin
            } 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
    try {
        console.log('Login attempt received:', { phone: req.body.phone, hasPassword: !!req.body.password });
        
        const { phone, password } = req.body;
        
        if (!phone || !password) {
            console.log('Missing credentials');
            return res.status(400).json({ error: 'Phone and password are required' });
        }
        
        console.log('Looking for user with phone:', phone);
        const user = await User.findOne({ phone });
        
        if (!user) {
            console.log('User not found');
            await logAuth(null, 'login_failed', 'failed', { phone, reason: 'User not found' }, req);
            return res.status(401).json({ error: 'Invalid phone or password' });
        }
        
        console.log('User found:', user.username);
        const passwordMatch = await user.comparePassword(password);
        console.log('Password match:', passwordMatch);
        
        if (!passwordMatch) {
            await logAuth(user._id, 'login_failed', 'failed', { phone, reason: 'Invalid password' }, req);
            return res.status(401).json({ error: 'Invalid phone or password' });
        }
        
        if (!user.isActive) {
            return res.status(403).json({ error: 'Account is inactive. Contact administrator.' });
        }
        
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
        
        // Log successful login
        await logAuth(user._id, 'login_success', 'success', { username: user.username, phone }, req);
        
        console.log('Login successful for:', user.username);
        res.json({ 
            token, 
            user: { 
                id: user._id, 
                username: user.username, 
                phone: user.phone,
                balance: user.balance,
                isAdmin: user.isAdmin,
                isSuperAdmin: user.isSuperAdmin
            } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get balance
router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        res.json({ balance: user.balance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

