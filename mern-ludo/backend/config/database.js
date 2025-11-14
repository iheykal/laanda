module.exports = function (mongoose) {
    mongoose.set('useFindAndModify', false);
    
    // Support both CONNECTION_URI and MONGODB_URI for compatibility
    const connectionUri = process.env.CONNECTION_URI || process.env.MONGODB_URI;
    
    if (!connectionUri) {
        console.error('❌ Error: CONNECTION_URI or MONGODB_URI must be set in environment variables');
        process.exit(1);
    }
    
    mongoose
        .connect(connectionUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: 'test',
            // Connection pooling settings to reduce overhead
            maxPoolSize: 10, // Maximum number of connections in the pool
            minPoolSize: 2, // Minimum number of connections in the pool
            maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
            serverSelectionTimeoutMS: 5000, // Timeout for server selection
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        })
        .then(() => {
            console.log('MongoDB Connected…');
            console.log('📊 Connection pool configured: maxPoolSize=10, minPoolSize=2');
        })
        .catch(err => console.error(err));
};
