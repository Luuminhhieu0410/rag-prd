import { Progress } from '@/components/ui/progress';
import { ingestionPercentage } from '@/helpers/ingestion/normalize-progress';
import type { IngestionProgress } from '@/types/ingestion-progress';
import { useTranslation } from 'react-i18next';

export function SourceIngestionProgress({
  progress,
}: {
  progress?: IngestionProgress;
}) {
  const { t } = useTranslation();
  if (!progress || progress.status === 'ready' || progress.status === 'failed')
    return null;
  const percent = ingestionPercentage(progress);
  return (
    <div className="mt-2 space-y-1">
      <Progress value={percent} />
      <p className="text-[11px] text-muted-foreground tabular-nums">
        {percent === null
          ? t(
              `collection.sources.${progress.status === 'uploaded' ? 'waiting' : 'preparing'}`,
            )
          : t('collection.sources.chunkProgress', {
              processed: progress.processedChunks,
              total: progress.totalChunks,
              percent,
            })}
      </p>
    </div>
  );
}
