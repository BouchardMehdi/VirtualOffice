import type { Prisma } from '../generated/prisma/client.js';

export const publicUserSelect = {
  id: true, firstName: true, lastName: true, email: true, role: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
