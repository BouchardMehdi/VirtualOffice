import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const TOKEN_ISSUER = 'virtualoffice';
export const TOKEN_AUDIENCE = 'virtualoffice-client';
export const TOKEN_TTL_SECONDS = env.jwtTtlHours * 60 * 60;

export function createToken(userId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = jwt.sign({ exp: expiresAt }, env.jwtSecret, {
    algorithm: 'HS256',
    subject: userId,
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
  return { token, expiresAt: expiresAt * 1000 };
}

export function verifyToken(token: string) {
  const payload = jwt.verify(token, env.jwtSecret, {
    algorithms: ['HS256'], issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE,
  });
  if (typeof payload === 'string' || typeof payload.sub !== 'string' || !payload.sub ||
      typeof payload.exp !== 'number') {
    throw new Error('Session invalide.');
  }
  return { userId: payload.sub, expiresAt: payload.exp * 1000 };
}
