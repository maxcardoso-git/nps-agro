'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface SentimentItem {
  sentiment: string;
  count: number;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#16a34a',
  neutral: '#60a5fa',
  negative: '#ef4444',
  mixed: '#f59e0b',
  unknown: '#94a3b8',
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Positivo',
  neutral: 'Neutro',
  negative: 'Negativo',
  mixed: 'Misto',
  unknown: 'Desconhecido',
};

export function SentimentPieChart({ data }: { data: SentimentItem[] }) {
  const labeled = data.map((d) => ({ ...d, name: SENTIMENT_LABELS[d.sentiment] || d.sentiment }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={labeled} dataKey="count" nameKey="name" outerRadius={80} label>
            {labeled.map((item, index) => (
              <Cell key={`${item.sentiment}-${index}`} fill={SENTIMENT_COLORS[item.sentiment] || '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
