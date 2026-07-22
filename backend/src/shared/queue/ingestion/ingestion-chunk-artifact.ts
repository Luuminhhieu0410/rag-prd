import { Document } from '@langchain/core/documents';
import type {
  ProfiledCell,
  ProfiledColumn,
  ProfiledDataset,
  ProfiledRow,
} from '../../structured-data/structured-data.types';

const ARTIFACT_VERSION = 2;

interface SerializedChunk {
  pageContent: string;
  metadata: Record<string, unknown>;
}

interface ChunkArtifact {
  version: typeof ARTIFACT_VERSION;
  sourceType: string;
  pageCount: number | null;
  chunks: SerializedChunk[];
  datasets: ProfiledDataset[];
}

export interface DeserializedChunkArtifact {
  pageCount: number | null;
  chunks: Document[];
  datasets: ProfiledDataset[];
}

export function serializeChunkArtifact(
  sourceType: string,
  pageCount: number | null,
  chunks: Document[],
  datasets: ProfiledDataset[] = [],
): string {
  const artifact: ChunkArtifact = {
    version: ARTIFACT_VERSION,
    sourceType,
    pageCount,
    chunks: chunks.map((chunk) => ({
      pageContent: chunk.pageContent,
      metadata: chunk.metadata,
    })),
    datasets,
  };

  return JSON.stringify(artifact);
}

export function deserializeChunkArtifact(
  raw: string,
  expectedSourceType: string,
): DeserializedChunkArtifact {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) throw new Error('root must be an object');
    if (value.version !== ARTIFACT_VERSION) {
      throw new Error('version is unsupported');
    }
    if (
      typeof value.sourceType !== 'string' ||
      value.sourceType !== expectedSourceType
    ) {
      throw new Error('source type does not match');
    }
    if (
      value.pageCount !== null &&
      (!Number.isInteger(value.pageCount) || Number(value.pageCount) < 0)
    ) {
      throw new Error('page count is invalid');
    }
    if (!Array.isArray(value.chunks)) {
      throw new Error('chunks must be an array');
    }
    if (!Array.isArray(value.datasets)) {
      throw new Error('datasets must be an array');
    }

    const chunks = value.chunks.map((chunk) => {
      if (
        !isRecord(chunk) ||
        typeof chunk.pageContent !== 'string' ||
        !isRecord(chunk.metadata)
      ) {
        throw new Error('chunk shape is invalid');
      }
      return new Document({
        pageContent: chunk.pageContent,
        metadata: chunk.metadata,
      });
    });
    if (!value.datasets.every(isProfiledDataset)) {
      throw new Error('dataset shape is invalid');
    }

    return {
      pageCount: value.pageCount as number | null,
      chunks,
      datasets: value.datasets,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid ingestion chunk artifact: ${message}`);
  }
}

function isProfiledDataset(value: unknown): value is ProfiledDataset {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isNonNegativeInteger(value.index) ||
    typeof value.name !== 'string' ||
    (value.source !== 'csv' && value.source !== 'docx_table') ||
    !isEligibility(value.eligibility) ||
    !isNonNegativeInteger(value.rowCount) ||
    !isRecord(value.profile) ||
    !isNullableString(value.primaryKeyColumnId) ||
    !Array.isArray(value.columns) ||
    !value.columns.every(isProfiledColumn) ||
    !Array.isArray(value.rows) ||
    !value.rows.every(isProfiledRow)
  ) {
    return false;
  }

  const dataset = value as unknown as ProfiledDataset;
  const columnIds = new Set(dataset.columns.map((column) => column.id));
  if (columnIds.size !== dataset.columns.length) return false;
  if (
    dataset.primaryKeyColumnId !== null &&
    !columnIds.has(dataset.primaryKeyColumnId)
  ) {
    return false;
  }
  if (
    dataset.eligibility.eligible &&
    dataset.rows.length !== dataset.rowCount
  ) {
    return false;
  }

  return dataset.rows.every((row) => {
    const cellColumnIds = new Set(row.cells.map((cell) => cell.columnId));
    return (
      row.cells.length === dataset.columns.length &&
      cellColumnIds.size === row.cells.length &&
      row.cells.every((cell) => columnIds.has(cell.columnId))
    );
  });
}

function isEligibility(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.eligible === 'boolean' &&
    isNullableString(value.reason)
  );
}

function isProfiledColumn(value: unknown): value is ProfiledColumn {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isNonNegativeInteger(value.ordinal) &&
    typeof value.rawName === 'string' &&
    typeof value.normalizedName === 'string' &&
    (value.valueType === 'text' ||
      value.valueType === 'decimal' ||
      value.valueType === 'boolean' ||
      value.valueType === 'date') &&
    isNullableString(value.parseFormat) &&
    isNonNegativeInteger(value.nullCount) &&
    isNonNegativeInteger(value.invalidCount) &&
    isNonNegativeInteger(value.nonNullCount) &&
    isNonNegativeInteger(value.distinctCount) &&
    typeof value.identityCandidate === 'boolean'
  );
}

function isProfiledRow(value: unknown): value is ProfiledRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isNonNegativeInteger(value.rowIndex) &&
    isNullableString(value.identityValue) &&
    isSourceLocation(value.sourceLocation) &&
    typeof value.renderedText === 'string' &&
    Array.isArray(value.cells) &&
    value.cells.every(isProfiledCell)
  );
}

function isProfiledCell(value: unknown): value is ProfiledCell {
  return (
    isRecord(value) &&
    typeof value.columnId === 'string' &&
    typeof value.rawValue === 'string' &&
    isNullableString(value.textValue) &&
    isNullableString(value.decimalValue) &&
    (value.booleanValue === null || typeof value.booleanValue === 'boolean') &&
    isNullableString(value.dateValue)
  );
}

function isSourceLocation(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.row) &&
    (value.table === undefined || isNonNegativeInteger(value.table))
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
