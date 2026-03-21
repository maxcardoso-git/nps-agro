import { cn } from '@/lib/utils';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none',
        'focus:border-primary focus:ring-2 focus:ring-primary/20',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
