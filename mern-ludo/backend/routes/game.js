const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// Set userId in game session
router.post('/set-session', authMiddleware, async (req, res) => {
    try {
        // Store userId in session for game access
        req.session.userId = req.userId;
        req.session.username = req.user.username;
        
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        console.log(`✅ Game session set for user: ${req.user.username} (ID: ${req.userId})`);
        
        res.json({
            success: true,
            message: 'Session linked to wallet',
            userId: req.userId,
            username: req.user.username
        });
    } catch (error) {
        console.error('Set session error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get current session info
router.get('/session-info', (req, res) => {
    res.json({
        userId: req.session.userId || null,
        username: req.session.username || null,
        hasSession: !!req.session.userId
    });
});

module.exports = router;

