import bcrypt from 'bcrypt';
import { prisma } from '../src/services/prisma.js';

const password = process.env.DEMO_PASSWORD;
const users = [
  { firstName: 'Alice', lastName: 'Martin', email: 'alice@virtualoffice.test', role: 'USER' },
  { firstName: 'Thomas', lastName: 'Bernard', email: 'thomas@virtualoffice.test', role: 'USER' },
  { firstName: 'Julie', lastName: 'Dupont', email: 'julie@virtualoffice.test', role: 'USER' },
  { firstName: 'Emma', lastName: 'Leroy', email: 'emma@virtualoffice.test', role: 'USER' },
  { firstName: 'Paul', lastName: 'Admin', email: 'admin@virtualoffice.test', role: 'ADMIN' },
] as const;

try {
  if (!password || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('DEMO_PASSWORD doit contenir au moins 8 caractères et au plus 72 octets UTF-8.');
  }

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash: await bcrypt.hash(password, 10) },
    });
  }
  console.log(`Les ${users.length} comptes de démonstration sont disponibles. Les comptes existants sont conservés.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Échec du seed.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
