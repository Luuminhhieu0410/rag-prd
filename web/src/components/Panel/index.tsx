import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-emerald-950/10 bg-[oklch(0.99_0.003_155)]',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-emerald-950/10 px-5 py-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold text-zinc-950">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
