import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center px-5 py-12 text-center">
      <div className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-600 shadow-sm shadow-zinc-950/[0.02]">
        <Icon className="size-5" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-12 animate-pulse rounded-xl bg-zinc-100"
        />
      ))}
    </div>
  );
}
