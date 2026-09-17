import type { ErrorRequestHandler } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { DatabaseUnavailableError } from '../services/prisma.js';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error?.type === 'entity.parse.failed') {
    response.status(400).json({ error: 'Le corps de la requête doit être un JSON valide.' });
  } else if (error?.type === 'entity.too.large') {
    response.status(413).json({ error: 'La requête est trop volumineuse.' });
  } else if (error instanceof DatabaseUnavailableError ||
             error instanceof Prisma.PrismaClientKnownRequestError ||
             error instanceof Prisma.PrismaClientInitializationError ||
             error instanceof Prisma.PrismaClientUnknownRequestError) {
    response.status(503).json({ error: 'La base de données est indisponible. Réessaie dans un instant.' });
  } else {
    console.error('Erreur serveur :', error instanceof Error ? error.name : 'erreur inconnue');
    response.status(500).json({ error: 'Une erreur est survenue. Réessaie dans un instant.' });
  }
};
