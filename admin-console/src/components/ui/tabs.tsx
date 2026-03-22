'use client';

import { cn } from '@/lib/utils/cn';
import { createContext, useContext } from 'react';

const TabsContext = createContext<{ value: string; onValueChange: (v: string) => void }>({
  value: '',
  onValueChange: () => {},
});

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex gap-1 rounded-lg bg-slate-100 p-1',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = useContext(TabsContext);
  const active = ctx.value === value;

  return (
    <button
      type="button"
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition',
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
        className
      )}
      onClick={() => ctx.onValueChange(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = useContext(TabsContext);
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}
