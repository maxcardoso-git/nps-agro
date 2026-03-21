'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { useAuth } from '@/lib/auth/auth-context';
import { useTenantTheme } from '@/lib/theme/theme-context';

export function AppHeader() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { branding } = useTenantTheme();

  const onLogout = () => {
    logout();
    router.replace(`/${locale}/login`);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        {branding.logo_url ? (
          <Image src={branding.logo_url} alt={branding.app_name} width={32} height={32} className="h-8 w-8 rounded object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-xs font-bold text-white">NA</div>
        )}
        <div>
          <p className="text-sm font-semibold text-slate-900">{branding.app_name}</p>
          <p className="text-xs text-slate-500">{user?.email || '-'}</p>
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
