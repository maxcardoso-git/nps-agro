import { getRequestConfig } from 'next-intl/server';
import { routing } from '@/lib/i18n/routing';

const messageLoaders = {
  'pt-BR': () => import('../../messages/pt-BR.json'),
  'en-US': () => import('../../messages/en-US.json'),
  'es-ES': () => import('../../messages/es-ES.json')
} as const;

export default getRequestConfig(async ({ locale }) => {
  const selectedLocale: (typeof routing.locales)[number] = routing.locales.includes(
    locale as (typeof routing.locales)[number]
  )
    ? (locale as (typeof routing.locales)[number])
    : routing.defaultLocale;

  return {
    locale: selectedLocale,
    messages: (await messageLoaders[selectedLocale]()).default
  };
});
