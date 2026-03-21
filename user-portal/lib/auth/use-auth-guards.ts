'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth/auth-context';
import { canAccessPortal } from '@/lib/rbac';

export function useRequiredSession() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace(`/${locale}/login`);
    }
  }, [isLoading, session, router, locale]);

  return { session, isLoading };
}

export function useRoleGuard() {
  const { user } = useAuth();
  return {
    canAccess: canAccessPortal(user?.role),
    role: user?.role
  };
}
