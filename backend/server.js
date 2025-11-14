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

// Serve static files from React app
// Always try to serve if build directory exists (for Docker/Render deployments)
const fs = require('fs');

// Check if build directory exists - if it does, serve it regardless of NODE_ENV
const buildPathCurrent = path.join(__dirname, './build');
const buildPathParent = path.join(__dirname, '../build');
const buildPathRoot = path.join(process.cwd(), 'build');

const buildExists = fs.existsSync(buildPathCurrent) || 
                     fs.existsSync(buildPathParent) || 
                     fs.existsSync(buildPathRoot);

if (buildExists || process.env.NODE_ENV === 'production') {
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
        console.error(`   NODE_ENV: ${process.env.NODE_ENV}`);
        // Fallback to current directory build
        staticPath = buildPathCurrent;
    }
    
    console.log(`📦 Serving static files from: ${staticPath}`);
    console.log(`🌐 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    app.use(express.static(staticPath));
    
    // Catch all handler: send back React's index.html file for any non-API routes
    app.get('*', (req, res) => {
        // Skip API routes
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API route not found' });
        }
        
        const indexPath = path.join(staticPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            console.log(`📄 Serving index.html from: ${indexPath}`);
            res.sendFile(indexPath);
        } else {
            console.error(`❌ index.html not found at: ${indexPath}`);
            res.status(404).send('React app not found. Build directory may be missing.');
        }
    });
} else {
    console.log(`🔧 Development mode: Not serving static files`);
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
