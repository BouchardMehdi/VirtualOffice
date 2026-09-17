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

export class DatabaseUnavailableError extends Error {
  constructor(cause: unknown) {
    super('Base de données indisponible.', { cause });
    this.name = 'DatabaseUnavailableError';
  }
}

// Une coupure du pilote pg peut aussi remonter comme une simple Error.
export async function databaseQuery<T>(query: () => Promise<T>): Promise<T> {
  try {
    return await query();
  } catch (cause) {
    throw new DatabaseUnavailableError(cause);
  }
}
