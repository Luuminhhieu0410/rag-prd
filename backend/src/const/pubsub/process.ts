export const INGESTION_PROGRESS_PATTERN = 'ingestion:progress:*';

export function ingestionProgressChannel(collectionId: string): string {
  return `ingestion:progress:${collectionId}`;
}
