'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSessionContext } from '@/contexts/session-context';
import { apiClient, ApiError } from '@/lib/api/client';

const LOGO_URL = 'https://www.syngenta.com.br/sites/g/files/kgtney466/files/color/syn_global_theme-96a84cb3/logo.svg';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().trim().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const { setAuthSession } = useSessionContext();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const loginMutation = useMutation({
    mutationFn: (payload: LoginForm) => apiClient.auth.login(payload),
    onSuccess: (session) => {
      setAuthSession(session);
      router.replace(`/${locale}/dashboard`);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <img src={LOGO_URL} alt="Syngenta" className="h-12 mb-3" />
          <p className="text-sm font-medium text-slate-500">Analytics Portal</p>
        </div>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-5 text-center text-lg font-semibold text-slate-900">{t('title')}</h1>

          <form className="space-y-4" onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('email')}</label>
              <Input type="email" {...form.register('email')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('password')}</label>
              <Input type="password" {...form.register('password')} />
            </div>

            {loginMutation.error && (
              <p className="text-sm text-red-600">
                {loginMutation.error instanceof ApiError ? loginMutation.error.message : t('genericError')}
              </p>
            )}

            <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? t('loading') : t('submit')}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
