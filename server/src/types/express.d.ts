import type { PublicUser } from '../auth/user.js';

declare global {
  namespace Express {
    interface Locals {
      user?: PublicUser;
      expiresAt?: number;
    }
  }
}
