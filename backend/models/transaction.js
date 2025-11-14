const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['deposit', 'withdrawal'], required: true },
    amount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    proofImage: String,
    phoneNumber: String,
    transactionId: String,
    notes: String,
    adminNotes: String,
    createdAt: { type: Date, default: Date.now },
    processedAt: Date
});

module.exports = mongoose.model('Transaction', TransactionSchema);
