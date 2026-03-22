'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { api, extractItems } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';

export default function CampaignsListPage() {
  const t = useTranslations('interviewer.campaigns');
  const { session } = useAuth();
  const router = useRouter();
  const { locale } = useParams();

  const query = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.campaigns.list(session!, { status: 'active', page_size: 100 }),
    enabled: Boolean(session),
  });

  const campaigns = extractItems(query.data);

  const statusTone = (s: string) => {
    if (s === 'active') return 'success' as const;
    if (s === 'paused') return 'warning' as const;
    return 'neutral' as const;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>

      {query.isLoading ? (
        <p className="text-sm text-slate-400">{t('loading')}</p>
      ) : campaigns.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t('empty')}</p>
      ) : (
        <Table
          emptyLabel={t('empty')}
          headers={[t('colName'), t('colSegment'), t('colStatus'), '']}
          rows={campaigns.map((c) => [
            c.name,
            c.segment || '—',
            <Badge key={`s-${c.id}`} tone={statusTone(c.status)}>
              {c.status}
            </Badge>,
            <Button
              key={`a-${c.id}`}
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => router.push(`/${locale}/campaigns/${c.id}`)}
            >
              {t('open')}
            </Button>,
          ])}
        />
      )}
    </div>
  );
}
