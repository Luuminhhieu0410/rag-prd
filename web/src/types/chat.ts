export interface ChunkCitation {
  kind: 'chunk';
  number: number;
  documentId: string;
  chunkId: string;
  documentName: string;
  page: number | null;
  excerpt: string;
  score: number;
}

export interface StructuredCitation {
  kind: 'structured';
  number: number;
  documentId: string;
  documentName: string;
  datasetId: string;
  datasetName: string;
  rowId: string;
  table: number | null;
  row: number;
  excerpt: string;
}

export type ChatCitation = ChunkCitation | StructuredCitation;

export interface StructuredResultMeta {
  operation: string;
  exact: boolean;
  truncated: boolean;
  totalRows: number;
  consideredRows: number;
  nullCells: number;
  invalidCells: number;
  notes: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: ChatCitation[];
  structuredResultMeta: StructuredResultMeta | null;
  createdAt: string;
  incomplete?: boolean;
}

export interface ChatHistoryPage {
  conversationId: string | null;
  messages: ChatMessage[];
  nextCursor: string | null;
}

export type ChatStage = 'analyzing' | 'retrieving' | 'querying' | 'generating';

export type ChatStreamEvent =
  | { event: 'accepted'; data: { userMessage: ChatMessage } }
  | { event: 'status'; data: { stage: ChatStage } }
  | { event: 'token'; data: { delta: string } }
  | { event: 'completed'; data: { message: ChatMessage } }
  | {
      event: 'error';
      data: { code: string; message: string; retryable: boolean };
    };
