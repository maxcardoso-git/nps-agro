'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AppHeader } from '@/components/layout/AppHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/auth-context';
import { useRequiredSession, useRoleGuard } from '@/lib/auth/use-auth-guards';

export function LocaleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('common');
  const router = useRouter();
  const { logout } = useAuth();
  const { isLoading } = useRequiredSession();
  const { canAccess, role } = useRoleGuard();
  const locale = pathname.split('/').filter(Boolean)[0] || 'pt-BR';

  const isLoginPage = pathname.endsWith('/login');
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">{t('loading')}</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-red-700">{t('forbidden.title')}</h1>
          <p className="mt-2 text-sm text-slate-700">{t('forbidden.description')}</p>
          <p className="mt-2 text-xs text-slate-500">
            {t('forbidden.roleLabel')}: {role || '-'}
          </p>
          <div className="mt-4">
            <Button
              onClick={() => {
                logout();
                router.replace(`/${locale}/login`);
              }}
            >
              {t('logout')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <Sidebar />
        <PageContainer>{children}</PageContainer>
      </div>
    </div>
  );
}
