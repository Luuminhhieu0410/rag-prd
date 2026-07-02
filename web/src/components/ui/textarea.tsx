import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-24 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-950 shadow-sm shadow-zinc-950/[0.02] outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-950/5 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Textarea };
