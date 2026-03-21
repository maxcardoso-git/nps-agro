'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSessionContext } from '@/contexts/session-context';
import { apiClient } from '@/lib/api/client';
import { applyBrandingToCssVars, defaultBranding, resolveBranding } from '@/lib/theme/theme';
import type { TenantBranding } from '@/lib/types';

interface ThemeContextValue {
  branding: Required<TenantBranding>;
  setBranding: (branding: TenantBranding) => void;
}

const TenantThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function TenantThemeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSessionContext();
  const [branding, setBrandingState] = useState(resolveBranding(defaultBranding));

  useEffect(() => {
    applyBrandingToCssVars(branding);
  }, [branding]);

  useEffect(() => {
    async function loadBranding() {
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

    void loadBranding();
  }, [session]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      branding,
      setBranding: (nextBranding) => setBrandingState(resolveBranding(nextBranding))
    }),
    [branding]
  );

  return <TenantThemeContext.Provider value={value}>{children}</TenantThemeContext.Provider>;
}

export function useTenantTheme(): ThemeContextValue {
  const context = useContext(TenantThemeContext);
  if (!context) {
    throw new Error('useTenantTheme must be used within TenantThemeProvider');
  }
  return context;
}
