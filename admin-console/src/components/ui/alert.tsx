import { cn } from '@/lib/utils/cn';

interface AlertProps {
  variant?: 'default' | 'destructive';
  className?: string;
  children: React.ReactNode;
}

const variantClass = {
  default: 'border-slate-200 bg-slate-50 text-slate-700',
  destructive: 'border-red-200 bg-red-50 text-red-700',
};

export function Alert({ variant = 'default', className, children }: AlertProps) {
  return (
    <div className={cn('rounded-lg border p-4 text-sm', variantClass[variant], className)}>
      {children}
    </div>
  );
}

export function AlertDescription({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}
