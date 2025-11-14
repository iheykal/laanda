const jwt = require('jsonwebtoken');
const User = require('../models/user');

// TEST MODE - Set to true to bypass authentication
// ⚠️ WARNING: NEVER SET TO TRUE IN PRODUCTION!
const TEST_MODE = false;

// Validate JWT_SECRET is set
if (!process.env.JWT_SECRET) {
    console.error('🔴 CRITICAL: JWT_SECRET is not set in environment variables!');
    console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
}

const JWT_SECRET = process.env.JWT_SECRET || 'INSECURE_FALLBACK_KEY_CHANGE_THIS';

// Verify user is authenticated
exports.authMiddleware = async (req, res, next) => {
    // TEST MODE - Skip authentication
    if (TEST_MODE) {
        req.userId = 'test-user-id';
        req.user = { username: 'TestUser', email: 'test@test.com', balance: 1000, isAdmin: false };
        return next();
    }

    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        
        const user = await User.findById(req.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Verify user is admin
exports.adminMiddleware = async (req, res, next) => {
    // TEST MODE - Allow admin access without authentication
    if (TEST_MODE) {
        req.userId = 'test-admin-id';
        req.user = { 
            _id: 'test-admin-id',
            username: 'AdminUser', 
            email: 'admin@test.com', 
            balance: 0, 
            isAdmin: true 
        };
        return next();
    }

    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user || (!user.isAdmin && !user.isSuperAdmin)) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        req.userId = user._id;
        req.user = user;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Unauthorized' });
    }
};

