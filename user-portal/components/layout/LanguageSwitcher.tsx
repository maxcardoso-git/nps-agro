'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Select } from '@/components/ui/Select';
import { routing } from '@/lib/i18n/routing';

export function LanguageSwitcher() {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const onChange = (nextLocale: string) => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) {
      router.replace(`/${nextLocale}`);
      return;
    }
    parts[0] = nextLocale;
    router.replace(`/${parts.join('/')}`);
  };

  return (
    <Select value={locale} onChange={(event) => onChange(event.target.value)} className="w-32" aria-label={t('language')}>
      {routing.locales.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </Select>
  );
}
