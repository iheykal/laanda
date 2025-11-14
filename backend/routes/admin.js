const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction');
const User = require('../models/user');
const GameHistory = require('../models/gameHistory');
const { adminMiddleware } = require('../middleware/auth');

// Get all pending transactions
router.get('/transactions/pending', adminMiddleware, async (req, res) => {
    try {
        const transactions = await Transaction.find({ status: 'pending' })
            .populate('userId', 'username phone balance')
            .sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all transactions (with filters)
router.get('/transactions', adminMiddleware, async (req, res) => {
    try {
        const { status, type, limit = 50 } = req.query;
        const filter = {};
        
        if (status) filter.status = status;
        if (type) filter.type = type;
        
        const transactions = await Transaction.find(filter)
            .populate('userId', 'username phone balance')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve transaction
router.post('/transactions/:id/approve', adminMiddleware, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        if (transaction.status !== 'pending') {
            return res.status(400).json({ error: 'Transaction is not pending' });
        }
        
        if (transaction.type === 'deposit') {
            await User.findByIdAndUpdate(transaction.userId, {
                $inc: { balance: transaction.amount }
            });
        } else if (transaction.type === 'withdrawal') {
            const user = await User.findById(transaction.userId);
            if (user.balance < transaction.amount) {
                return res.status(400).json({ error: 'User has insufficient balance' });
            }
            await User.findByIdAndUpdate(transaction.userId, {
                $inc: { balance: -transaction.amount }
            });
        }
        
        transaction.status = 'approved';
        transaction.processedAt = new Date();
        transaction.adminNotes = req.body.adminNotes || '';
        await transaction.save();
        
        const updatedTransaction = await Transaction.findById(transaction._id)
            .populate('userId', 'username phone balance');
        
        res.json({ 
            message: 'Transaction approved successfully', 
            transaction: updatedTransaction 
        });
    } catch (error) {
        console.error('Approve transaction error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Reject transaction
router.post('/transactions/:id/reject', adminMiddleware, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        if (transaction.status !== 'pending') {
            return res.status(400).json({ error: 'Transaction is not pending' });
        }
        
        transaction.status = 'rejected';
        transaction.processedAt = new Date();
        transaction.adminNotes = req.body.adminNotes || '';
        await transaction.save();
        
        const updatedTransaction = await Transaction.findById(transaction._id)
            .populate('userId', 'username phone balance');
        
        res.json({ 
            message: 'Transaction rejected', 
            transaction: updatedTransaction 
        });
    } catch (error) {
        console.error('Reject transaction error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all users
router.get('/users', adminMiddleware, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get game statistics
router.get('/stats/games', adminMiddleware, async (req, res) => {
    try {
        const totalGames = await GameHistory.countDocuments();
        const totalRevenue = await GameHistory.aggregate([
            { $group: { _id: null, total: { $sum: '$platformFee' } } }
        ]);
        
        res.json({
            totalGames,
            totalRevenue: totalRevenue[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get game history
router.get('/games', adminMiddleware, async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const games = await GameHistory.find()
            .populate('winnerId', 'username phone')
            .populate('players.userId', 'username phone')
            .sort({ completedAt: -1 })
            .limit(parseInt(limit));
        res.json(games);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
