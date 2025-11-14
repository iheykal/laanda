const mongoose = require('mongoose');

const MatchRevenueWithdrawalSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    phoneNumber: { type: String, required: true },
    recipientName: { type: String, required: true },
    notes: String,
    adminNotes: String,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    processedAt: Date
});

module.exports = mongoose.model('MatchRevenueWithdrawal', MatchRevenueWithdrawalSchema);

