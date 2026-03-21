import { Card } from '@/components/ui/Card';

interface KpiCardProps {
  label: string;
  value: string | number;
}

export function KpiCard({ label, value }: KpiCardProps) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
    </Card>
  );
}
