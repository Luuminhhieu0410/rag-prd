import * as React from 'react';
import { LoaderIcon } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <LoaderIcon
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}
export function FullPageLoader({ message }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background text-muted-foreground">
      {message && (
        <p role="status" aria-live="polite" className="text-xl">
          {message}
        </p>
      )}
      <Spinner
        aria-hidden={message ? true : undefined}
        className={cn(
          'size-8 text-ring motion-reduce:animate-none',
          message && 'size-12',
        )}
      />
    </div>
  );
}
