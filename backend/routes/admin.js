const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction');
const User = require('../models/user');
const GameHistory = require('../models/gameHistory');
const MatchRevenueWithdrawal = require('../models/matchRevenueWithdrawal');
const { adminMiddleware } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');
const { logBalanceChange, logTransaction } = require('../utils/auditLogger');

// Get all pending transactions
router.get('/transactions/pending', adminLimiter, adminMiddleware, async (req, res) => {
    try {
        const transactions = await Transaction.find({ status: 'pending' })
            .populate('userId', 'username email phone balance')
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
            .populate('userId', 'username email phone balance')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve transaction
router.post('/transactions/:id/approve', adminLimiter, adminMiddleware, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        if (transaction.status !== 'pending') {
            return res.status(400).json({ error: 'Transaction is not pending' });
        }
        
        // Check if user exists
        const transactionUser = await User.findById(transaction.userId);
        if (!transactionUser) {
            return res.status(404).json({ error: 'User not found for this transaction' });
        }
        
        if (transaction.type === 'deposit') {
            // Increase user balance
            const balanceBefore = transactionUser.balance;
            console.log(`Deposit approval: User ${transactionUser.username} balance before: $${balanceBefore}`);
            
            await User.findByIdAndUpdate(transaction.userId, {
                $inc: { balance: transaction.amount }
            });
            
            const userAfter = await User.findById(transaction.userId);
            const balanceAfter = userAfter.balance;
            console.log(`Deposit approval: User ${userAfter.username} balance after: $${balanceAfter} (added $${transaction.amount})`);
            
            // Audit log
            await logBalanceChange(
                transaction.userId,
                balanceBefore,
                balanceAfter,
                `Deposit approved by admin. Transaction ID: ${transaction._id}`,
                req
            );
        } else if (transaction.type === 'withdrawal') {
            if (transactionUser.balance < transaction.amount) {
                return res.status(400).json({ error: 'User has insufficient balance' });
            }
            
            const balanceBefore = transactionUser.balance;
            console.log(`Withdrawal approval: User ${transactionUser.username} balance before: $${balanceBefore}`);
            await User.findByIdAndUpdate(transaction.userId, {
                $inc: { balance: -transaction.amount }
            });
            
            const userAfter = await User.findById(transaction.userId);
            const balanceAfter = userAfter.balance;
            console.log(`Withdrawal approval: User ${userAfter.username} balance after: $${balanceAfter} (deducted $${transaction.amount})`);
            
            // Audit log
            await logBalanceChange(
                transaction.userId,
                balanceBefore,
                balanceAfter,
                `Withdrawal approved by admin. Transaction ID: ${transaction._id}`,
                req
            );
        }
        
        transaction.status = 'approved';
        transaction.processedAt = new Date();
        transaction.adminNotes = req.body.adminNotes || '';
        await transaction.save();
        
        // Log transaction approval
        await logTransaction(
            transaction.userId,
            'transaction_approved',
            transaction._id,
            {
                type: transaction.type,
                amount: transaction.amount,
                adminId: req.userId,
                adminNotes: transaction.adminNotes
            },
            req
        );
        
        const updatedTransaction = await Transaction.findById(transaction._id)
            .populate('userId', 'username phone balance');
        
        // Get updated user balance to ensure it's current
        const updatedUser = await User.findById(transaction.userId);
        if (updatedTransaction.userId && updatedUser) {
            updatedTransaction.userId.balance = updatedUser.balance;
        }
        
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
        
        // Log transaction rejection
        await logTransaction(
            transaction.userId,
            'transaction_rejected',
            transaction._id,
            {
                type: transaction.type,
                amount: transaction.amount,
                adminId: req.userId,
                adminNotes: transaction.adminNotes
            },
            req
        );
        
        const updatedTransaction = await Transaction.findById(transaction._id)
            .populate('userId', 'username email phone balance');
        
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
            .populate('winnerId', 'username email')
            .populate('players.userId', 'username email')
            .sort({ completedAt: -1 })
            .limit(parseInt(limit));
        res.json(games);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get individual user statistics
router.get('/users/:userId/stats', adminMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get all games this user played in
        const gamesPlayed = await GameHistory.find({
            'players.userId': userId
        }).populate('winnerId', 'username').sort({ completedAt: -1 });
        
        // Calculate statistics
        const totalGames = gamesPlayed.length;
        const wins = gamesPlayed.filter(game => 
            game.winnerId && game.winnerId._id.toString() === userId
        ).length;
        const losses = totalGames - wins;
        const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;
        
        // Calculate total money won/lost
        let totalWinnings = 0;
        let totalLosses = 0;
        
        gamesPlayed.forEach(game => {
            const playerData = game.players.find(p => 
                p.userId && p.userId.toString() === userId
            );
            
            if (game.winnerId && game.winnerId._id.toString() === userId) {
                totalWinnings += game.winnerPayout || 0;
            } else if (playerData) {
                totalLosses += playerData.betAmount || 0;
            }
        });
        
        res.json({
            totalGames,
            wins,
            losses,
            winRate,
            totalWinnings,
            totalLosses,
            netProfit: totalWinnings - totalLosses,
            recentGames: gamesPlayed.slice(0, 10).map(game => {
                const isWinner = game.winnerId && game.winnerId._id.toString() === userId;
                // Get opponents (other players in the game, excluding the current user)
                const opponents = game.players
                    .filter(p => p.userId && p.userId.toString() !== userId)
                    .map(p => p.username);
                
                return {
                    _id: game._id,
                    completedAt: game.completedAt,
                    betAmount: game.betAmount,
                    totalPot: game.totalPot,
                    isWinner: isWinner,
                    winnerName: game.winnerId ? game.winnerId.username : 'N/A',
                    payout: isWinner ? game.winnerPayout : 0,
                    opponents: opponents,
                    totalPlayers: game.players.length
                };
            })
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get match revenue (10% commission from games)
router.get('/revenue/matches', adminMiddleware, async (req, res) => {
    try {
        const { filter = 'all' } = req.query; // all, today, 7days, 15days, 30days
        
        const now = new Date();
        const startDate = new Date();
        
        let dateFilter = {};
        
        if (filter !== 'all') {
            switch(filter) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case '7days':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case '15days':
                    startDate.setDate(now.getDate() - 15);
                    break;
                case '30days':
                    startDate.setDate(now.getDate() - 30);
                    break;
            }
            dateFilter = { completedAt: { $gte: startDate, $lte: now } };
        }
        
        // Get total revenue for the filtered period (for display)
        // Handle null/undefined platformFee values
        const revenueAggregate = await GameHistory.aggregate([
            { $match: dateFilter },
            { 
                $group: { 
                    _id: null, 
                    totalRevenue: { 
                        $sum: { 
                            $ifNull: ['$platformFee', 0] 
                        } 
                    },
                    totalMatches: { $sum: 1 },
                    totalPot: { 
                        $sum: { 
                            $ifNull: ['$totalPot', 0] 
                        } 
                    }
                }
            }
        ]);
        
        const stats = revenueAggregate[0] || { totalRevenue: 0, totalMatches: 0, totalPot: 0 };
        
        // Get ALL TIME total revenue (for available balance calculation)
        // Handle null/undefined platformFee values
        const allTimeRevenueAggregate = await GameHistory.aggregate([
            { 
                $group: { 
                    _id: null, 
                    totalRevenue: { 
                        $sum: { 
                            $ifNull: ['$platformFee', 0] 
                        } 
                    }
                }
            }
        ]);
        const allTimeRevenue = allTimeRevenueAggregate[0]?.totalRevenue || 0;
        
        // Get total withdrawals (all time, regardless of filter)
        const totalWithdrawals = await MatchRevenueWithdrawal.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const withdrawnAmount = totalWithdrawals[0]?.total || 0;
        
        // Available balance is ALL TIME revenue minus ALL TIME withdrawals
        // If filter is "all", we can use stats.totalRevenue directly, otherwise use allTimeRevenue
        const revenueForBalance = (filter === 'all') ? stats.totalRevenue : allTimeRevenue;
        const availableBalance = revenueForBalance - withdrawnAmount;
        
        // Debug logging
        console.log('Match Revenue Calculation:', {
            filter,
            statsTotalRevenue: stats.totalRevenue,
            allTimeRevenue,
            withdrawnAmount,
            revenueForBalance,
            availableBalance
        });
        
        // Get individual matches for breakdown
        const matches = await GameHistory.find(dateFilter)
            .populate('winnerId', 'username')
            .populate('players.userId', 'username')
            .sort({ completedAt: -1 })
            .limit(100);
        
        res.json({
            totalRevenue: stats.totalRevenue, // Revenue for filtered period
            allTimeRevenue: allTimeRevenue, // All time revenue
            totalMatches: stats.totalMatches,
            totalPot: stats.totalPot,
            totalWithdrawn: withdrawnAmount,
            availableBalance: availableBalance,
            matches: matches.map(match => ({
                _id: match._id,
                completedAt: match.completedAt,
                betAmount: match.betAmount || 0,
                totalPot: match.totalPot || 0,
                platformFee: match.platformFee || 0,
                winner: match.winnerId?.username || 'N/A',
                players: match.players.map(p => p.username)
            }))
        });
    } catch (error) {
        console.error('Get match revenue error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get accounting ledger for match revenue
router.get('/revenue/matches/ledger', adminMiddleware, async (req, res) => {
    try {
        // Get all match revenue (all time)
        const allTimeRevenueAggregate = await GameHistory.aggregate([
            { 
                $group: { 
                    _id: null, 
                    totalRevenue: { 
                        $sum: { 
                            $ifNull: ['$platformFee', 0] 
                        } 
                    }
                }
            }
        ]);
        const totalRevenue = allTimeRevenueAggregate[0]?.totalRevenue || 0;

        // Get all withdrawals (expenses)
        const totalWithdrawals = await MatchRevenueWithdrawal.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalExpenses = totalWithdrawals[0]?.total || 0;

        // Get all matches for revenue entries
        const matches = await GameHistory.find()
            .populate('winnerId', 'username')
            .sort({ completedAt: -1 })
            .limit(500);

        // Get all withdrawals for expense entries
        const withdrawals = await MatchRevenueWithdrawal.find()
            .populate('processedBy', 'username')
            .sort({ createdAt: -1 })
            .limit(500);

        // Create ledger entries
        const ledgerEntries = [];

        // Add revenue entries (matches)
        matches.forEach(match => {
            if (match.platformFee && match.platformFee > 0) {
                ledgerEntries.push({
                    date: match.completedAt,
                    type: 'revenue',
                    description: `Match Revenue - $${(match.betAmount || 0).toFixed(2)} bet, Winner: ${match.winnerId?.username || 'N/A'}`,
                    amount: match.platformFee,
                    reference: `Match-${match._id}`,
                    category: 'Match Commission'
                });
            }
        });

        // Add expense entries (withdrawals)
        withdrawals.forEach(withdrawal => {
            ledgerEntries.push({
                date: withdrawal.createdAt,
                type: 'expense',
                description: `Withdrawal - ${withdrawal.recipientName} (${withdrawal.phoneNumber})`,
                amount: withdrawal.amount,
                reference: `WD-${withdrawal._id}`,
                category: 'Match Revenue Withdrawal',
                processedBy: withdrawal.processedBy?.username || 'N/A',
                notes: withdrawal.notes || ''
            });
        });

        // Sort by date (newest first)
        ledgerEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            totalRevenue,
            totalExpenses,
            netBalance: totalRevenue - totalExpenses,
            ledgerEntries,
            summary: {
                revenueCount: matches.length,
                expenseCount: withdrawals.length,
                totalEntries: ledgerEntries.length
            }
        });
    } catch (error) {
        console.error('Get accounting ledger error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get match revenue withdrawal history
router.get('/revenue/matches/withdrawals', adminMiddleware, async (req, res) => {
    try {
        const withdrawals = await MatchRevenueWithdrawal.find()
            .populate('processedBy', 'username')
            .sort({ createdAt: -1 })
            .limit(100);
        
        // Always return an array, even if empty
        res.json(withdrawals || []);
    } catch (error) {
        console.error('Get match revenue withdrawals error:', error);
        // Return empty array instead of error to prevent frontend issues
        res.json([]);
    }
});

// Create match revenue withdrawal
router.post('/revenue/matches/withdraw', adminLimiter, adminMiddleware, async (req, res) => {
    try {
        const { amount, phoneNumber, recipientName, notes } = req.body;
        
        // Validate amount
        const parsedAmount = parseFloat(amount);
        if (!amount || isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }
        
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        
        if (!recipientName || typeof recipientName !== 'string') {
            return res.status(400).json({ error: 'Recipient name is required' });
        }
        
        // Get total revenue and total withdrawals
        const revenueAggregate = await GameHistory.aggregate([
            { $group: { _id: null, totalRevenue: { $sum: '$platformFee' } } }
        ]);
        const totalRevenue = revenueAggregate[0]?.totalRevenue || 0;
        
        const withdrawalsAggregate = await MatchRevenueWithdrawal.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalWithdrawn = withdrawalsAggregate[0]?.total || 0;
        const availableBalance = totalRevenue - totalWithdrawn;
        
        // Check if withdrawal amount is available
        if (parsedAmount > availableBalance) {
            return res.status(400).json({ 
                error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}` 
            });
        }
        
        // Create withdrawal record
        const withdrawal = new MatchRevenueWithdrawal({
            amount: parsedAmount,
            phoneNumber: phoneNumber.trim(),
            recipientName: recipientName.trim(),
            notes: notes?.trim() || '',
            processedBy: req.userId,
            processedAt: new Date()
        });
        
        await withdrawal.save();
        
        // Log the withdrawal
        await logTransaction(
            req.userId,
            'match_revenue_withdrawal',
            withdrawal._id,
            {
                amount: parsedAmount,
                phoneNumber: phoneNumber.trim(),
                recipientName: recipientName.trim(),
                availableBalanceBefore: availableBalance,
                availableBalanceAfter: availableBalance - parsedAmount
            },
            req
        );
        
        const populatedWithdrawal = await MatchRevenueWithdrawal.findById(withdrawal._id)
            .populate('processedBy', 'username');
        
        res.json({ 
            message: 'Withdrawal recorded successfully', 
            withdrawal: populatedWithdrawal,
            newAvailableBalance: availableBalance - parsedAmount
        });
    } catch (error) {
        console.error('Match revenue withdrawal error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

