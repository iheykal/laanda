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

// Serve static files from React app in production (must be after API routes)
if (process.env.NODE_ENV === 'production') {
    const fs = require('fs');
    // Try multiple possible build paths (check most likely first)
    const buildPathCurrent = path.join(__dirname, './build');  // /app/build (Docker)
    const buildPathParent = path.join(__dirname, '../build'); // ../build
    const buildPathRoot = path.join(process.cwd(), 'build');   // from working dir
    
    // Use the first path that exists
    let staticPath = buildPathCurrent;
    if (fs.existsSync(buildPathCurrent)) {
        staticPath = buildPathCurrent;
    } else if (fs.existsSync(buildPathParent)) {
        staticPath = buildPathParent;
    } else if (fs.existsSync(buildPathRoot)) {
        staticPath = buildPathRoot;
    } else {
        console.error(`❌ ERROR: Build directory not found! Checked:`);
        console.error(`   - ${buildPathCurrent}`);
        console.error(`   - ${buildPathParent}`);
        console.error(`   - ${buildPathRoot}`);
        console.error(`   Current working directory: ${process.cwd()}`);
        console.error(`   __dirname: ${__dirname}`);
        // Fallback to current directory build
        staticPath = buildPathCurrent;
    }
    
    console.log(`📦 Serving static files from: ${staticPath}`);
    app.use(express.static(staticPath));
    
    // Catch all handler: send back React's index.html file for any non-API routes
    app.get('*', (req, res) => {
        // Skip API routes
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API route not found' });
        }
        
        const indexPath = path.join(staticPath, 'index.html');
        console.log(`📄 Serving index.html from: ${indexPath}`);
        res.sendFile(indexPath);
    });
}

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📱 Access from phone: http://YOUR_LOCAL_IP:${PORT}`);
    if (process.env.NODE_ENV === 'production') {
        console.log(`🌐 Production mode: Serving React app`);
    }
});

require('./config/database')(mongoose);
require('./config/socket')(server);

module.exports = { server };
