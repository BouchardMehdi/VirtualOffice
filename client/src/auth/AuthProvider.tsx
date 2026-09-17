import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '../services/api';
import { getSession, login, tokenStorage } from '../services/auth';
import type { Session } from '../types/auth';

type AuthContextValue = {
  session: Session | null;
  status: 'loading' | 'ready' | 'error';
  message: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: (message?: string) => void;
  retry: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  const signOut = useCallback((reason = '') => {
    tokenStorage.clear();
    setSession(null);
    setMessage(reason);
    setStatus('ready');
  }, []);

  useEffect(() => {
    const token = tokenStorage.read();
    if (!token) {
      setStatus('ready');
      return;
    }
    const controller = new AbortController();
    getSession(token, controller.signal)
      .then((restored) => {
        if (controller.signal.aborted) return;
        setSession(restored);
        setMessage('');
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          signOut('Ta session a expiré ou est invalide. Reconnecte-toi.');
        } else {
          setMessage(error instanceof Error ? error.message : 'Connexion impossible.');
          setStatus('error');
        }
      });
    return () => controller.abort();
  }, [attempt, signOut]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => signOut('Ta session a expiré. Reconnecte-toi.'),
      Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session, signOut]);

  async function signIn(email: string, password: string) {
    const result = await login(email, password);
    tokenStorage.save(result.token);
    setSession({ user: result.user, expiresAt: result.expiresAt });
    setMessage('');
    setStatus('ready');
  }

  return (
    <AuthContext.Provider value={{ session, status, message, signIn, signOut,
      retry: () => { setStatus('loading'); setAttempt((value) => value + 1); } }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return context;
}
