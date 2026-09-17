import { apiRequest } from './api';
import type { LoginResult, Session } from '../types/auth';

const TOKEN_KEY = 'virtualoffice.token';

export const tokenStorage = {
  read: () => sessionStorage.getItem(TOKEN_KEY),
  save: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

export function login(email: string, password: string) {
  return apiRequest<LoginResult>('/auth/login', { method: 'POST', body: { email, password } });
}

export function getSession(token: string, signal: AbortSignal) {
  return apiRequest<Session>('/auth/me', { token, signal });
}
