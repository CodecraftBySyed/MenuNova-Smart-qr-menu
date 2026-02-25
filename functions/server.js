import 'dotenv/config';
import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { connectToDatabase } from './lib/mongodb.js';

import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import whatsappRoutes from './routes/whatsapp.js';

const app = express();

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.path}`);
  next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MOVED UP: Database must connect BEFORE routes execute
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return res.status(500).json({ error: 'Database connection error: ' + err.message });
  }
});

// Routes
app.get('/api', (req, res) => res.send('✅ API is running...'));
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Express Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

export const handler = serverless(app);
