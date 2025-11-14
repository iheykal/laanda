const mongoose = require('mongoose');
require('dotenv').config();
const Transaction = require('../models/transaction');
const User = require('../models/user');

// Database connection
const connectDB = async () => {
    try {
        const dbUri = process.env.CONNECTION_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ludo-game';
        await mongoose.connect(dbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: 'test'
        });
        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Clean orphaned transactions
const cleanTransactions = async () => {
    try {
        await connectDB();
        
        console.log('🔍 Checking for orphaned transactions...\n');
        
        const allTransactions = await Transaction.find();
        console.log(`Total transactions found: ${allTransactions.length}`);
        
        let orphanedCount = 0;
        const orphanedIds = [];
        
        for (const transaction of allTransactions) {
            const user = await User.findById(transaction.userId);
            if (!user) {
                orphanedCount++;
                orphanedIds.push(transaction._id);
                console.log(`❌ Orphaned transaction: ${transaction._id} (userId: ${transaction.userId}, type: ${transaction.type}, amount: $${transaction.amount})`);
            }
        }
        
        if (orphanedCount === 0) {
            console.log('\n✅ No orphaned transactions found. Database is clean!');
        } else {
            console.log(`\n⚠️  Found ${orphanedCount} orphaned transactions.`);
            console.log('These transactions belong to users that no longer exist (likely from TEST_MODE).');
            
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            readline.question('\nDo you want to delete these orphaned transactions? (yes/no): ', async (answer) => {
                if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
                    await Transaction.deleteMany({ _id: { $in: orphanedIds } });
                    console.log(`\n✅ Deleted ${orphanedCount} orphaned transactions.`);
                } else {
                    console.log('\n⏭️  Skipped deletion. Orphaned transactions remain in database.');
                }
                readline.close();
                mongoose.connection.close();
                process.exit(0);
            });
        }
        
        if (orphanedCount === 0) {
            mongoose.connection.close();
            process.exit(0);
        }
    } catch (error) {
        console.error('❌ Error cleaning transactions:', error);
        mongoose.connection.close();
        process.exit(1);
    }
};

// Run the script
cleanTransactions();

