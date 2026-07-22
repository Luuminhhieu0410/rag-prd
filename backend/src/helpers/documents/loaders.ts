import { BadRequestException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import type { ParsedSource } from '../../shared/structured-data/structured-data.types';
import { parseCsvSource, parseDocxTables } from './tabular-source-parser';

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

async function parseDOCX(buffer: Buffer): Promise<ParsedSource> {
  const [textResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({ buffer }),
  ]);
  return {
    textDocuments: [
      new Document({
        pageContent: textResult.value,
        metadata: { sourceType: 'docx' },
      }),
    ],
    datasets: parseDocxTables(htmlResult.value),
  };
}

function parseCSV(buffer: Buffer): ParsedSource {
  return parseCsvSource(buffer.toString('utf-8'));
}

function textOnly(documents: Document[]): ParsedSource {
  return { textDocuments: documents, datasets: [] };
}

export function createParsedSourceLoader(
  sourceType: string,
  blob: Blob,
): { load: () => Promise<ParsedSource> } {
  switch (sourceType) {
    case 'pdf':
      return {
        load: async () =>
          textOnly(await parsePDF(Buffer.from(await blob.arrayBuffer()))),
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
        load: async () =>
          textOnly([
            new Document({
              pageContent: await blob.text(),
              metadata: { sourceType },
            }),
          ]),
      };
    default:
      throw new BadRequestException(`unsupported source type: ${sourceType}`);
  }
}

export function createLoader(
  sourceType: string,
  blob: Blob,
): { load: () => Promise<Document[]> } {
  const parsedSourceLoader = createParsedSourceLoader(sourceType, blob);
  return {
    load: async () => (await parsedSourceLoader.load()).textDocuments,
  };
}
