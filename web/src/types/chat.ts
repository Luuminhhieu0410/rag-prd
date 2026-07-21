export interface ChatCitation {
  number: number;
  documentId: string;
  chunkId: string;
  documentName: string;
  page: number | null;
  excerpt: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: ChatCitation[];
  createdAt: string;
  incomplete?: boolean;
}

export interface ChatHistoryPage {
  conversationId: string | null;
  messages: ChatMessage[];
  nextCursor: string | null;
}

export type ChatStage = 'analyzing' | 'retrieving' | 'generating';

export type ChatStreamEvent =
  | { event: 'accepted'; data: { userMessage: ChatMessage } }
  | { event: 'status'; data: { stage: ChatStage } }
  | { event: 'token'; data: { delta: string } }
  | { event: 'completed'; data: { message: ChatMessage } }
  | {
      event: 'error';
      data: { code: string; message: string; retryable: boolean };
    };

