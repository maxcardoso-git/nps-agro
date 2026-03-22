'use client';

import { cn } from '@/lib/utils/cn';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onCheckedChange, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition',
        checked ? 'bg-primary' : 'bg-slate-200',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      onClick={() => onCheckedChange(!checked)}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}
