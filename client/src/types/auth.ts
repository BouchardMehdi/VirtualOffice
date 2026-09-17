export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'USER' | 'ADMIN';
};

export type Session = { user: User; expiresAt: number };
export type LoginResult = Session & { token: string };
