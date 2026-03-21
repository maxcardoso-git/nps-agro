'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useSessionContext } from '@/contexts/session-context';

export function useRequiredSession() {
  const { session, isLoading } = useSessionContext();
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace(`/${locale}/login`);
    }
  }, [session, isLoading, locale, router]);

  return { session, isLoading };
}
