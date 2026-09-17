import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './services/prisma.js';

const server = app.listen(env.port, '0.0.0.0', () => {
  console.log(`VirtualOffice API : http://localhost:${env.port}`);
});

server.on('error', async (error) => {
  console.error('Impossible de démarrer le serveur :', error.message);
  await prisma.$disconnect();
  process.exit(1);
});

let stopping = false;

function shutdown() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 8_000);
  timeout.unref();

  server.close(async () => {
    await prisma.$disconnect();
    clearTimeout(timeout);
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
