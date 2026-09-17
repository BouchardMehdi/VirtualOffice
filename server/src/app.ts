import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';

export const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: '16kb' }));
app.use('/api/health', healthRouter);
app.use((_request, response) => {
  response.status(404).json({ error: 'Route introuvable.' });
});
