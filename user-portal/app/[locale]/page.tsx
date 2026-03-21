import { redirect } from 'next/navigation';

export default async function LocaleIndex({
  params
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  redirect(`/${locale}/dashboard`);
}
