export function parseCredentials(input: unknown): { email: string; password: string } | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const { email, password } = input as Record<string, unknown>;
  if (typeof email !== 'string' || typeof password !== 'string') return null;
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      password.length === 0 || Buffer.byteLength(password, 'utf8') > 72) return null;
  return { email: normalizedEmail, password };
}
