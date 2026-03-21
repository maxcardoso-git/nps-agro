'use client';

import { useTranslations } from 'next-intl';
import { useRequiredSession } from '@/hooks/use-required-session';
import { useRoleAccess } from '@/hooks/use-role-access';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { useSessionContext } from '@/contexts/session-context';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('common');
  const { isLoading } = useRequiredSession();
  const { canAccessPortal, role } = useRoleAccess();
  const { logout } = useSessionContext();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">{t('loading')}</p>
      </div>
    );
  }

  if (!canAccessPortal) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-red-700">{t('restricted.title')}</h1>
          <p className="mt-2 text-sm text-slate-700">{t('restricted.description')}</p>
          <p className="mt-2 text-xs text-slate-500">
            {t('restricted.roleLabel')}: {role || '-'}
          </p>
          <Button className="mt-4" onClick={logout}>
            {t('logout')}
          </Button>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
