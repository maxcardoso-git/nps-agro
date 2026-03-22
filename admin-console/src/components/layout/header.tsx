'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSessionContext } from '@/contexts/session-context';
import { useTenantTheme } from '@/providers/tenant-theme-provider';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

export function Header() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { user, logout } = useSessionContext();
  const { branding } = useTenantTheme();

  const onLogout = () => {
    logout();
    router.replace(`/${locale}/login`);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        {branding.logo_url ? (
          <img src={branding.logo_url} alt={branding.app_name} className="h-9 w-auto max-w-[120px] object-contain" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-xs font-bold text-white">
            NA
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-slate-800">{branding.app_name}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <Button variant="ghost" onClick={onLogout}>
          {t('logout')}
        </Button>
      </div>
    </header>
  );
}
