import type { IngestionProgress } from '@/types/ingestion-progress';

export function normalizeProgress(event: IngestionProgress): IngestionProgress {
  const upper = event.totalChunks ?? event.processedChunks;
  return {
    ...event,
    processedChunks: Math.max(0, Math.min(event.processedChunks, upper)),
  };
}

export function ingestionPercentage(
  progress: IngestionProgress,
): number | null {
  if (progress.totalChunks === null) return null;
  if (progress.totalChunks <= 0) return 0;
  return Math.round((progress.processedChunks / progress.totalChunks) * 100);
}
