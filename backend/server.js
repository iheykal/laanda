const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
require('dotenv').config();
const { sessionMiddleware } = require('./config/session');

const PORT = process.env.PORT;

const app = express();

app.use(cookieParser());
app.use(
    express.urlencoded({
        extended: true,
    })
);
app.use(express.json());
app.set('trust proxy', 1);
app.use(
    cors({
        origin: function(origin, callback) {
            // Allow all origins in development
            callback(null, true);
        },
        credentials: true,
    })
);
app.use(sessionMiddleware);

// API Routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transaction');
const adminRoutes = require('./routes/admin');
const gameRoutes = require('./routes/game');
const leaderboardRoutes = require('./routes/leaderboard');

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📱 Access from phone: http://YOUR_LOCAL_IP:${PORT}`);
});

require('./config/database')(mongoose);
require('./config/socket')(server);

if (process.env.NODE_ENV === 'production') {
    app.use(express.static('./build'));
    app.get('*', (req, res) => {
        const indexPath = path.join(__dirname, './build/index.html');
        res.sendFile(indexPath);
    });
}

module.exports = { server };
