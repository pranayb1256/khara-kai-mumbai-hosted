import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { startTwitterStream } from './services/ingestion/twitterAdapter.js';
startTwitterStream();

dotenv.config();

import claimRoutes from './routes/claimroutes.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.use('/api/claims', claimRoutes);

app.get('/', (req, res) => res.send('Khara Kai Mumbai — Supabase + ESM Backend'));

const PORT = process.env.BACKEND_PORT || 4000;
// Export the configured Express app; server start occurs in index.js
export default app;
