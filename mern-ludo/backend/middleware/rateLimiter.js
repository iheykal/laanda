const rateLimit = require('express-rate-limit');

// Rate limiter for transaction endpoints (deposits/withdrawals)
// Limits users to 5 requests per 15 minutes
const transactionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many transaction requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiter for auth endpoints (login/register)
// Limits to 10 requests per 15 minutes to prevent brute force
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login attempts per windowMs
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for admin endpoints
// Stricter limits for admin operations
const adminLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // Limit each IP to 20 admin requests per 5 minutes
    message: 'Too many admin requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// General API rate limiter
// More permissive for general API calls
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per minute
    message: 'Too many requests from this IP, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    transactionLimiter,
    authLimiter,
    adminLimiter,
    apiLimiter
};

