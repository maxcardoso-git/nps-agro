import { Card } from '@/components/ui/Card';

export function NpsScore({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-5xl font-black text-primary">{value}</p>
    </Card>
  );
}
