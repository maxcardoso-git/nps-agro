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
    <Select
      aria-label={t('language')}
      className="w-36"
      value={locale}
      onChange={(event) => onChange(event.target.value)}
    >
      {routing.locales.map((lang) => (
        <option key={lang} value={lang}>
          {lang}
        </option>
      ))}
    </Select>
  );
}
