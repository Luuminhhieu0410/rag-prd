import { createHash } from 'node:crypto';
import {
  STRUCTURED_MAX_CELLS,
  STRUCTURED_MAX_COLUMNS,
  STRUCTURED_MAX_ROWS,
} from './structured-data.constants';
import type {
  ParsedDataset,
  ProfileDatasetOptions,
  ProfiledCell,
  ProfiledDataset,
  StructuredColumnParseResult,
  StructuredProfilingLimits,
} from './structured-data.types';
import { parseColumn } from './structured-value-parser';

const IDENTITY_HEADERS = new Set([
  'id',
  'identifier',
  'sku',
  'code',
  'item id',
  'item code',
  'product id',
  'product code',
  'mã',
  'mã sản phẩm',
]);

function normalizeHeader(header: string): string {
  return header.trim().replace(/\s+/g, ' ').toLowerCase();
}

function stableId(kind: string, ...parts: Array<string | number>): string {
  const digest = createHash('sha256')
    .update(parts.map(String).join('\u0000'))
    .digest('hex')
    .slice(0, 32);
  return `${kind}_${digest}`;
}

function rejectionReason(
  dataset: ParsedDataset,
  normalizedHeaders: string[],
  limits: StructuredProfilingLimits,
): string | null {
  if (!dataset.eligibility.eligible) {
    return dataset.eligibility.reason ?? 'structurally_ineligible';
  }
  if (normalizedHeaders.length === 0) return 'missing_header';
  if (normalizedHeaders.some((header) => header.length === 0)) {
    return 'empty_headers';
  }
  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
    return 'duplicate_headers';
  }
  if (
    dataset.rows.some((row) => row.values.length !== dataset.headers.length)
  ) {
    return 'row_width_mismatch';
  }
  if (dataset.rows.length > limits.maxRows) return 'row_limit_exceeded';
  if (dataset.headers.length > limits.maxColumns) {
    return 'column_limit_exceeded';
  }
  if (dataset.rows.length * dataset.headers.length > limits.maxCells) {
    return 'cell_limit_exceeded';
  }
  return null;
}

function emptyProfiledDataset(
  dataset: ParsedDataset,
  id: string,
  reason: string,
): ProfiledDataset {
  return {
    id,
    index: dataset.index,
    name: dataset.name,
    source: dataset.source,
    eligibility: { eligible: false, reason },
    rowCount: dataset.rows.length,
    profile: {
      exact: false,
      rowCount: dataset.rows.length,
      columnCount: dataset.headers.length,
      cellCount: dataset.rows.length * dataset.headers.length,
      rejectionReason: reason,
    },
    primaryKeyColumnId: null,
    columns: [],
    rows: [],
  };
}

function isIdentityHeader(normalizedHeader: string): boolean {
  return IDENTITY_HEADERS.has(normalizedHeader.replace(/[_-]+/g, ' '));
}

function isCompleteAndUnique(values: string[]): boolean {
  if (values.length === 0) return false;
  const normalized = values.map((value) => value.trim());
  return (
    normalized.every((value) => value.length > 0) &&
    new Set(normalized).size === normalized.length
  );
}

function cellFor(
  columnId: string,
  rawValue: string,
  parsed: StructuredColumnParseResult,
  rowOrdinal: number,
): ProfiledCell {
  const normalized = parsed.normalized[rowOrdinal];
  return {
    columnId,
    rawValue,
    textValue:
      parsed.type === 'text' && typeof normalized === 'string'
        ? normalized
        : null,
    decimalValue:
      parsed.type === 'decimal' && typeof normalized === 'string'
        ? normalized
        : null,
    booleanValue:
      parsed.type === 'boolean' && typeof normalized === 'boolean'
        ? normalized
        : null,
    dateValue:
      parsed.type === 'date' && typeof normalized === 'string'
        ? normalized
        : null,
  };
}

export function profileDataset(
  dataset: ParsedDataset,
  options: ProfileDatasetOptions,
): ProfiledDataset {
  const limits: StructuredProfilingLimits = {
    maxRows: options.limits?.maxRows ?? STRUCTURED_MAX_ROWS,
    maxColumns: options.limits?.maxColumns ?? STRUCTURED_MAX_COLUMNS,
    maxCells: options.limits?.maxCells ?? STRUCTURED_MAX_CELLS,
  };
  const datasetId = stableId(
    'dataset',
    options.documentId,
    options.ingestionKey,
    dataset.index,
  );
  const normalizedHeaders = dataset.headers.map(normalizeHeader);
  const reason = rejectionReason(dataset, normalizedHeaders, limits);
  if (reason) return emptyProfiledDataset(dataset, datasetId, reason);

  const parsedColumns = dataset.headers.map((_, ordinal) =>
    parseColumn(dataset.rows.map((row) => row.values[ordinal])),
  );
  const columnIds = dataset.headers.map((_, ordinal) =>
    stableId('column', datasetId, ordinal),
  );
  const identityCandidates = dataset.headers.map((_, ordinal) => {
    const values = dataset.rows.map((row) => row.values[ordinal]);
    return (
      isIdentityHeader(normalizedHeaders[ordinal]) &&
      isCompleteAndUnique(values)
    );
  });
  const primaryOrdinal = identityCandidates.indexOf(true);
  const primaryKeyColumnId =
    primaryOrdinal === -1 ? null : columnIds[primaryOrdinal];
  const columns = dataset.headers.map((rawName, ordinal) => {
    const parsed = parsedColumns[ordinal];
    return {
      id: columnIds[ordinal],
      ordinal,
      rawName,
      normalizedName: normalizedHeaders[ordinal],
      valueType: parsed.type,
      parseFormat: parsed.parseFormat,
      nullCount: parsed.nullCount,
      invalidCount: parsed.invalidCount,
      nonNullCount: parsed.nonNullCount,
      distinctCount: parsed.distinctCount,
      identityCandidate: identityCandidates[ordinal],
    };
  });
  const rows = dataset.rows.map((row, rowOrdinal) => ({
    id: stableId('row', datasetId, row.index),
    rowIndex: row.index,
    identityValue:
      primaryOrdinal === -1 ? null : row.values[primaryOrdinal].trim(),
    sourceLocation: { ...dataset.sourceLocation, row: row.index },
    renderedText: normalizedHeaders
      .map((header, ordinal) => `${header}: ${row.values[ordinal]}`)
      .join('\n'),
    cells: columns.map((column, ordinal) =>
      cellFor(
        column.id,
        row.values[ordinal],
        parsedColumns[ordinal],
        rowOrdinal,
      ),
    ),
  }));

  return {
    id: datasetId,
    index: dataset.index,
    name: dataset.name,
    source: dataset.source,
    eligibility: { eligible: true, reason: null },
    rowCount: dataset.rows.length,
    profile: {
      exact: parsedColumns.every((column) => column.exact),
      rowCount: dataset.rows.length,
      columnCount: dataset.headers.length,
      cellCount: dataset.rows.length * dataset.headers.length,
    },
    primaryKeyColumnId,
    columns,
    rows,
  };
}

export function profileDatasets(
  datasets: ParsedDataset[],
  options: ProfileDatasetOptions,
): ProfiledDataset[] {
  const documentCellLimit = options.limits?.maxCells ?? STRUCTURED_MAX_CELLS;
  let consumedCells = 0;

  return datasets.map((dataset) => {
    const remainingCells = Math.max(documentCellLimit - consumedCells, 0);
    const profiled = profileDataset(dataset, {
      ...options,
      limits: { ...options.limits, maxCells: remainingCells },
    });

    if (profiled.eligibility.reason === 'cell_limit_exceeded') {
      return emptyProfiledDataset(
        dataset,
        profiled.id,
        'document_cell_limit_exceeded',
      );
    }
    if (profiled.eligibility.eligible) {
      consumedCells += dataset.rows.length * dataset.headers.length;
    }

    return profiled;
  });
}
