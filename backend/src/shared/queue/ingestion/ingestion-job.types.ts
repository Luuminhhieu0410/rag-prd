export interface IngestionJobData {
  documentId: string;
  rawObjectPath: string;
}

export interface IngestionFileMetadata {
  originalName: string | null;
  mimeType: string;
  byteSize: string;
  sourceType: string;
  rawObjectPath: string;
}
