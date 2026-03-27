'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { api, extractItems } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';

export default function CampaignsListPage() {
  const t = useTranslations('interviewer.campaigns');
  const { session } = useAuth();
  const router = useRouter();
  const { locale } = useParams();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const query = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.campaigns.list(session!, { page_size: 100 }),
    enabled: Boolean(session),
  });

  const allCampaigns = extractItems(query.data);
  const campaigns = allCampaigns.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.segment || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusTone = (s: string) => {
    if (s === 'active') return 'success' as const;
    if (s === 'paused') return 'warning' as const;
    if (s === 'completed') return 'success' as const;
    return 'neutral' as const;
  };

  const statusLabel = (s: string) => {
    const labels: Record<string, string> = { active: 'Ativa', paused: 'Pausada', completed: 'Concluída', draft: 'Rascunho' };
    return labels[s] || s;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>

      {/* Filters */}
      <div className="space-y-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou segmento..."
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full md:w-48">
          <option value="">Todos os status</option>
          <option value="active">Ativa</option>
          <option value="paused">Pausada</option>
          <option value="completed">Concluída</option>
          <option value="draft">Rascunho</option>
        </Select>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-slate-400">{t('loading')}</p>
      ) : campaigns.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t('empty')}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {campaigns.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer transition hover:border-primary/50 hover:shadow-md"
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => router.push(`/${locale}/campaigns/${c.id}`)}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-slate-900">{c.name}</h3>
                  <Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge>
                </div>
                {c.segment && (
                  <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{c.segment}</span>
                )}
                {c.description && (
                  <p className="mt-2 text-xs text-slate-500 line-clamp-2">{c.description}</p>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                  {c.start_date && <span>Início: {new Date(c.start_date).toLocaleDateString('pt-BR')}</span>}
                  {c.end_date && <span>Fim: {new Date(c.end_date).toLocaleDateString('pt-BR')}</span>}
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
