const mongoose = require('mongoose');
require('dotenv').config();

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

// Fix email index
const fixEmailIndex = async () => {
    try {
        await connectDB();
        
        const db = mongoose.connection.db;
        const collection = db.collection('users');
        
        // Get all indexes
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes);
        
        // Drop the old email_1 unique index if it exists
        try {
            await collection.dropIndex('email_1');
            console.log('✅ Dropped old email_1 index');
        } catch (err) {
            if (err.code === 27) {
                console.log('ℹ️  email_1 index does not exist (already removed)');
            } else {
                console.log('⚠️  Could not drop email_1 index:', err.message);
            }
        }
        
        // List indexes again to confirm
        const newIndexes = await collection.indexes();
        console.log('Updated indexes:', newIndexes);
        
        console.log('\n✅ Email index fixed! Email field is now optional without unique constraint.');
        console.log('📝 You can now register users without email addresses.\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing email index:', error);
        process.exit(1);
    }
};

// Run the script
fixEmailIndex();

