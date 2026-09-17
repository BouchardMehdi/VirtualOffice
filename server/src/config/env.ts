import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

// Meme chemin depuis src/config et dist/config ; les variables Docker sont prioritaires.
config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

const databaseUrl = process.env.DATABASE_URL;
const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

if (!databaseUrl || !/^postgres(ql)?:\/\//.test(databaseUrl)) {
  throw new Error('DATABASE_URL doit contenir une URL PostgreSQL. Copier .env.example vers .env.');
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT doit être un entier entre 1 et 65535.');
}

export const env = { databaseUrl, port, clientOrigin };
