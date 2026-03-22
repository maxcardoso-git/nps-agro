'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import type { Locale as DateFnsLocale } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient, ApiError } from '@/lib/api/client';
import type { AuthSession, QuestionnaireVersion } from '@/lib/types';
import { useState } from 'react';

const dateFnsLocales: Record<string, DateFnsLocale> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': es,
};

interface VersionHistoryProps {
  versions: QuestionnaireVersion[];
  session: AuthSession;
  questionnaireId: string;
}

export function VersionHistory({ versions, session, questionnaireId }: VersionHistoryProps) {
  const t = useTranslations('formStudio.versions');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const dateFnsLocale = dateFnsLocales[locale] ?? enUS;

  const validateMutation = useMutation({
    mutationFn: (versionId: string) =>
      apiClient.questionnaires.validateVersion(session, versionId),
    onSuccess: () => setError(null),
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('validateError'));
    },
  });

  const publishMutation = useMutation({
    mutationFn: (versionId: string) =>
      apiClient.questionnaires.publishVersion(session, versionId),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['questionnaire', questionnaireId] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('publishError'));
    },
  });

  const statusTone = (s: string) => {
    if (s === 'published') return 'success' as const;
    if (s === 'archived') return 'danger' as const;
    return 'neutral' as const;
  };

  if (versions.length === 0) {
    return <p className="text-sm text-slate-400">{t('empty')}</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {versions.map((v) => (
        <div
          key={v.id}
          className="rounded-lg border border-slate-200 p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">v{v.version_number}</span>
              <Badge tone={statusTone(v.status)}>{v.status}</Badge>
            </div>
            {v.published_at && (
              <span className="text-xs text-slate-400">
                {formatDistanceToNow(new Date(v.published_at), {
                  addSuffix: true,
                  locale: dateFnsLocale,
                })}
              </span>
            )}
          </div>

          {v.status === 'draft' && (
            <div className="mt-2 flex gap-2">
              <Button
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => validateMutation.mutate(v.id)}
                disabled={validateMutation.isPending}
              >
                {t('validate')}
              </Button>
              <Button
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => publishMutation.mutate(v.id)}
                disabled={publishMutation.isPending}
              >
                {t('publish')}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
