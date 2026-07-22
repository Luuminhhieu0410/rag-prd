export type StructuredValueType = 'text' | 'decimal' | 'boolean' | 'date';

export interface ParsedDataset {
  index: number;
  name: string;
  source: 'csv' | 'docx_table';
  headers: string[];
  rows: Array<{ index: number; values: string[] }>;
  sourceLocation: { table?: number };
  eligibility: { eligible: boolean; reason: string | null };
}

export interface ParsedTextDocument {
  pageContent: string;
  metadata: Record<string, unknown>;
}

export interface ParsedSource {
  textDocuments: ParsedTextDocument[];
  datasets: ParsedDataset[];
}

export type StructuredNormalizedValue = string | boolean | null;

export interface StructuredColumnParseResult {
  type: StructuredValueType;
  parseFormat: string | null;
  raw: string[];
  normalized: StructuredNormalizedValue[];
  ambiguous: boolean;
  nullCount: number;
  invalidCount: number;
  nonNullCount: number;
  distinctCount: number;
  exact: boolean;
}

export interface StructuredProfilingLimits {
  maxRows: number;
  maxColumns: number;
  maxCells: number;
}

export interface ProfileDatasetOptions {
  documentId: string;
  ingestionKey: string;
  limits?: Partial<StructuredProfilingLimits>;
}

export interface ProfiledCell {
  columnId: string;
  rawValue: string;
  textValue: string | null;
  decimalValue: string | null;
  booleanValue: boolean | null;
  dateValue: string | null;
}

export interface ProfiledColumn {
  id: string;
  ordinal: number;
  rawName: string;
  normalizedName: string;
  valueType: StructuredValueType;
  parseFormat: string | null;
  nullCount: number;
  invalidCount: number;
  nonNullCount: number;
  distinctCount: number;
  identityCandidate: boolean;
}

export interface ProfiledRow {
  id: string;
  rowIndex: number;
  identityValue: string | null;
  sourceLocation: { table?: number; row: number };
  renderedText: string;
  cells: ProfiledCell[];
}

export interface ProfiledDataset {
  id: string;
  index: number;
  name: string;
  source: 'csv' | 'docx_table';
  eligibility: { eligible: boolean; reason: string | null };
  rowCount: number;
  profile: Record<string, unknown>;
  primaryKeyColumnId: string | null;
  columns: ProfiledColumn[];
  rows: ProfiledRow[];
}

export interface StructuredDatasetCatalog {
  id: string;
  documentId: string;
  documentName: string;
  name: string;
  source: 'csv' | 'docx_table';
  rowCount: number;
  primaryKeyColumnId: string | null;
  columns: ProfiledColumn[];
}
