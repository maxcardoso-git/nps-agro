'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, readSession, saveSession } from '@/lib/auth/session';
import type { AuthSession, AuthUser } from '@/lib/types';

interface SessionContextValue {
  session: AuthSession | null;
  user: AuthUser | null;
  isLoading: boolean;
  setAuthSession: (session: AuthSession) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
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
    window.location.href = '/analytics';
  };

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      user: session?.user || null,
      isLoading,
      setAuthSession,
      logout
    }),
    [session, isLoading]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return context;
}
