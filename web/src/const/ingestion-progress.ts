import type { DocumentStatus } from '@/types/api';

export const ACTIVE_INGESTION_STATUSES: readonly DocumentStatus[] = [
  'uploaded',
  'processing',
  'chunking',
  'embedding',
];
export const TERMINAL_INGESTION_STATUSES = ['ready', 'failed'] as const;
export const SSE_RETRY_INITIAL_MS = 1_000;
export const SSE_RETRY_MAX_MS = 15_000;

export function isActiveIngestionStatus(status: DocumentStatus): boolean {
  return ACTIVE_INGESTION_STATUSES.includes(status);
}
