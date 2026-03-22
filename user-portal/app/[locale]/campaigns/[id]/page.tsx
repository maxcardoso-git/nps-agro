'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';

export default function CampaignActionsPage() {
  const t = useTranslations('interviewer.actions');
  const { session } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const locale = params.locale as string;

  const actionsQuery = useQuery({
    queryKey: ['actions', campaignId],
    queryFn: () => api.actions.list(session!, campaignId),
    enabled: Boolean(session && campaignId),
  });

  const actions = actionsQuery.data ?? [];

  const statusTone = (s: string) => {
    if (s === 'active') return 'success' as const;
    if (s === 'paused') return 'warning' as const;
    if (s === 'completed') return 'success' as const;
    return 'neutral' as const;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => router.push(`/${locale}/campaigns`)}>
          ← {t('back')}
        </Button>
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>
      </div>

      {actionsQuery.isLoading ? (
        <p className="text-sm text-slate-400">{t('loading')}</p>
      ) : actions.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t('empty')}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {actions.map((action) => (
            <Card key={action.id} className="cursor-pointer transition hover:border-primary/50">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => router.push(`/${locale}/actions/${action.id}`)}
              >
                <h3 className="font-medium text-slate-900">{action.name}</h3>
                {action.description && (
                  <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(action.status)}>{action.status}</Badge>
                  {action.questionnaire_name && (
                    <span className="text-xs text-slate-400">{action.questionnaire_name}</span>
                  )}
                  <span className="text-xs text-slate-400">
                    {action.respondent_count} {t('contacts')}
                  </span>
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
