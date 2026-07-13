import { Skeleton } from '@/components/ui/skeleton';

export function CollectionSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid min-h-[calc(100dvh-10rem)] gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Skeleton className="min-h-80 rounded-xl" />
        <Skeleton className="min-h-[34rem] rounded-xl" />
      </div>
    </div>
  );
}
