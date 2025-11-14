const AuditLog = require('../models/auditLog');

/**
 * Create an audit log entry
 * @param {Object} params - Audit log parameters
 * @param {String} params.userId - User ID (optional)
 * @param {String} params.action - Action performed
 * @param {String} params.entityType - Type of entity
 * @param {String} params.entityId - Entity ID (optional)
 * @param {Object} params.details - Additional details
 * @param {Number} params.balanceBefore - Balance before change
 * @param {Number} params.balanceAfter - Balance after change
 * @param {Number} params.amountChanged - Amount changed
 * @param {String} params.ipAddress - IP address
 * @param {String} params.userAgent - User agent
 * @param {String} params.status - Status ('success', 'failed', 'warning')
 */
async function createAuditLog({
    userId,
    action,
    entityType,
    entityId,
    details = {},
    balanceBefore,
    balanceAfter,
    amountChanged,
    ipAddress,
    userAgent,
    status = 'success'
}) {
    try {
        const auditLog = new AuditLog({
            userId,
            action,
            entityType,
            entityId,
            details,
            balanceBefore,
            balanceAfter,
            amountChanged,
            ipAddress,
            userAgent,
            status
        });
        
        await auditLog.save();
        
        // Log to console for monitoring
        console.log(`[AUDIT] ${action} by user ${userId || 'system'} - Status: ${status}`);
        
        return auditLog;
    } catch (error) {
        // Don't let audit logging failures break the main application
        console.error('Failed to create audit log:', error);
        return null;
    }
}

/**
 * Log balance change
 */
async function logBalanceChange(userId, balanceBefore, balanceAfter, reason, req = {}) {
    const amountChanged = balanceAfter - balanceBefore;
    
    return createAuditLog({
        userId,
        action: 'balance_change',
        entityType: 'user',
        entityId: userId,
        details: { reason },
        balanceBefore,
        balanceAfter,
        amountChanged,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get?.('user-agent')
    });
}

/**
 * Log transaction action
 */
async function logTransaction(userId, action, transactionId, details, req = {}) {
    return createAuditLog({
        userId,
        action,
        entityType: 'transaction',
        entityId: transactionId,
        details,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get?.('user-agent')
    });
}

/**
 * Log authentication action
 */
async function logAuth(userId, action, status, details, req = {}) {
    return createAuditLog({
        userId,
        action,
        entityType: 'auth',
        details,
        status,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get?.('user-agent')
    });
}

/**
 * Log suspicious activity
 */
async function logSuspiciousActivity(userId, details, req = {}) {
    return createAuditLog({
        userId,
        action: 'suspicious_activity',
        entityType: 'user',
        entityId: userId,
        details,
        status: 'warning',
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get?.('user-agent')
    });
}

module.exports = {
    createAuditLog,
    logBalanceChange,
    logTransaction,
    logAuth,
    logSuspiciousActivity
};

