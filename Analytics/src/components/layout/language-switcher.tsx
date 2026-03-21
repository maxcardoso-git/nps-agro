'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Select } from '@/components/ui/select';
import { routing } from '@/i18n/routing';

export function LanguageSwitcher() {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const onChangeLocale = (nextLocale: string) => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) {
      router.replace(`/${nextLocale}`);
      return;
    }

    parts[0] = nextLocale;
    router.replace(`/${parts.join('/')}`);
  };

  return (
    <Select
      className="w-32"
      value={locale}
      aria-label={t('language')}
      onChange={(event) => onChangeLocale(event.target.value)}
    >
      {routing.locales.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </Select>
  );
}
