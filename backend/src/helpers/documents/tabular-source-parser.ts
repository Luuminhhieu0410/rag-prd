import * as cheerio from 'cheerio';
import Papa from 'papaparse';
import type {
  ParsedDataset,
  ParsedSource,
  ParsedTextDocument,
} from '../../shared/structured-data/structured-data.types';

interface CsvParser {
  parse<T>(
    text: string,
    config: { header: false; skipEmptyLines: 'greedy' },
  ): { data: T[]; errors: Array<{ code: string }> };
}

const csvParser = Papa as unknown as CsvParser;

function normalizeHeader(header: string): string {
  return header.trim().replace(/\s+/g, ' ').toLowerCase();
}

function structuralEligibility(
  headers: string[],
  rows: Array<{ values: string[] }>,
  parseFailed = false,
): ParsedDataset['eligibility'] {
  if (parseFailed) return { eligible: false, reason: 'parse_error' };
  if (headers.length === 0) {
    return { eligible: false, reason: 'missing_header' };
  }

  const normalizedHeaders = headers.map(normalizeHeader);
  if (normalizedHeaders.some((header) => header.length === 0)) {
    return { eligible: false, reason: 'empty_headers' };
  }
  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
    return { eligible: false, reason: 'duplicate_headers' };
  }
  if (rows.some((row) => row.values.length !== headers.length)) {
    return { eligible: false, reason: 'row_width_mismatch' };
  }

  return { eligible: true, reason: null };
}

function renderCsvRow(headers: string[], values: string[]): string {
  const width = Math.max(headers.length, values.length);
  return Array.from({ length: width }, (_, index) => {
    const label = headers[index]?.trim() || `column_${index + 1}`;
    return `${label}: ${values[index] ?? ''}`;
  }).join('\n');
}

export function parseCsvSource(text: string): ParsedSource {
  const result = csvParser.parse<string[]>(text, {
    header: false,
    skipEmptyLines: 'greedy',
  });
  const [headers = [], ...rawRows] = result.data;
  const rows = rawRows.map((values, index) => ({
    index: index + 1,
    values,
  }));
  const parseFailed = result.errors.some(
    (error) => error.code !== 'UndetectableDelimiter',
  );
  const dataset: ParsedDataset = {
    index: 0,
    name: 'CSV',
    source: 'csv',
    headers,
    rows,
    sourceLocation: {},
    eligibility: structuralEligibility(headers, rows, parseFailed),
  };
  const textDocuments: ParsedTextDocument[] = rows.map((row) => ({
    pageContent: renderCsvRow(headers, row.values),
    metadata: {
      sourceType: 'csv',
      datasetIndex: dataset.index,
      row: row.index,
    },
  }));

  return { textDocuments, datasets: [dataset] };
}

function docxCellText(
  $: ReturnType<typeof cheerio.load>,
  cell: Parameters<ReturnType<typeof cheerio.load>>[0],
): string {
  const $cell = $(cell).clone();
  $cell.find('table').remove();
  return $cell.text();
}

export function parseDocxTables(html: string): ParsedDataset[] {
  const $ = cheerio.load(html);

  return $('table')
    .toArray()
    .filter((table) => $(table).parents('table').length === 0)
    .map((table, tableIndex) => {
      const $table = $(table);
      const nestedTable = $table.find('table').length > 0;
      const tableRows = $table
        .find('tr')
        .toArray()
        .filter((row) => $(row).parents('table').first().is(table));
      const mergedCells = tableRows.some((row) =>
        $(row)
          .children('th, td')
          .toArray()
          .some(
            (cell) =>
              $(cell).attr('rowspan') !== undefined ||
              $(cell).attr('colspan') !== undefined,
          ),
      );
      const tableValues = tableRows.map((row) =>
        $(row)
          .children('th, td')
          .toArray()
          .map((cell) => docxCellText($, cell)),
      );
      const headerIndex = tableValues.findIndex(
        (values) =>
          values.length > 0 && values.some((value) => value.trim().length > 0),
      );
      const headers = headerIndex === -1 ? [] : tableValues[headerIndex];
      const rawRows =
        headerIndex === -1 ? [] : tableValues.slice(headerIndex + 1);
      const rows = rawRows.map((values, rowIndex) => ({
        index: rowIndex + 1,
        values,
      }));
      const eligibility = nestedTable
        ? { eligible: false, reason: 'nested_table' }
        : mergedCells
          ? { eligible: false, reason: 'merged_cells' }
          : structuralEligibility(headers, rows);

      return {
        index: tableIndex,
        name: `Table ${tableIndex + 1}`,
        source: 'docx_table',
        headers,
        rows,
        sourceLocation: { table: tableIndex + 1 },
        eligibility,
      } satisfies ParsedDataset;
    });
}
