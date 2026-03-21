'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { apiClient, ApiError } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import { useRequiredSession } from '@/hooks/use-required-session';

const defaultSchema = {
  meta: {
    name: 'NPS Example',
    segment: 'General',
    version: 1
  },
  questions: [
    {
      id: 'nps',
      label: 'How likely are you to recommend us?',
      type: 'nps',
      required: true,
      scale: { min: 0, max: 10 }
    }
  ]
};

export default function QuestionnairesPage() {
  const t = useTranslations('questionnaire');
  const { session } = useRequiredSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState<string>('');
  const [schemaText, setSchemaText] = useState(JSON.stringify(defaultSchema, null, 2));

  const [createForm, setCreateForm] = useState({
    name: '',
    description: ''
  });

  const listQuery = useQuery({
    queryKey: ['questionnaires'],
    queryFn: () => apiClient.questionnaires.list(session!, { page: 1, page_size: 50 }),
    enabled: Boolean(session)
  });

  const detailQuery = useQuery({
    queryKey: ['questionnaire', selectedQuestionnaireId],
    queryFn: () => apiClient.questionnaires.getById(session!, selectedQuestionnaireId),
    enabled: Boolean(session && selectedQuestionnaireId)
  });

  const questionnaires = extractItems(listQuery.data);

  const selectedVersions = useMemo(
    () => detailQuery.data?.versions || [],
    [detailQuery.data?.versions]
  );

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.questionnaires.create(session!, {
        tenant_id: session!.user.tenant_id,
        name: createForm.name,
        description: createForm.description || undefined
      }),
    onSuccess: () => {
      setCreateForm({ name: '', description: '' });
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    }
  });

  const createVersionMutation = useMutation({
    mutationFn: async () => {
      const schema_json = JSON.parse(schemaText) as Record<string, unknown>;
      return apiClient.questionnaires.createVersion(session!, selectedQuestionnaireId, { schema_json });
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['questionnaire', selectedQuestionnaireId] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.invalidSchema'));
    }
  });

  const validateMutation = useMutation({
    mutationFn: (versionId: string) => apiClient.questionnaires.validateVersion(session!, versionId),
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    }
  });

  const publishMutation = useMutation({
    mutationFn: (versionId: string) => apiClient.questionnaires.publishVersion(session!, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaire', selectedQuestionnaireId] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    }
  });

  return (
    <PermissionGate permission="questionnaire.read">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>

        <Card title={t('createTitle')}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder={t('fields.name')}
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              placeholder={t('fields.description')}
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
          <div className="mt-3">
            <Button onClick={() => createMutation.mutate()} disabled={!createForm.name}>
              {t('actions.create')}
            </Button>
          </div>
        </Card>

        <Card title={t('listTitle')}>
          <Table
            headers={[t('table.name'), t('table.status'), t('table.id')]}
            rows={questionnaires.map((q) => [
              <button
                key={q.id}
                className="text-left font-medium text-primary underline"
                onClick={() => setSelectedQuestionnaireId(q.id)}
              >
                {q.name}
              </button>,
              q.status,
              q.id
            ])}
          />
        </Card>

        <Card title={t('versionEditorTitle')}>
          <p className="mb-2 text-sm text-slate-600">{t('selectedQuestionnaire')}: {selectedQuestionnaireId || '-'}</p>
          <Textarea rows={14} value={schemaText} onChange={(event) => setSchemaText(event.target.value)} />
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => createVersionMutation.mutate()}
              disabled={!selectedQuestionnaireId || createVersionMutation.isPending}
            >
              {t('actions.createVersion')}
            </Button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </Card>

        <Card title={t('versionsTitle')}>
          <Table
            headers={[t('table.version'), t('table.status'), t('table.actions')]}
            rows={selectedVersions.map((version) => [
              version.version_number,
              version.status,
              <div key={version.id} className="flex gap-2">
                <Button variant="ghost" onClick={() => validateMutation.mutate(version.id)}>
                  {t('actions.validate')}
                </Button>
                <Button variant="ghost" onClick={() => publishMutation.mutate(version.id)}>
                  {t('actions.publish')}
                </Button>
              </div>
            ])}
          />
        </Card>
      </div>
    </PermissionGate>
  );
}
