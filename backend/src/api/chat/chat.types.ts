export type ChatComplexity = 'simple' | 'complex';

export interface RetrievalSpec {
  complexity: ChatComplexity;
  searchQueries: string[];
  keywords: string[];
  requiresMultipleSources: boolean;
}

export type StructuredOperation =
  | 'count_rows'
  | 'count_distinct'
  | 'sum'
  | 'average'
  | 'minimum'
  | 'maximum'
  | 'top_n'
  | 'bottom_n'
  | 'group'
  | 'list'
  | 'compare';

export interface StructuredFilter {
  columnId: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
  value: string;
}

export interface StructuredQuerySpec {
  operation: StructuredOperation;
  datasetIds: string[];
  metricColumnId: string | null;
  dimensionColumnId: string | null;
  groupByColumnId: string | null;
  filters: StructuredFilter[];
  limit: number | null;
}

export interface RetrievalPlan {
  mode: 'retrieval';
  retrieval: RetrievalSpec;
  standaloneQuestion: string;
}

export interface StructuredPlan {
  mode: 'structured';
  query: StructuredQuerySpec;
  standaloneQuestion: string;
}

export interface MixedPlan {
  mode: 'mixed';
  retrieval: RetrievalSpec;
  query: StructuredQuerySpec;
  standaloneQuestion: string;
}

export interface ClarificationPlan {
  mode: 'clarification';
  message: string;
  standaloneQuestion: string;
}

export interface UnsupportedPlan {
  mode: 'unsupported';
  reason: string;
  standaloneQuestion: string;
}

export type QueryPlan =
  | RetrievalPlan
  | StructuredPlan
  | MixedPlan
  | ClarificationPlan
  | UnsupportedPlan;

export type QueryAnalysis = QueryPlan;

export interface StructuredEvidenceRow {
  rowId: string;
  datasetId: string;
  datasetName: string;
  documentId: string;
  documentName: string;
  source: 'csv' | 'docx_table';
  table: number | null;
  row: number;
  renderedText: string;
  values: Record<string, string | null>;
}

export interface StructuredCoverage {
  selectedDatasets: number;
  eligibleDatasets: number;
  totalRows: number;
  consideredRows: number;
  nullCells: number;
  invalidCells: number;
  exact: boolean;
  notes: string[];
}

export interface StructuredQueryResult {
  operation: StructuredOperation;
  rows: StructuredEvidenceRow[];
  scalar?: string;
  totalMatched: number;
  truncated: boolean;
  coverage: StructuredCoverage;
}

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
  operation: StructuredOperation;
  exact: boolean;
  truncated: boolean;
  totalRows: number;
  consideredRows: number;
  nullCells: number;
  invalidCells: number;
  notes: string[];
}

export interface ChatMessageDto {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: ChatCitation[];
  structuredResultMeta: StructuredResultMeta | null;
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
  const citations: ChatCitation[] = [];
  let structuredCount = 0;
  for (const item of value) {
    if (!isRecord(item) || !isCitationNumber(item.number)) continue;
    if (item.kind === 'structured') {
      if (structuredCount >= 100) continue;
      if (
        typeof item.documentId !== 'string' ||
        typeof item.documentName !== 'string' ||
        typeof item.datasetId !== 'string' ||
        typeof item.datasetName !== 'string' ||
        typeof item.rowId !== 'string' ||
        !isNullableNonNegativeInteger(item.table) ||
        !isNonNegativeInteger(item.row) ||
        typeof item.excerpt !== 'string'
      ) {
        continue;
      }
      citations.push({
        kind: 'structured',
        number: item.number,
        documentId: item.documentId,
        documentName: item.documentName,
        datasetId: item.datasetId,
        datasetName: item.datasetName,
        rowId: item.rowId,
        table: item.table,
        row: item.row,
        excerpt: item.excerpt.slice(0, 600),
      });
      structuredCount += 1;
      continue;
    }
    if (item.kind !== undefined && item.kind !== 'chunk') continue;
    if (
      typeof item.documentId !== 'string' ||
      typeof item.chunkId !== 'string' ||
      typeof item.documentName !== 'string' ||
      !isNullableNonNegativeInteger(item.page) ||
      typeof item.excerpt !== 'string' ||
      typeof item.score !== 'number' ||
      !Number.isFinite(item.score)
    ) {
      continue;
    }
    citations.push({
      kind: 'chunk',
      number: item.number,
      documentId: item.documentId,
      chunkId: item.chunkId,
      documentName: item.documentName,
      page: item.page,
      excerpt: item.excerpt.slice(0, 600),
      score: item.score,
    });
  }
  return citations;
}

const STRUCTURED_OPERATIONS = new Set<StructuredOperation>([
  'count_rows',
  'count_distinct',
  'sum',
  'average',
  'minimum',
  'maximum',
  'top_n',
  'bottom_n',
  'group',
  'list',
  'compare',
]);

export function parseStructuredResultMeta(
  value: unknown,
): StructuredResultMeta | null {
  if (
    !isRecord(value) ||
    typeof value.operation !== 'string' ||
    !STRUCTURED_OPERATIONS.has(value.operation as StructuredOperation) ||
    typeof value.exact !== 'boolean' ||
    typeof value.truncated !== 'boolean' ||
    !isNonNegativeInteger(value.totalRows) ||
    !isNonNegativeInteger(value.consideredRows) ||
    !isNonNegativeInteger(value.nullCells) ||
    !isNonNegativeInteger(value.invalidCells) ||
    !isStringArray(value.notes)
  ) {
    return null;
  }
  return {
    operation: value.operation as StructuredOperation,
    exact: value.exact,
    truncated: value.truncated,
    totalRows: value.totalRows,
    consideredRows: value.consideredRows,
    nullCells: value.nullCells,
    invalidCells: value.invalidCells,
    notes: value.notes.slice(0, 10).map((note) => note.slice(0, 300)),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isCitationNumber(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1;
}

function isNullableNonNegativeInteger(value: unknown): value is number | null {
  return value === null || isNonNegativeInteger(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}
