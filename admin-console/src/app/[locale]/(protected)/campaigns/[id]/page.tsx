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
  const [showEdit, setShowEdit] = useState(false);
  const [showEditCampaign, setShowEditCampaign] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importActionId, setImportActionId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [actionForm, setActionForm] = useState({ name: '', questionnaire_version_id: '', description: '' });
  const [campaignForm, setCampaignForm] = useState({ name: '', description: '', segment: '', start_date: '', end_date: '' });
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

  const questionnairesQuery = useQuery({
    queryKey: ['questionnaires-for-actions'],
    queryFn: () => apiClient.questionnaires.list(session!, { page_size: 200 }),
    enabled: Boolean(session && (showCreate || showEdit)),
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

  const editMutation = useMutation({
    mutationFn: () =>
      apiClient.campaignActions.update(session!, campaignId, editingActionId!, {
        name: actionForm.name,
        description: actionForm.description || undefined,
      }),
    onSuccess: () => {
      setShowEdit(false);
      setEditingActionId(null);
      setActionForm({ name: '', questionnaire_version_id: '', description: '' });
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['campaign-actions', campaignId] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    },
  });

  const editCampaignMutation = useMutation({
    mutationFn: () =>
      apiClient.campaigns.update(session!, campaignId, {
        name: campaignForm.name,
        description: campaignForm.description || undefined,
        segment: campaignForm.segment || undefined,
        start_date: campaignForm.start_date || undefined,
        end_date: campaignForm.end_date || undefined,
      }),
    onSuccess: () => {
      setShowEditCampaign(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    },
  });

  const openEditCampaign = () => {
    if (!campaign) return;
    setCampaignForm({
      name: campaign.name,
      description: campaign.description || '',
      segment: campaign.segment || '',
      start_date: campaign.start_date || '',
      end_date: campaign.end_date || '',
    });
    setError(null);
    setShowEditCampaign(true);
  };

  const openEdit = (a: { id: string; name: string; description: string | null }) => {
    setEditingActionId(a.id);
    setActionForm({ name: a.name, description: a.description || '', questionnaire_version_id: '' });
    setError(null);
    setShowEdit(true);
  };

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
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge tone={statusTone(campaign.status)}>{campaign.status}</Badge>
                  {campaign.segment && <Badge tone="neutral">{campaign.segment}</Badge>}
                </div>
                {campaign.description && (
                  <p className="text-sm text-slate-600">{campaign.description}</p>
                )}
                <div className="flex gap-4 text-xs text-slate-500">
                  {campaign.start_date && <span>{t('startDate')}: {campaign.start_date}</span>}
                  {campaign.end_date && <span>{t('endDate')}: {campaign.end_date}</span>}
                </div>
              </div>
              <Button variant="ghost" className="h-7 px-2 text-xs" onClick={openEditCampaign}>
                {t('editCampaign')}
              </Button>
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
                <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(a)}>
                  {t('edit')}
                </Button>
                <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setImportActionId(a.id); setImportResult(null); setShowImport(true); }}>
                  {t('import')}
                </Button>
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
        {/* Edit Action Dialog */}
        <Dialog open={showEdit} onOpenChange={setShowEdit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('editActionTitle')}</DialogTitle>
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
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowEdit(false)}>{t('cancel')}</Button>
              <Button
                onClick={() => editMutation.mutate()}
                disabled={!actionForm.name || editMutation.isPending}
              >
                {t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Import CSV Dialog */}
        <Dialog open={showImport} onOpenChange={setShowImport}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('importTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-slate-600">{t('importHint')}</p>
              <input
                type="file"
                accept=".csv,.txt"
                className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:text-white"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !importActionId) return;

                  setImportResult(null);
                  setError(null);

                  try {
                    const text = await file.text();
                    const lines = text.split('\n').filter((l) => l.trim());
                    if (lines.length < 2) { setError(t('importEmpty')); return; }

                    const header = lines[0].split(';').map((h) => h.trim().toLowerCase());
                    const iNome = header.indexOf('nome');
                    const iCelular = header.indexOf('celular');
                    const iConta = header.indexOf('conta');
                    const iCargo = header.indexOf('cargo');
                    const iTipo = header.indexOf('tipo_persona');
                    const iCodigo = header.indexOf('codigo');

                    if (iNome < 0) { setError(t('importMissingName')); return; }

                    const contacts = lines.slice(1).map((line) => {
                      const cols = line.split(';').map((c) => c.trim());
                      return {
                        nome: cols[iNome] || '',
                        celular: iCelular >= 0 ? cols[iCelular] : undefined,
                        conta: iConta >= 0 ? cols[iConta] : undefined,
                        cargo: iCargo >= 0 ? cols[iCargo] : undefined,
                        tipo_persona: iTipo >= 0 ? cols[iTipo] : undefined,
                        codigo: iCodigo >= 0 ? cols[iCodigo] : undefined,
                      };
                    }).filter((c) => c.nome);

                    const result = await apiClient.campaignActions.importContacts(
                      session!, campaignId, importActionId, contacts,
                    );

                    setImportResult(`${result.imported} ${t('importedContacts')}, ${result.accounts_created} ${t('importedAccounts')}`);
                    queryClient.invalidateQueries({ queryKey: ['campaign-actions', campaignId] });
                  } catch (cause) {
                    setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
                  }
                }}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              {importResult && <p className="text-sm text-emerald-600">{importResult}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowImport(false)}>{t('cancel')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Edit Campaign Dialog */}
        <Dialog open={showEditCampaign} onOpenChange={setShowEditCampaign}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('editCampaignTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder={t('campaignName')}
                value={campaignForm.name}
                onChange={(e) => setCampaignForm((p) => ({ ...p, name: e.target.value }))}
              />
              <Input
                placeholder={t('campaignDescription')}
                value={campaignForm.description}
                onChange={(e) => setCampaignForm((p) => ({ ...p, description: e.target.value }))}
              />
              <Select
                value={campaignForm.segment}
                onChange={(e) => setCampaignForm((p) => ({ ...p, segment: e.target.value }))}
              >
                <option value="">{t('segmentSelect')}</option>
                <option value="cooperativa">Cooperativa</option>
                <option value="revenda">Revenda</option>
                <option value="produtor">Produtor</option>
                <option value="venda_direta">Venda Direta</option>
                <option value="kam">KAM</option>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{t('startDate')}</label>
                  <Input type="date" value={campaignForm.start_date} onChange={(e) => setCampaignForm((p) => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{t('endDate')}</label>
                  <Input type="date" value={campaignForm.end_date} onChange={(e) => setCampaignForm((p) => ({ ...p, end_date: e.target.value }))} />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowEditCampaign(false)}>{t('cancel')}</Button>
              <Button
                onClick={() => editCampaignMutation.mutate()}
                disabled={!campaignForm.name || editCampaignMutation.isPending}
              >
                {t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
