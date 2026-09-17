import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { Router } from 'express';
import { parseCredentials } from '../auth/credentials.js';
import { createToken } from '../auth/token.js';
import { publicUserSelect } from '../auth/user.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { databaseQuery, prisma } from '../services/prisma.js';

export const authRouter = Router();
// Meme comparaison bcrypt pour un email absent, sans mot de passe fixe dans le code.
const dummyHash = bcrypt.hash(randomBytes(32).toString('hex'), 10);

authRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

authRouter.post('/login', async (request, response) => {
  const credentials = parseCredentials(request.body);
  if (!credentials) {
    response.status(400).json({ error: 'Saisis une adresse email valide et un mot de passe de 72 octets maximum.' });
    return;
  }
  const user = await databaseQuery(() => prisma.user.findUnique({
    where: { email: credentials.email },
    select: { ...publicUserSelect, passwordHash: true },
  }));
  const matches = await bcrypt.compare(credentials.password, user?.passwordHash ?? await dummyHash);
  if (!user || !matches) {
    response.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    return;
  }

  const { passwordHash: _passwordHash, ...publicUser } = user;
  response.json({ ...createToken(user.id), user: publicUser });
});

authRouter.get('/me', requireAuth, (_request, response) => {
  response.json({ user: response.locals.user, expiresAt: response.locals.expiresAt });
});
