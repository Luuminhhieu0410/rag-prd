import { BadRequestException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import Papa from 'papaparse';

export class Document {
  pageContent: string;
  metadata: Record<string, unknown>;

  constructor(fields: {
    pageContent: string;
    metadata?: Record<string, unknown>;
  }) {
    this.pageContent = fields.pageContent;
    this.metadata = fields.metadata ?? {};
  }
}

async function parsePDF(buffer: Buffer): Promise<Document[]> {
  const pdf = new PDFParse({ data: buffer });
  try {
    const result = await pdf.getText();
    if (!result.text?.trim()) return [];

    return result.pages.map(
      (page) =>
        new Document({
          pageContent: page.text.trim(),
          metadata: { sourceType: 'pdf', loc: { pageNumber: page.num } },
        }),
    );
  } finally {
    await pdf.destroy();
  }
}

async function parseDOCX(buffer: Buffer): Promise<Document[]> {
  const result = await mammoth.extractRawText({ buffer });
  return [
    new Document({
      pageContent: result.value,
      metadata: { sourceType: 'docx' },
    }),
  ];
}

async function parseCSV(buffer: Buffer): Promise<Document[]> {
  const text = buffer.toString('utf-8');
  const result = Papa.parse<Record<string, string>>(text, { header: true });
  return (
    result.data
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter((row) => {
        const keys = Object.keys(row);
        return (
          keys.length > 0 && keys.some((k) => row[k] != null && row[k] !== '')
        );
      })
      .map(
        (row, i) =>
          new Document({
            pageContent: Object.entries(row)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n'),
            metadata: { sourceType: 'csv', row: i + 1 },
          }),
      )
  );
}

export function createLoader(
  sourceType: string,
  blob: Blob,
): { load: () => Promise<Document[]> } {
  switch (sourceType) {
    case 'pdf':
      return {
        load: async () => parsePDF(Buffer.from(await blob.arrayBuffer())),
      };
    case 'docx':
      return {
        load: async () => parseDOCX(Buffer.from(await blob.arrayBuffer())),
      };
    case 'csv':
      return {
        load: async () => parseCSV(Buffer.from(await blob.arrayBuffer())),
      };
    case 'markdown':
    case 'javascript':
    case 'typescript':
    case 'python':
    case 'html':
    case 'json':
    case 'text':
      return {
        load: async () => [
          new Document({
            pageContent: await blob.text(),
            metadata: { sourceType },
          }),
        ],
      };
    default:
      throw new BadRequestException(`unsupported source type: ${sourceType}`);
  }
}
