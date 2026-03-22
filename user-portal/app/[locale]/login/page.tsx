'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';

const schema = z.object({
  email: z.string().email(),
  password: z.string().trim().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof schema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const { setAuthSession } = useAuth();

  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    }
  });

  const loginMutation = useMutation({
    mutationFn: (payload: LoginValues) => api.auth.login(payload),
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
