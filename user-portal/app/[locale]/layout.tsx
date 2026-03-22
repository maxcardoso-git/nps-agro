import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AppProviders } from '@/app/providers';
import { routing } from '@/lib/i18n/routing';
import { LocaleShell } from '@/app/[locale]/LocaleShell';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppProviders>
        <LocaleShell>{children}</LocaleShell>
      </AppProviders>
    </NextIntlClientProvider>
  );
}
