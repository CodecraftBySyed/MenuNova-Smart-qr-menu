import mongoose from 'mongoose';

/**
 * Cached MongoDB Connection
 * Reuses the connection across function invocations to avoid reconnecting
 * This is critical for Netlify Functions performance
 */

let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb) {
    console.log('✅ Using cached MongoDB connection');
    return cachedDb;
  }

  const mongoUri = process.env.ADMIN_MONGO_URI || process.env.MONGO_URI;

  if (!mongoUri || (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://'))) {
    throw new Error('❌ Invalid or missing MongoDB connection string. Ensure ADMIN_MONGO_URI or MONGO_URI starts with "mongodb://" or "mongodb+srv://"');
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      // Connection pooling for serverless environments
      maxPoolSize: 5,
      minPoolSize: 1,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true
    });

    cachedDb = mongoose.connection;
    console.log('✅ MongoDB Connected');

    // Backfill missing isAvailable field
    try {
      const Menu = mongoose.model('Menu');
      const result = await Menu.updateMany(
        { isAvailable: { $exists: false } },
        { $set: { isAvailable: true } }
      );
      if (result.modifiedCount) {
        console.log(`ℹ️ Set isAvailable=true on ${result.modifiedCount} existing items`);
      }
    } catch (e) {
      console.error('⚠️ Failed to backfill isAvailable:', e.message);
    }

    return cachedDb;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    throw err;
  }
}

export default connectToDatabase;
