import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface InsightCardProps {
  title: string;
  description: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}

export function InsightCard({ title, description, tone = 'neutral' }: InsightCardProps) {
  return (
    <Card>
      <div className="mb-2">
        <Badge tone={tone}>{title}</Badge>
      </div>
      <p className="text-sm text-slate-700">{description}</p>
    </Card>
  );
}
