'use client';

import { useTranslations } from 'next-intl';
import { useRequiredSession } from '@/hooks/use-required-session';
import { AppShell } from '@/components/layout/app-shell';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('common');
  const { isLoading } = useRequiredSession();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">{t('loading')}</p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
