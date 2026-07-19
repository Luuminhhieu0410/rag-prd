export const DEFAULT_INGESTION_CONCURRENCY = 2;

export function parseIngestionConcurrency(value: unknown): number {
  if (value === '') return DEFAULT_INGESTION_CONCURRENCY;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_INGESTION_CONCURRENCY;
}
