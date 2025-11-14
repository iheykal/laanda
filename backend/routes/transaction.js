const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction');
const User = require('../models/user');
const { authMiddleware } = require('../middleware/auth');
const { transactionLimiter } = require('../middleware/rateLimiter');
const { logTransaction } = require('../utils/auditLogger');

// Request deposit
router.post('/deposit', transactionLimiter, authMiddleware, async (req, res) => {
    try {
        const { amount, phoneNumber, senderName, transactionId, proofImage, notes } = req.body;
        
        // Enhanced validation for amount
        const parsedAmount = parseFloat(amount);
        if (!amount || isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }
        
        // Security: Set reasonable limits
        const MIN_DEPOSIT = 0.01;
        const MAX_DEPOSIT = 10000;
        if (parsedAmount < MIN_DEPOSIT) {
            return res.status(400).json({ error: `Minimum deposit is $${MIN_DEPOSIT}` });
        }
        if (parsedAmount > MAX_DEPOSIT) {
            return res.status(400).json({ error: `Maximum deposit is $${MAX_DEPOSIT}. Contact admin for larger amounts.` });
        }
        
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        
        if (!senderName || typeof senderName !== 'string') {
            return res.status(400).json({ error: 'Sender name is required' });
        }
        
        const transaction = new Transaction({
            userId: req.userId,
            type: 'deposit',
            amount: parsedAmount,
            phoneNumber: phoneNumber.trim(),
            senderName: senderName.trim(),
            transactionId: transactionId?.trim() || '',
            proofImage,
            notes: notes?.trim() || '',
            status: 'pending'
        });
        
        await transaction.save();
        
        // Log deposit request
        await logTransaction(
            req.userId,
            'deposit_request',
            transaction._id,
            {
                amount: parsedAmount,
                phoneNumber: phoneNumber.trim(),
                senderName: senderName.trim()
            },
            req
        );
        
        res.json({ 
            message: 'Deposit request submitted successfully. Wait for admin approval.', 
            transaction 
        });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Request withdrawal
router.post('/withdrawal', transactionLimiter, authMiddleware, async (req, res) => {
    try {
        const { amount, phoneNumber, recipientName } = req.body;
        
        // Enhanced validation for amount
        const parsedAmount = parseFloat(amount);
        if (!amount || isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }
        
        // Security: Set reasonable limits
        const MIN_WITHDRAWAL = 1;
        const MAX_WITHDRAWAL = 10000;
        if (parsedAmount < MIN_WITHDRAWAL) {
            return res.status(400).json({ error: `Minimum withdrawal is $${MIN_WITHDRAWAL}` });
        }
        if (parsedAmount > MAX_WITHDRAWAL) {
            return res.status(400).json({ error: `Maximum withdrawal is $${MAX_WITHDRAWAL}. Contact admin for larger amounts.` });
        }
        
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        
        if (!recipientName || typeof recipientName !== 'string') {
            return res.status(400).json({ error: 'Recipient name is required' });
        }
        
        const user = await User.findById(req.userId);
        
        if (user.balance < parsedAmount) {
            return res.status(400).json({ error: `Insufficient balance. You have $${user.balance.toFixed(2)}` });
        }
        
        const transaction = new Transaction({
            userId: req.userId,
            type: 'withdrawal',
            amount: parsedAmount,
            phoneNumber: phoneNumber.trim(),
            recipientName: recipientName.trim(),
            status: 'pending'
        });
        
        await transaction.save();
        
        // Log withdrawal request
        await logTransaction(
            req.userId,
            'withdrawal_request',
            transaction._id,
            {
                amount: parsedAmount,
                phoneNumber: phoneNumber.trim(),
                recipientName: recipientName.trim()
            },
            req
        );
        
        res.json({ 
            message: 'Withdrawal request submitted successfully. Admin will process it soon.', 
            transaction 
        });
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user's transactions
router.get('/my-transactions', authMiddleware, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.userId })
            .sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single transaction
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const transaction = await Transaction.findOne({ 
            _id: req.params.id, 
            userId: req.userId 
        });
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

