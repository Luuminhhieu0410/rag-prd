export type IngestionProgressStatus =
  | 'uploaded'
  | 'processing'
  | 'ready'
  | 'failed';

export interface IngestionProgressEvent {
  jobId: string;
  collectionId: string;
  documentId: string;
  status: IngestionProgressStatus;
  processedChunks: number;
  totalChunks: number | null;
  errorMessage?: string | null;
}
