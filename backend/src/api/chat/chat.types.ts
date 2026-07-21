export type ChatComplexity = 'simple' | 'complex';

export interface QueryPlan {
  complexity: ChatComplexity;
  intent: string;
  standaloneQuestion: string;
  searchQueries: string[];
  keywords: string[];
  requiresMultipleSources: boolean;
}

export type QueryAnalysis = Omit<QueryPlan, 'complexity'>;

export interface ChatCitation {
  number: number;
  documentId: string;
  chunkId: string;
  documentName: string;
  page: number | null;
  excerpt: string;
  score: number;
}

export interface ChatMessageDto {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: ChatCitation[];
  createdAt: Date | string;
}

export interface ChatHistoryPage {
  conversationId: string | null;
  messages: ChatMessageDto[];
  nextCursor: string | null;
}

export interface RetrievedChunk {
  pageContent: string;
  chunkId: string;
  documentId: string;
  documentName: string;
  page: number | null;
  score: number;
}

export function parseChatCitations(value: unknown): ChatCitation[] {
  if (!Array.isArray(value)) return [];
  const items: unknown[] = value;
  return items.filter((item): item is ChatCitation => {
    if (!item || typeof item !== 'object') return false;
    const citation = item as Partial<ChatCitation>;
    return (
      typeof citation.number === 'number' &&
      typeof citation.documentId === 'string' &&
      typeof citation.chunkId === 'string' &&
      typeof citation.documentName === 'string' &&
      typeof citation.excerpt === 'string' &&
      typeof citation.score === 'number'
    );
  });
}
