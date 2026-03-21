import { Card } from '@/components/ui/Card';

interface TopTopicsProps {
  title: string;
  topics: Array<{ topic: string; frequency: number }>;
  emptyLabel: string;
}

export function TopTopics({ title, topics, emptyLabel }: TopTopicsProps) {
  return (
    <Card title={title}>
      {topics.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {topics.map((item) => (
            <li key={item.topic} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm">
              <span>{item.topic}</span>
              <span className="font-semibold text-primary">{item.frequency}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
