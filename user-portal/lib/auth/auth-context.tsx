'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, readSession, saveSession } from '@/lib/auth/session';
import type { AuthSession, AuthUser } from '@/lib/types';

interface AuthContextValue {
  session: AuthSession | null;
  user: AuthUser | null;
  isLoading: boolean;
  setAuthSession: (session: AuthSession) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = readSession();
    setSession(stored);
    setIsLoading(false);
  }, []);

  const setAuthSession = (nextSession: AuthSession) => {
    saveSession(nextSession);
    setSession(nextSession);
  };

  const logout = () => {
    clearSession();
    setSession(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user || null,
      isLoading,
      setAuthSession,
      logout
    }),
    [session, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
