'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface NpsChartProps {
  promoters: number;
  neutrals: number;
  detractors: number;
}

export function NpsChart({ promoters, neutrals, detractors }: NpsChartProps) {
  const data = [
    { label: 'Promoters', value: promoters },
    { label: 'Neutrals', value: neutrals },
    { label: 'Detractors', value: detractors }
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
