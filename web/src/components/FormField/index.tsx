import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('grid gap-2 text-sm', className)}>
      <span className="font-medium text-zinc-800">{label}</span>
      {children}
    </label>
  );
}
