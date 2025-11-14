const mongoose = require('mongoose');

const GameHistorySchema = new mongoose.Schema({
    roomId: String,
    players: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: String,
        betAmount: Number,
        isWinner: { type: Boolean, default: false }
    }],
    betAmount: Number,
    totalPot: Number,
    winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    winnerPayout: Number,
    platformFee: Number,
    startedAt: Date,
    completedAt: Date
});

module.exports = mongoose.model('GameHistory', GameHistorySchema);
