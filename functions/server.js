import 'dotenv/config';
import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { connectToDatabase } from './lib/mongodb.js';

// Route imports
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import whatsappRoutes from './routes/whatsapp.js';

const app = express();

// 1. Basic Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 2. Database Connection Middleware
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('Database connection failed:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).send(JSON.stringify({ error: 'Database connection error' }));
  }
});

// 3. Routes
app.get('/', (req, res) => {
  res.send('QR Menu Admin API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// 4. Clean Export (No binary mode for JSON APIs)
export const handler = serverless(app);
