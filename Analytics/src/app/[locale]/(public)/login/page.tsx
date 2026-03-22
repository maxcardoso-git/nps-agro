'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSessionContext } from '@/contexts/session-context';
import { apiClient, ApiError } from '@/lib/api/client';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().trim().min(1, 'Password is required'),
  tenant_code: z.string().optional()
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const { setAuthSession } = useSessionContext();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      tenant_code: ''
    }
  });

  const loginMutation = useMutation({
    mutationFn: (payload: LoginForm) => apiClient.auth.login(payload),
    onSuccess: (session) => {
      setAuthSession(session);
      router.replace(`/${locale}/dashboard`);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="mb-4 text-xl font-semibold text-slate-900">{t('title')}</h1>

        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((values) => {
            loginMutation.mutate(values);
          })}
        >
          <div>
            <label className="mb-1 block text-sm text-slate-700">{t('email')}</label>
            <Input type="email" {...form.register('email')} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-700">{t('password')}</label>
            <Input type="password" {...form.register('password')} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-700">{t('tenantCode')}</label>
            <Input type="text" {...form.register('tenant_code')} />
          </div>

          {loginMutation.error ? (
            <p className="text-sm text-red-600">
              {loginMutation.error instanceof ApiError ? loginMutation.error.message : t('genericError')}
            </p>
          ) : null}

          <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? t('loading') : t('submit')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
