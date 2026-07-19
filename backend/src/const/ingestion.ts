export const BATCH_SIZE_DOCUMENT_CHUNKS = 5;
export const INGESTION_JOB_ATTEMPTS = 5;
export const INGESTION_JOB_BACKOFF_MS = 5_000;
export const ingestionJobId = (documentId: string) => `ingestion-${documentId}`;
