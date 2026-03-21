'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';
import { applyBranding, defaultBranding, resolveBranding } from '@/lib/theme/branding';
import type { TenantBranding } from '@/lib/types';

interface ThemeContextValue {
  branding: Required<TenantBranding>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function TenantThemeProvider({ children }: { children: React.ReactNode }) {
  const { session, logout } = useAuth();
  const [branding, setBranding] = useState(resolveBranding(defaultBranding));

  useEffect(() => {
    applyBranding(branding);
  }, [branding]);

  useEffect(() => {
    async function loadTheme() {
      if (!session?.user?.tenant_id) {
        setBranding(resolveBranding(defaultBranding));
        return;
      }

      try {
        const tenant = await api.tenants.getById(session, session.user.tenant_id);
        setBranding(resolveBranding(tenant.settings_json?.branding));
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logout();
        }
        setBranding(resolveBranding(defaultBranding));
      }
    }

    void loadTheme();
  }, [session, logout]);

  const value = useMemo(() => ({ branding }), [branding]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTenantTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTenantTheme must be used inside TenantThemeProvider');
  }
  return context;
}
