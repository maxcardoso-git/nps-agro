import { cn } from '@/lib/utils/cn';

interface CardProps {
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function Card({ title, className, children }: CardProps) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      {title ? <h2 className="mb-3 text-base font-semibold text-slate-800">{title}</h2> : null}
      {children}
    </section>
  );
}
