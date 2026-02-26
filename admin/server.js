import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dns from 'node:dns/promises';
dns.setServers(['1.1.1.1', '1.0.0.1']); // Uses Cloudflare DNS

import Menu from './models/Menu.js';

// ====== ENVIRONMENT VALIDATION ======
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Validate required environment variables
const requiredEnvVars = [
  { name: 'MONGO_URI', env: process.env.ADMIN_MONGO_URI || process.env.MONGO_URI },
  { name: 'JWT_SECRET', env: process.env.JWT_SECRET },
  { name: 'CLOUDINARY_CLOUD_NAME', env: process.env.CLOUDINARY_CLOUD_NAME },
  { name: 'CLOUDINARY_API_KEY', env: process.env.CLOUDINARY_API_KEY },
  { name: 'CLOUDINARY_API_SECRET', env: process.env.CLOUDINARY_API_SECRET }
];

const missingVars = requiredEnvVars.filter(v => !v.env).map(v => v.name);
if (missingVars.length > 0) {
  console.error(`❌ FATAL: Missing required environment variables:\n${missingVars.map(v => `   - ${v}`).join('\n')}`);
  process.exit(1);
}

// Validate MongoDB URI format
const mongoUri = process.env.ADMIN_MONGO_URI || process.env.MONGO_URI;
if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
  console.error('❌ FATAL: MongoDB URI must start with "mongodb://" or "mongodb+srv://"');
  process.exit(1);
}

// Validate PORT is a number
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`❌ FATAL: PORT must be a number between 1 and 65535. Got: ${PORT}`);
  process.exit(1);
}

// ====== INITIALIZE APP ======
const app = express();

// ====== CORS CONFIGURATION ======
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? [FRONTEND_URL] // Production: only allow frontend domain
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5500', 'http://localhost:8080', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5500', 'http://127.0.0.1:8080'], // Dev: allow common dev ports
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ====== MONGODB CONNECTION ======
let mongoConnectionAttempts = 0;
const maxReconnectAttempts = 5;

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri, {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    
    console.log('✅ MongoDB Connected');
    
    // Backfill isAvailable field
    try {
      const result = await Menu.updateMany(
        { isAvailable: { $exists: false } },
        { $set: { isAvailable: true } }
      );
      if (result.modifiedCount > 0) {
        console.log(`ℹ️ Backfilled isAvailable on ${result.modifiedCount} items`);
      }
    } catch (e) {
      console.error('⚠️ Failed to backfill isAvailable:', e.message);
    }
    
    mongoConnectionAttempts = 0;
  } catch (err) {
    mongoConnectionAttempts++;
    console.error(`❌ MongoDB Connection Error (Attempt ${mongoConnectionAttempts}/${maxReconnectAttempts}):`, err.message);
    
    if (mongoConnectionAttempts < maxReconnectAttempts) {
      setTimeout(() => connectDB(), 5000);
    } else {
      console.error('❌ FATAL: Could not establish MongoDB connection after max retries');
      process.exit(1);
    }
  }
};

connectDB();

// Handle MongoDB disconnection
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
  if (mongoConnectionAttempts === 0) {
    mongoConnectionAttempts = 1;
    setTimeout(() => connectDB(), 5000);
  }
});

// ====== ROUTES ======
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import whatsappRoutes from './routes/whatsapp.js';

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Health check endpoint (required for Railway)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'QR Menu Admin API',
    version: '1.0.0',
    status: 'running'
  });
});

// ====== 404 HANDLER ======
app.use((req, res) => {
  res.status(404).json({ msg: 'Route not found' });
});

// ====== GLOBAL ERROR MIDDLEWARE ======
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err);
  
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    msg: message,
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ====== START SERVER ======
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${NODE_ENV}`);
  console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error(`❌ Server Error: ${err.message}`);
  }
  process.exit(1);
});

// ====== GRACEFUL SHUTDOWN ======
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    mongoose.disconnect().then(() => {
      console.log('✅ MongoDB disconnected');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    mongoose.disconnect().then(() => {
      console.log('✅ MongoDB disconnected');
      process.exit(0);
    });
  });
});
