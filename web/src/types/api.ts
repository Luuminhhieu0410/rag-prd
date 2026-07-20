export interface CountSummary {
  documents: number;
  conversations: number;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: CountSummary;
}

export type DocumentStatus =
  | 'uploaded'
  | 'parsing'
  | 'processing'
  | 'chunking'
  | 'embedding'
  | 'ready'
  | 'failed';

export interface DocumentRecord {
  id: string;
  collectionId: string;
  userId: string;
  sourceType: string;
  sourceUrl: string | null;
  originalName: string | null;
  rawPath?: string | null;
  textPath: string | null;
  byteSize: string | null;
  status: DocumentStatus;
  errorMessage: string | null;
  pageCount: number | null;
  chunkCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentContentSection {
  id: string;
  index: number;
  page: number | null;
  content: string;
}

export interface DocumentContentResponse {
  document: {
    id: string;
    name: string | null;
    sourceType: string;
    pageCount: number | null;
  };
  sections: DocumentContentSection[];
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreatedApiKey {
  id: string;
  name: string;
  prefix: string;
  key: string;
}
