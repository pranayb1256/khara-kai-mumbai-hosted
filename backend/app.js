import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { startTwitterPolling } from './adapters/twitterPolling.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { generalRateLimiter } from './middleware/rateLimiter.js';

dotenv.config();

import claimRoutes from './routes/claimroutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import voteRoutes from './routes/voteRoutes.js';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
app.use(generalRateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/claims', claimRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api', voteRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    name: 'Khar Ka Mumbai API',
    version: '1.0.0',
    description: 'AI-powered fact-checking for Mumbai news and rumors',
    endpoints: {
      health: '/health',
      claims: '/api/claims',
      whatsapp: '/api/whatsapp',
      votes: '/api/claims/:id/votes',
    }
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start Twitter polling if configured
if (process.env.TWITTER_BEARER && process.env.TWITTER_POLL_QUERY) {
  startTwitterPolling({
    query: process.env.TWITTER_POLL_QUERY,
    // Twitter free tier: 1 request per 15 minutes - use 900 seconds minimum
    intervalSeconds: Math.max(parseInt(process.env.TWITTER_POLL_INTERVAL || '900', 10), 900),
    maxResults: parseInt(process.env.TWITTER_POLL_MAX_RESULTS || '10', 10)
  }).catch(err => console.error('Twitter polling failed to start', err));
} else {
  console.log('Twitter polling disabled: TWITTER_BEARER or TWITTER_POLL_QUERY not set');
}

export default app;
