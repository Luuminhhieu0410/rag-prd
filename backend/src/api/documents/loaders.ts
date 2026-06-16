import { BadRequestException } from '@nestjs/common';
import type { BaseDocumentLoader } from '@langchain/core/document_loaders/base';
import { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';

class BlobTextLoader implements BaseDocumentLoader {
  constructor(
    private readonly blob: Blob,
    private readonly sourceType: string,
  ) {}

  async load(): Promise<Document[]> {
    return [
      new Document({
        pageContent: await this.blob.text(),
        metadata: { sourceType: this.sourceType },
      }),
    ];
  }
}

export function createLoader(
  sourceType: string,
  blob: Blob,
): BaseDocumentLoader {
  switch (sourceType) {
    case 'pdf':
      return new PDFLoader(blob, { splitPages: true });
    case 'docx':
      return new DocxLoader(blob);
    case 'csv':
      return new CSVLoader(blob);
    case 'markdown':
    case 'javascript':
    case 'typescript':
    case 'python':
    case 'html':
    case 'json':
    case 'text':
      return new BlobTextLoader(blob, sourceType);
    default:
      throw new BadRequestException(`unsupported source type: ${sourceType}`);
  }
}
