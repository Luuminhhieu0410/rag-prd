export const INGESTION_QUEUE = 'ingestion';

export interface IngestionJobData {
  documentId: string;
  /** Đường dẫn object trên Storage để worker tải file gốc (không lưu vào DB). */
  rawObjectPath: string;
}
