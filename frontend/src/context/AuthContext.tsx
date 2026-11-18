import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SignInOutput } from 'aws-amplify/auth';
import type { AuthUser } from '../types/Auth';
import {
  friendlyAuthError,
  readCognitoUser,
  signInWithCognito,
  signOutFromCognito,
} from '../services/authService';
import { cognitoConfiguration } from '../services/cognitoConfig';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ result: SignInOutput; user: AuthUser | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<AuthUser | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(cognitoConfiguration.configured ? 'loading' : 'unavailable');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    if (!cognitoConfiguration.configured) {
      setStatus('unavailable');
      setUser(null);
      return null;
    }

    try {
      const currentUser = await readCognitoUser();
      setUser(currentUser);
      setStatus(currentUser ? 'authenticated' : 'unauthenticated');
      setError(null);
      return currentUser;
    } catch (sessionError) {
      try { await signOutFromCognito(); } catch { /* Clear local UI state even when remote sign-out is unavailable. */ }
      setUser(null);
      setStatus('unauthenticated');
      setError(friendlyAuthError(sessionError, 'session'));
      return null;
    }
  }, []);

  useEffect(() => {
    if (!cognitoConfiguration.configured) return;
    void refreshSession();
    const onFocus = () => { void refreshSession(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const result = await signInWithCognito(email, password);
      const currentUser = result.isSignedIn ? await refreshSession() : null;
      return { result, user: currentUser };
    } catch (authError) {
      const message = friendlyAuthError(authError, 'login');
      setError(message);
      throw authError;
    }
  }, [refreshSession]);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await signOutFromCognito();
    } finally {
      setUser(null);
      setStatus(cognitoConfiguration.configured ? 'unauthenticated' : 'unavailable');
    }
  }, []);

  useEffect(() => {
    const handleExpiredApiSession = () => { void signOut(); };
    window.addEventListener('eventpulse:auth-expired', handleExpiredApiSession);
    return () => window.removeEventListener('eventpulse:auth-expired', handleExpiredApiSession);
  }, [signOut]);

  const value = useMemo(() => ({ status, user, error, signIn, signOut, refreshSession, clearError: () => setError(null) }), [status, user, error, signIn, signOut, refreshSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
