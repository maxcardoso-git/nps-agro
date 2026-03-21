'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table } from '@/components/ui/table';
import { apiClient, ApiError } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import { useRequiredSession } from '@/hooks/use-required-session';

export default function CampaignsPage() {
  const t = useTranslations('campaign');
  const { session } = useRequiredSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    tenant_id: session?.user.tenant_id || '',
    name: '',
    description: '',
    segment: '',
    start_date: '',
    end_date: '',
    questionnaire_version_id: ''
  });

  useEffect(() => {
    if (session?.user.tenant_id && !form.tenant_id) {
      setForm((prev) => ({ ...prev, tenant_id: session.user.tenant_id }));
    }
  }, [session?.user.tenant_id, form.tenant_id]);

  const campaignsQuery = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page: 1, page_size: 50 }),
    enabled: Boolean(session)
  });

  const questionnairesQuery = useQuery({
    queryKey: ['campaigns', 'questionnaires'],
    queryFn: () => apiClient.questionnaires.list(session!, { page: 1, page_size: 50 }),
    enabled: Boolean(session)
  });

  const versionsQuery = useQuery({
    queryKey: ['campaigns', 'questionnaire-versions', questionnairesQuery.dataUpdatedAt],
    queryFn: async () => {
      const questionnaires = extractItems(questionnairesQuery.data);
      const detailed = await Promise.all(
        questionnaires.map((questionnaire) => apiClient.questionnaires.getById(session!, questionnaire.id))
      );

      return detailed
        .flatMap((item) => item.versions || [])
        .filter((version) => version.status === 'published')
        .map((version) => ({
          id: version.id,
          label: `${version.version_number} - ${version.questionnaire_id}`
        }));
    },
    enabled: Boolean(session && questionnairesQuery.data)
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.campaigns.create(session!, {
        name: form.name,
        description: form.description || undefined,
        segment: form.segment || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        questionnaire_version_id: form.questionnaire_version_id,
        tenant_id: form.tenant_id || session!.user.tenant_id,
        channel_config_json: {
          channels: ['manual', 'voice_upload'],
          allow_audio: true
        }
      }),
    onSuccess: () => {
      setForm({
        tenant_id: session?.user.tenant_id || '',
        name: '',
        description: '',
        segment: '',
        start_date: '',
        end_date: '',
        questionnaire_version_id: ''
      });
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'activate' | 'pause' | 'complete' }) => {
      if (action === 'activate') {
        return apiClient.campaigns.activate(session!, id);
      }
      if (action === 'pause') {
        return apiClient.campaigns.pause(session!, id);
      }
      return apiClient.campaigns.complete(session!, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    }
  });

  const campaigns = extractItems(campaignsQuery.data);
  const versions = versionsQuery.data || [];

  return (
    <PermissionGate permission="campaign.read">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>

        <Card title={t('createTitle')}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder={t('fields.tenantId')}
              value={form.tenant_id}
              onChange={(event) => setForm((prev) => ({ ...prev, tenant_id: event.target.value }))}
            />
            <Input
              placeholder={t('fields.name')}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              placeholder={t('fields.segment')}
              value={form.segment}
              onChange={(event) => setForm((prev) => ({ ...prev, segment: event.target.value }))}
            />
            <Input
              placeholder={t('fields.description')}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <Select
              value={form.questionnaire_version_id}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, questionnaire_version_id: event.target.value }))
              }
            >
              <option value="">{t('fields.questionnaireVersion')}</option>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.label}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={form.start_date}
              onChange={(event) => setForm((prev) => ({ ...prev, start_date: event.target.value }))}
            />
            <Input
              type="date"
              value={form.end_date}
              onChange={(event) => setForm((prev) => ({ ...prev, end_date: event.target.value }))}
            />
          </div>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          <div className="mt-3">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.name || !form.questionnaire_version_id || createMutation.isPending}
            >
              {t('actions.create')}
            </Button>
          </div>
        </Card>

        <Card title={t('listTitle')}>
          <Table
            headers={[t('table.name'), t('table.status'), t('table.segment'), t('table.actions')]}
            rows={campaigns.map((campaign) => [
              campaign.name,
              campaign.status,
              campaign.segment || '-',
              <div key={campaign.id} className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => statusMutation.mutate({ id: campaign.id, action: 'activate' })}
                >
                  {t('actions.activate')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => statusMutation.mutate({ id: campaign.id, action: 'pause' })}
                >
                  {t('actions.pause')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => statusMutation.mutate({ id: campaign.id, action: 'complete' })}
                >
                  {t('actions.complete')}
                </Button>
              </div>
            ])}
          />
        </Card>
      </div>
    </PermissionGate>
  );
}
