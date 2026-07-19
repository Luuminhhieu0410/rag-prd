import { normalizeProgress } from '@/helpers/ingestion/normalize-progress';
import type {
  IngestionProgress,
  IngestionProgressMap,
} from '@/types/ingestion-progress';

export function isIngestionProgress(
  value: unknown,
): value is IngestionProgress {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<IngestionProgress>;
  return Boolean(
    event.jobId && event.collectionId && event.documentId && event.status,
  );
}

export function progressSnapshot(value: unknown): IngestionProgressMap | null {
  if (!Array.isArray(value)) return null;
  return value.reduce<IngestionProgressMap>((map, item) => {
    if (isIngestionProgress(item))
      map[item.documentId] = normalizeProgress(item);
    return map;
  }, {});
}
