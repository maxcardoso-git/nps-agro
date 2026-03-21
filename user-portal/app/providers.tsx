'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/lib/auth/auth-context';
import { TenantThemeProvider } from '@/lib/theme/theme-context';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 60_000,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <TenantThemeProvider>{children}</TenantThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
