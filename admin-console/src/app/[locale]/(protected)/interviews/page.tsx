'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiClient } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import { useRequiredSession } from '@/hooks/use-required-session';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'success', label: 'Contatado' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
  { value: 'no_answer', label: 'Não atendeu' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'wrong_number', label: 'Nº errado' },
  { value: 'busy', label: 'Ocupado' },
  { value: 'refused', label: 'Recusou' },
];

const STATUS_TONES: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  pending: 'neutral',
  success: 'success',
  in_progress: 'warning',
  completed: 'success',
  scheduled: 'warning',
  no_answer: 'danger',
  wrong_number: 'danger',
  busy: 'warning',
  refused: 'danger',
};

interface ActionItem {
  id: string;
  name: string;
  status: string;
  questionnaire_name: string | null;
  respondent_count: number;
}

interface RespondentItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  external_id: string | null;
  account_name: string | null;
  contact_status: string;
  campaign_id: string;
  job_title: string | null;
  persona_type: string | null;
  region: string | null;
  city: string | null;
  state: string | null;
  segment: string | null;
  metadata_json: Record<string, unknown>;
  scheduled_at: string | null;
}

const PAGE_SIZE = 30;

export default function InterviewsPage() {
  const t = useTranslations('survey');
  const { session } = useRequiredSession();
  const queryClient = useQueryClient();

  const [campaignId, setCampaignId] = useState('');
  const [actionId, setActionId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedContact, setSelectedContact] = useState<RespondentItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Debounce
  const handleSearch = (value: string) => {
    setSearch(value);
    setTimeout(() => { setDebouncedSearch(value); setPage(1); }, 400);
  };

  // Campaigns
  const campaignsQuery = useQuery({
    queryKey: ['admin-interviews', 'campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page: 1, page_size: 100 }),
    enabled: Boolean(session),
  });
  const campaigns = extractItems(campaignsQuery.data);

  // Actions
  const actionsQuery = useQuery({
    queryKey: ['admin-interviews', 'actions', campaignId],
    queryFn: () => apiClient.campaignActions.list(session!, campaignId),
    enabled: Boolean(session && campaignId),
  });
  const actions = (actionsQuery.data ?? []) as ActionItem[];

  // Respondents
  const respondentsQuery = useQuery({
    queryKey: ['admin-interviews', 'respondents', actionId, debouncedSearch, statusFilter, page],
    queryFn: () => apiClient.campaignActions.getRespondents(session!, actionId, {
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    enabled: Boolean(session && actionId),
  });

  const data = respondentsQuery.data as { items?: RespondentItem[]; total?: number } | RespondentItem[] | undefined;
  const respondents: RespondentItem[] = Array.isArray(data) ? data : (data?.items ?? []);
  const total = Array.isArray(data) ? respondents.length : (data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusLabel = (s: string) => STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

  return (
    <PermissionGate permission="campaign.read">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Gestão de Contatos</h1>

        {/* Campaign + Action selection */}
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Campanha</label>
            <Select value={campaignId} onChange={(e) => { setCampaignId(e.target.value); setActionId(''); setPage(1); }}>
              <option value="">Selecione a campanha...</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Ação</label>
            <Select value={actionId} onChange={(e) => { setActionId(e.target.value); setPage(1); }}>
              <option value="">Selecione a ação...</option>
              {actions.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.respondent_count} contatos)</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Search + Status filter */}
        {actionId && (
          <>
            <div className="flex items-center gap-3">
              <Input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar por nome, código, conta ou telefone..."
                className="flex-1"
              />
              <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-48">
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{total} contato{total !== 1 ? 's' : ''}</span>
              <span>Página {page} de {totalPages}</span>
            </div>

            {/* Contact list */}
            <Card>
              {respondentsQuery.isLoading ? (
                <p className="py-4 text-center text-sm text-slate-400">Carregando...</p>
              ) : respondents.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Nenhum contato encontrado</p>
              ) : (
                <Table
                  headers={['Nome', 'Código', 'Conta', 'Telefone', 'Status', 'Ações']}
                  rows={respondents.map((r) => [
                    <div key={`n-${r.id}`}>
                      <span className="font-medium">{r.name}</span>
                      {r.job_title && <span className="block text-xs text-slate-400">{r.job_title}</span>}
                    </div>,
                    <span key={`c-${r.id}`} className="text-xs text-slate-500">{r.external_id || '—'}</span>,
                    r.account_name || '—',
                    r.phone || '—',
                    <Badge key={`s-${r.id}`} tone={STATUS_TONES[r.contact_status] ?? 'neutral'}>
                      {statusLabel(r.contact_status)}
                    </Badge>,
                    <div key={`a-${r.id}`} className="flex gap-1">
                      <Button
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => { setSelectedContact(r); setShowDetail(true); }}
                      >
                        Detalhes
                      </Button>
                    </div>,
                  ])}
                />
              )}
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" className="h-8 px-3 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  ← Anterior
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`h-8 w-8 rounded text-xs font-medium ${p === page ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >{p}</button>
                  );
                })}
                <Button variant="ghost" className="h-8 px-3 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Próxima →
                </Button>
              </div>
            )}
          </>
        )}

        {/* Contact Detail Dialog */}
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Contato</DialogTitle>
            </DialogHeader>
            {selectedContact && (
              <div className="space-y-4">
                <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm md:grid-cols-2">
                  <div><span className="font-semibold text-slate-500">Nome:</span> <span className="text-slate-900">{selectedContact.name}</span></div>
                  <div><span className="font-semibold text-slate-500">Código:</span> {selectedContact.external_id || '—'}</div>
                  <div><span className="font-semibold text-slate-500">Telefone:</span> {selectedContact.phone || '—'}</div>
                  <div><span className="font-semibold text-slate-500">E-mail:</span> {selectedContact.email || '—'}</div>
                  <div><span className="font-semibold text-slate-500">Conta:</span> {selectedContact.account_name || '—'}</div>
                  <div><span className="font-semibold text-slate-500">Cargo:</span> {selectedContact.job_title || '—'}</div>
                  <div><span className="font-semibold text-slate-500">Persona:</span> {selectedContact.persona_type || '—'}</div>
                  <div><span className="font-semibold text-slate-500">Segmento:</span> {selectedContact.segment || '—'}</div>
                  <div><span className="font-semibold text-slate-500">Região:</span> {selectedContact.region || '—'}</div>
                  <div><span className="font-semibold text-slate-500">Cidade/UF:</span> {selectedContact.city || '—'} / {selectedContact.state || '—'}</div>
                  <div><span className="font-semibold text-slate-500">Status:</span> <Badge tone={STATUS_TONES[selectedContact.contact_status] ?? 'neutral'}>{statusLabel(selectedContact.contact_status)}</Badge></div>
                  {selectedContact.scheduled_at && (
                    <div><span className="font-semibold text-slate-500">Agendado:</span> {new Date(selectedContact.scheduled_at).toLocaleString('pt-BR')}</div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowDetail(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
