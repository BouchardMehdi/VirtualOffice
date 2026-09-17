import { Router } from 'express';
import { prisma } from '../services/prisma.js';

export const healthRouter = Router();

healthRouter.get('/', async (_request, response) => {
  response.setHeader('Cache-Control', 'no-store');

  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ status: 'ok', service: 'virtualoffice-api', database: 'connected' });
  } catch {
    response.status(503).json({
      status: 'error',
      service: 'virtualoffice-api',
      database: 'unavailable',
    });
  }
});
