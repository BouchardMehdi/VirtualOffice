import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
  connectionTimeoutMillis: 3_000,
  query_timeout: 3_000,
  max: 5,
});

export const prisma = new PrismaClient({ adapter });
