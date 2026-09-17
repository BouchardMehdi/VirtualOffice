import type { RequestHandler } from 'express';
import { verifyToken } from '../auth/token.js';
import { publicUserSelect } from '../auth/user.js';
import { databaseQuery, prisma } from '../services/prisma.js';

export const requireAuth: RequestHandler = async (request, response, next) => {
  const match = /^Bearer ([^\s]+)$/i.exec(request.get('authorization') || '');
  if (!match) {
    response.status(401).json({ error: 'Connexion requise.' });
    return;
  }

  let session: ReturnType<typeof verifyToken>;
  try {
    session = verifyToken(match[1]);
  } catch {
    response.status(401).json({ error: 'Session invalide ou expirée. Reconnecte-toi.' });
    return;
  }

  const user = await databaseQuery(() => prisma.user.findUnique({
    where: { id: session.userId }, select: publicUserSelect,
  }));
  if (!user) {
    response.status(401).json({ error: 'Session invalide ou expirée. Reconnecte-toi.' });
    return;
  }
  response.locals.user = user;
  response.locals.expiresAt = session.expiresAt;
  next();
};
