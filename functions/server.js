import 'dotenv/config';
import dns from 'node:dns/promises';
dns.setServers(['1.1.1.1', '1.0.0.1']); // Uses Cloudflare DNS

import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { connectToDatabase } from './lib/mongodb.js';

// Route imports
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import whatsappRoutes from './routes/whatsapp.js';

// Initialize App
const app = express();

/**
 * IMPORTANT: Configure CORS for Netlify deployment
 * Update the origin list with your actual Netlify domains and any other production URLs
 */
app.use(cors({
  origin: [
    'https://menunova-smart-qr-menu.pages.dev',     // Original domain
    'https://menunova.netlify.app',                  // Update with your actual Netlify domain
    'http://localhost:5000',                         // Local development
    'http://localhost:3000'                          // Local frontend
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));            // Increased limit for 127+ menu items
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Simple root route
app.get('/', (req, res) => {
  res.send('QR Menu Admin API is running...');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/whatsapp', whatsappRoutes);

/**
 * Middleware: Ensure MongoDB connection is cached
 * This runs before each request to ensure the connection is established
 */
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('Database connection failed:', err);
    return res.status(500).json({ msg: 'Database connection error' });
  }
});

/**
 * Export handler for Netlify Functions
 * This wraps the Express app with serverless-http
 * The handler accepts AWS Lambda events and converts them to Express requests
 */
export const handler = serverless(app);
