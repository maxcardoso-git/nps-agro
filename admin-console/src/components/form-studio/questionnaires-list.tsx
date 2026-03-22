'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Plus, Search, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiClient, ApiError } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import type { AuthSession, Questionnaire } from '@/lib/types';

interface QuestionnairesListProps {
  session: AuthSession;
  onSelect: (questionnaire: Questionnaire) => void;
}

export function QuestionnairesList({ session, onSelect }: QuestionnairesListProps) {
  const t = useTranslations('formStudio.list');
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['questionnaires', { search, status: statusFilter }],
    queryFn: () =>
      apiClient.questionnaires.list(session, {
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page: 1,
        page_size: 100,
      }),
    enabled: Boolean(session),
  });

  const questionnaires = extractItems(listQuery.data);

  const filtered = useMemo(() => {
    let items = questionnaires;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      items = items.filter((item) => item.status === statusFilter);
    }
    return items;
  }, [questionnaires, search, statusFilter]);

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.questionnaires.create(session, {
        tenant_id: session.user.tenant_id,
        name: createForm.name,
        description: createForm.description || undefined,
      }),
    onSuccess: (result) => {
      setShowCreateDialog(false);
      setCreateForm({ name: '', description: '' });
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      onSelect(result);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('createError'));
    },
  });

  const cloneMutation = useMutation({
    mutationFn: async (source: Questionnaire) => {
      // 1. Fetch source with versions
      const detail = await apiClient.questionnaires.getById(session, source.id);
      const versions = detail.versions ?? [];
      const latestVersion = versions.find((v) => v.status === 'published') ?? versions[0];

      // 2. Create new questionnaire
      const cloned = await apiClient.questionnaires.create(session, {
        tenant_id: session.user.tenant_id,
        name: `${source.name} (${t('copy')})`,
        description: source.description || undefined,
      });

      // 3. Copy schema if available
      if (latestVersion?.schema_json && latestVersion.schema_json.questions?.length > 0) {
        try {
          await apiClient.questionnaires.createVersion(session, cloned.id, {
            schema_json: latestVersion.schema_json as unknown as Record<string, unknown>,
          });
        } catch {
          // Version copy failed but questionnaire was created — continue
        }
      }

      return cloned;
    },
    onSuccess: (result) => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      onSelect(result);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('cloneError'));
    },
  });

  const statusTone = (s: string) => {
    if (s === 'published') return 'success' as const;
    if (s === 'archived') return 'danger' as const;
    if (s === 'draft') return 'warning' as const;
    return 'neutral' as const;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-1">
          <Plus className="h-4 w-4" />
          {t('create')}
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">{t('filterAll')}</TabsTrigger>
            <TabsTrigger value="draft">{t('filterDraft')}</TabsTrigger>
            <TabsTrigger value="published">{t('filterPublished')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      {listQuery.isLoading ? (
        <p className="text-sm text-slate-400">{t('loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t('empty')}</p>
      ) : (
        <Table
          headers={[t('colName'), t('colStatus'), t('colCreated'), '']}
          rows={filtered.map((q) => [
            <button
              key={q.id}
              type="button"
              className="text-left font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => onSelect(q)}
            >
              {q.name}
            </button>,
            <Badge key={`s-${q.id}`} tone={statusTone(q.status)}>
              {q.status}
            </Badge>,
            q.created_at
              ? new Date(q.created_at).toLocaleDateString()
              : '—',
            <div key={`a-${q.id}`} className="flex gap-1">
              <Button
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onSelect(q)}
              >
                {t('edit')}
              </Button>
              <Button
                variant="ghost"
                className="h-7 px-2 text-xs gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  cloneMutation.mutate(q);
                }}
                disabled={cloneMutation.isPending}
              >
                <Copy className="h-3 w-3" />
                {t('clone')}
              </Button>
            </div>,
          ])}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder={t('namePlaceholder')}
              value={createForm.name}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder={t('descriptionPlaceholder')}
              value={createForm.description}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!createForm.name || createMutation.isPending}
            >
              {createMutation.isPending ? t('creating') : t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
