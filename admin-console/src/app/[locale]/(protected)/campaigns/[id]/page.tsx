'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiClient, ApiError } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import { useRequiredSession } from '@/hooks/use-required-session';

export default function CampaignDetailPage() {
  const t = useTranslations('campaignDetail');
  const { session } = useRequiredSession();
  const queryClient = useQueryClient();
  const params = useParams();
  const campaignId = params.id as string;

  const [showCreate, setShowCreate] = useState(false);
  const [actionForm, setActionForm] = useState({ name: '', questionnaire_version_id: '', description: '' });
  const [error, setError] = useState<string | null>(null);

  // Fetch campaign
  const campaignQuery = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => apiClient.campaigns.getById(session!, campaignId),
    enabled: Boolean(session && campaignId),
  });

  // Fetch actions
  const actionsQuery = useQuery({
    queryKey: ['campaign-actions', campaignId],
    queryFn: () => apiClient.campaignActions.list(session!, campaignId),
    enabled: Boolean(session && campaignId),
  });

  // Fetch questionnaire versions for the create dialog
  const questionnairesQuery = useQuery({
    queryKey: ['questionnaires-for-actions'],
    queryFn: () => apiClient.questionnaires.list(session!, { page_size: 200 }),
    enabled: Boolean(session && showCreate),
  });

  const campaign = campaignQuery.data;
  const actions = (actionsQuery.data ?? []) as Array<{
    id: string; name: string; description: string | null;
    questionnaire_name: string | null; status: string;
    respondent_count: number; interviewer_count: number;
  }>;
  const questionnaires = extractItems(questionnairesQuery.data);

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.campaignActions.create(session!, campaignId, {
        name: actionForm.name,
        description: actionForm.description || undefined,
        questionnaire_version_id: actionForm.questionnaire_version_id,
      }),
    onSuccess: () => {
      setShowCreate(false);
      setActionForm({ name: '', questionnaire_version_id: '', description: '' });
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['campaign-actions', campaignId] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    },
  });

  const activateMutation = useMutation({
    mutationFn: (actionId: string) => apiClient.campaignActions.activate(session!, campaignId, actionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign-actions', campaignId] }),
  });

  const pauseMutation = useMutation({
    mutationFn: (actionId: string) => apiClient.campaignActions.pause(session!, campaignId, actionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign-actions', campaignId] }),
  });

  const statusTone = (s: string) => {
    if (s === 'active') return 'success' as const;
    if (s === 'paused') return 'warning' as const;
    if (s === 'completed') return 'success' as const;
    return 'neutral' as const;
  };

  return (
    <PermissionGate permission="campaign.read">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          {campaign?.name || t('loading')}
        </h1>

        {campaign && (
          <Card>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Badge tone={statusTone(campaign.status)}>{campaign.status}</Badge>
              {campaign.segment && <span>{campaign.segment}</span>}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{t('actionsTitle')}</h2>
          <Button onClick={() => setShowCreate(true)}>{t('createAction')}</Button>
        </div>

        {actionsQuery.isLoading ? (
          <p className="text-sm text-slate-400">{t('loading')}</p>
        ) : actions.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">{t('noActions')}</p>
        ) : (
          <Table
            headers={[t('colName'), t('colForm'), t('colContacts'), t('colStatus'), t('colActions')]}
            rows={actions.map((a) => [
              <div key={`n-${a.id}`}>
                <span className="font-medium">{a.name}</span>
                {a.description && <span className="block text-xs text-slate-400">{a.description}</span>}
              </div>,
              a.questionnaire_name || '—',
              a.respondent_count,
              <Badge key={`s-${a.id}`} tone={statusTone(a.status)}>{a.status}</Badge>,
              <div key={`a-${a.id}`} className="flex gap-1">
                {a.status === 'draft' && (
                  <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => activateMutation.mutate(a.id)}>
                    {t('activate')}
                  </Button>
                )}
                {a.status === 'active' && (
                  <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => pauseMutation.mutate(a.id)}>
                    {t('pause')}
                  </Button>
                )}
                {a.status === 'paused' && (
                  <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => activateMutation.mutate(a.id)}>
                    {t('activate')}
                  </Button>
                )}
              </div>,
            ])}
          />
        )}

        {/* Create Action Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('createActionTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder={t('actionName')}
                value={actionForm.name}
                onChange={(e) => setActionForm((p) => ({ ...p, name: e.target.value }))}
              />
              <Input
                placeholder={t('actionDescription')}
                value={actionForm.description}
                onChange={(e) => setActionForm((p) => ({ ...p, description: e.target.value }))}
              />
              <Select
                value={actionForm.questionnaire_version_id}
                onChange={(e) => setActionForm((p) => ({ ...p, questionnaire_version_id: e.target.value }))}
              >
                <option value="">{t('selectForm')}</option>
                {questionnaires.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                ))}
              </Select>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>{t('cancel')}</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!actionForm.name || !actionForm.questionnaire_version_id || createMutation.isPending}
              >
                {t('create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
