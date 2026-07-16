import { Card, CardContent } from '@/components/ui/card.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';

export function HomeSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className="h-[222px] ring-0">
          <CardContent className="flex h-full flex-col justify-between p-6">
            <div className="flex items-start justify-between">
              <Skeleton className="size-14" />
              <Skeleton className="size-7 rounded-lg" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
