import { cn } from '@/lib/utils/cn';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label className={cn('text-sm font-medium text-slate-700', className)} {...props}>
      {children}
    </label>
  );
}
