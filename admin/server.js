import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dns from 'node:dns/promises';
dns.setServers(['1.1.1.1', '1.0.0.1']); // Uses Cloudflare DNS

import Menu from './models/Menu.js';

// Initialize App
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies

// Connect to MongoDB
const mongoUri = process.env.ADMIN_MONGO_URI || process.env.MONGO_URI;
if (!mongoUri || (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://'))) {
  console.error('❌ Invalid or missing MongoDB connection string. Ensure ADMIN_MONGO_URI or MONGO_URI starts with "mongodb://" or "mongodb+srv://". Current value:', mongoUri);
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('✅ MongoDB Connected');
    try {
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
  })
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import whatsappRoutes from './routes/whatsapp.js';

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Simple root route
app.get('/', (req, res) => {
  res.send('QR Menu Admin API is running...');
});

// Start Server with error handling for EADDRINUSE
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop the process using this port or set a different PORT in your .env.`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});
