export interface IngestionProgress {
  jobId: string;
  collectionId: string;
  documentId: string;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  processedChunks: number;
  totalChunks: number | null;
  errorMessage?: string | null;
}

export type IngestionProgressMap = Record<string, IngestionProgress>;
