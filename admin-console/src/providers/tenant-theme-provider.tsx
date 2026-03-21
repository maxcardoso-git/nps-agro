'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSessionContext } from '@/contexts/session-context';
import { apiClient } from '@/lib/api/client';
import { applyBrandingToCssVars, defaultBranding, resolveBranding } from '@/lib/theme/theme';
import type { TenantBranding } from '@/lib/types';

interface TenantThemeProviderProps {
  children: React.ReactNode;
}

interface ThemeContextPayload {
  branding: Required<TenantBranding>;
  setBranding: (branding: TenantBranding) => void;
}

const TenantThemeContext = createContext<ThemeContextPayload | undefined>(undefined);

export function TenantThemeProvider({ children }: TenantThemeProviderProps) {
  const { session } = useSessionContext();
  const [branding, setBrandingState] = useState(resolveBranding(defaultBranding));

  useEffect(() => {
    applyBrandingToCssVars(branding);
  }, [branding]);

  useEffect(() => {
    async function loadTenantBranding() {
      if (!session?.user?.tenant_id) {
        setBrandingState(resolveBranding(defaultBranding));
        return;
      }

      try {
        const tenant = await apiClient.tenants.getById(session, session.user.tenant_id);
        const resolved = resolveBranding(tenant.settings_json?.branding);
        setBrandingState(resolved);
      } catch {
        setBrandingState(resolveBranding(defaultBranding));
      }
    }

    void loadTenantBranding();
  }, [session]);

  const payload = useMemo<ThemeContextPayload>(
    () => ({
      branding,
      setBranding: (nextBranding: TenantBranding) => {
        setBrandingState(resolveBranding(nextBranding));
      }
    }),
    [branding]
  );

  return <TenantThemeContext.Provider value={payload}>{children}</TenantThemeContext.Provider>;
}

export function useTenantTheme(): ThemeContextPayload {
  const context = useContext(TenantThemeContext);
  if (!context) {
    throw new Error('useTenantTheme must be used within TenantThemeProvider');
  }
  return context;
}
