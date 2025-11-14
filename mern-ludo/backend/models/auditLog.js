const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: false  // Some actions might not have a user (e.g., failed login attempts)
    },
    action: { 
        type: String, 
        required: true,
        enum: [
            'balance_change',
            'deposit_request',
            'withdrawal_request',
            'transaction_approved',
            'transaction_rejected',
            'login_success',
            'login_failed',
            'register',
            'admin_action',
            'suspicious_activity'
        ]
    },
    entityType: { 
        type: String,
        enum: ['user', 'transaction', 'game', 'auth', 'admin'],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // Balance tracking
    balanceBefore: { type: Number },
    balanceAfter: { type: Number },
    amountChanged: { type: Number },
    
    // Request info
    ipAddress: { type: String },
    userAgent: { type: String },
    
    // Status
    status: {
        type: String,
        enum: ['success', 'failed', 'warning'],
        default: 'success'
    },
    
    createdAt: { type: Date, default: Date.now }
});

// Index for faster queries
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);

