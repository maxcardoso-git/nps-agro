'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface SentimentItem {
  sentiment: string;
  count: number;
}

interface SentimentPieChartProps {
  data: SentimentItem[];
}

const COLORS = ['#16a34a', '#60a5fa', '#ef4444', '#f59e0b', '#94a3b8'];

export function SentimentPieChart({ data }: SentimentPieChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="sentiment" outerRadius={90} label>
            {data.map((entry, index) => (
              <Cell key={`${entry.sentiment}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
