const mongoose = require('mongoose');
require('dotenv').config();

// Import User model
const User = require('../models/user');

// Database connection
const connectDB = async () => {
    try {
        const dbUri = process.env.CONNECTION_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ludo-game';
        console.log('Connecting to database...');
        await mongoose.connect(dbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: 'test'
        });
        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        console.error('Make sure CONNECTION_URI or MONGODB_URI is set in your .env file');
        process.exit(1);
    }
};

// Create Super Admin
const createSuperAdmin = async () => {
    try {
        await connectDB();

        const superAdminData = {
            username: 'SuperAdmin',
            phone: '610251014',
            password: 'ilyaasadmin',
            isAdmin: true,
            isSuperAdmin: true,
            isActive: true,
            balance: 0
        };

        // Check if super admin already exists
        const existingAdmin = await User.findOne({ phone: '610251014' });

        if (existingAdmin) {
            console.log('⚠️  Super admin already exists. Updating...');
            
            existingAdmin.username = 'SuperAdmin';
            existingAdmin.isAdmin = true;
            existingAdmin.isSuperAdmin = true;
            existingAdmin.isActive = true;
            
            // Only update password if it's different (to trigger hashing)
            const passwordMatch = await existingAdmin.comparePassword('ilyaasadmin');
            if (!passwordMatch) {
                existingAdmin.password = 'ilyaasadmin';
            }
            
            await existingAdmin.save();
            console.log('✅ Super admin updated successfully!');
        } else {
            console.log('Creating new super admin...');
            const superAdmin = new User(superAdminData);
            await superAdmin.save();
            console.log('✅ Super admin created successfully!');
        }

        console.log('\n📱 Super Admin Credentials:');
        console.log('   Phone: 610251014');
        console.log('   Password: ilyaasadmin');
        console.log('\n🎯 You can now login at /auth/login\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating super admin:', error);
        process.exit(1);
    }
};

// Run the script
createSuperAdmin();

