'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiClient, ApiError } from '@/lib/api/client';
import { defaultBranding } from '@/lib/theme/theme';
import { useRequiredSession } from '@/hooks/use-required-session';
import { useTenantTheme } from '@/providers/tenant-theme-provider';

export default function BrandingPage() {
  const t = useTranslations('common');
  const { session } = useRequiredSession();
  const { branding, setBranding } = useTenantTheme();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(branding);

  useEffect(() => {
    setForm(branding);
  }, [branding]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const tenant = await apiClient.tenants.getById(session!, session!.user.tenant_id);
      const payload = {
        settings_json: {
          ...(tenant.settings_json || {}),
          branding: form
        }
      };
      return apiClient.tenants.update(session!, session!.user.tenant_id, payload);
    },
    onSuccess: () => {
      setBranding(form);
      setError(null);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : 'Failed to save branding');
    }
  });

  const resetDefault = () => {
    setForm(defaultBranding);
    setBranding(defaultBranding);
  };

  return (
    <PermissionGate permission="branding.update">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">{t('menu.branding')}</h1>

        <Card title={t('branding.title')}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder={t('branding.fields.app_name')}
              value={form.app_name}
              onChange={(event) => setForm((prev) => ({ ...prev, app_name: event.target.value }))}
            />
            <Input
              placeholder={t('branding.fields.logo_url')}
              value={form.logo_url}
              onChange={(event) => setForm((prev) => ({ ...prev, logo_url: event.target.value }))}
            />

            <label className="text-sm">
              {t('branding.fields.primary_color')}
              <Input
                type="color"
                value={form.primary_color}
                onChange={(event) => setForm((prev) => ({ ...prev, primary_color: event.target.value }))}
              />
            </label>

            <label className="text-sm">
              {t('branding.fields.secondary_color')}
              <Input
                type="color"
                value={form.secondary_color}
                onChange={(event) => setForm((prev) => ({ ...prev, secondary_color: event.target.value }))}
              />
            </label>

            <label className="text-sm">
              {t('branding.fields.background_color')}
              <Input
                type="color"
                value={form.background_color}
                onChange={(event) => setForm((prev) => ({ ...prev, background_color: event.target.value }))}
              />
            </label>

            <label className="text-sm">
              {t('branding.fields.text_color')}
              <Input
                type="color"
                value={form.text_color}
                onChange={(event) => setForm((prev) => ({ ...prev, text_color: event.target.value }))}
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={() => saveMutation.mutate()}>{t('branding.actions.save')}</Button>
            <Button variant="ghost" onClick={resetDefault}>
              {t('branding.actions.reset')}
            </Button>
            <Button variant="secondary" onClick={() => setBranding(form)}>
              {t('branding.actions.preview')}
            </Button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </Card>

        <Card title={t('branding.previewTitle')}>
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: form.background_color,
              color: form.text_color
            }}
          >
            <h2 style={{ color: form.primary_color }} className="text-xl font-bold">
              {form.app_name}
            </h2>
            <p className="mt-2 text-sm">{t('branding.previewText')}</p>
            <div className="mt-3 h-2 rounded" style={{ backgroundColor: form.secondary_color }} />
          </div>
        </Card>
      </div>
    </PermissionGate>
  );
}
