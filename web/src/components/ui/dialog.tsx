import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export function Dialog({
  open,
  title,
  description,
  children,
  onOpenChange,
  className,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  className?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/35 px-4 py-6 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(
          'w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/20',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 id="dialog-title" className="text-base font-semibold text-zinc-950">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Close"
            onClick={() => onOpenChange(false)}
          >
            <X />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}
