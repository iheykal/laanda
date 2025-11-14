const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Get leaderboard - top players by various metrics
router.get('/', async (req, res) => {
    try {
        const { sortBy = 'wins', limit = 50 } = req.query;
        
        let sortField;
        switch (sortBy) {
            case 'wins':
                sortField = { 'stats.wins': -1 };
                break;
            case 'earnings':
                sortField = { 'stats.totalEarnings': -1 };
                break;
            case 'winRate':
                // Will calculate win rate in code since it's computed field
                sortField = { 'stats.wins': -1 };
                break;
            case 'streak':
                sortField = { 'stats.bestStreak': -1 };
                break;
            case 'games':
                sortField = { 'stats.totalGames': -1 };
                break;
            default:
                sortField = { 'stats.wins': -1 };
        }
        
        const users = await User.find({
            'stats.totalGames': { $gt: 0 }, // Only users who have played
            isActive: true
        })
        .select('username stats createdAt')
        .sort(sortField)
        .limit(parseInt(limit));
        
        // Format leaderboard data with rankings and computed fields
        const leaderboard = users.map((user, index) => {
            const wins = user.stats?.wins || 0;
            const losses = user.stats?.losses || 0;
            const totalGames = user.stats?.totalGames || 0;
            const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;
            
            return {
                rank: index + 1,
                username: user.username,
                wins: wins,
                losses: losses,
                totalGames: totalGames,
                winRate: parseFloat(winRate),
                totalEarnings: user.stats?.totalEarnings || 0,
                totalWagered: user.stats?.totalWagered || 0,
                currentStreak: user.stats?.currentStreak || 0,
                bestStreak: user.stats?.bestStreak || 0,
                memberSince: user.createdAt
            };
        });
        
        // If sorting by winRate, re-sort the array
        if (sortBy === 'winRate') {
            leaderboard.sort((a, b) => {
                // Sort by win rate, but also require at least 5 games
                const aGames = a.totalGames >= 5 ? a.winRate : -1;
                const bGames = b.totalGames >= 5 ? b.winRate : -1;
                return bGames - aGames;
            });
            // Reassign ranks
            leaderboard.forEach((player, index) => {
                player.rank = index + 1;
            });
        }
        
        res.json({
            leaderboard,
            total: leaderboard.length,
            sortBy
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user's own rank and stats
router.get('/me', async (req, res) => {
    try {
        // Get userId from session or auth token
        const userId = req.session?.userId;
        
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const user = await User.findById(userId)
            .select('username stats createdAt');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const wins = user.stats?.wins || 0;
        const losses = user.stats?.losses || 0;
        const totalGames = user.stats?.totalGames || 0;
        const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;
        
        // Get user's rank by counting users with more wins
        const rank = await User.countDocuments({
            'stats.wins': { $gt: wins },
            'stats.totalGames': { $gt: 0 },
            isActive: true
        }) + 1;
        
        res.json({
            rank,
            username: user.username,
            wins,
            losses,
            totalGames,
            winRate: parseFloat(winRate),
            totalEarnings: user.stats?.totalEarnings || 0,
            totalWagered: user.stats?.totalWagered || 0,
            currentStreak: user.stats?.currentStreak || 0,
            bestStreak: user.stats?.bestStreak || 0,
            memberSince: user.createdAt
        });
    } catch (error) {
        console.error('User stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;




