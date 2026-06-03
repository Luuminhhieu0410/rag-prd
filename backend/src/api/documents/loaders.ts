import { BadRequestException } from '@nestjs/common';
import type { BaseDocumentLoader } from '@langchain/core/document_loaders/base';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';

/**
 * Tạo LangChain loader theo loại file. Switch-case này là điểm mở rộng cho các
 * loại file khác sau này (xlsx, txt, html, ...).
 */
export function createLoader(sourceType: string, blob: Blob): BaseDocumentLoader {
  switch (sourceType) {
    case 'pdf':
      return new PDFLoader(blob, { splitPages: true });
    case 'docx':
      return new DocxLoader(blob);
    case 'csv':
      return new CSVLoader(blob);
    default:
      throw new BadRequestException(`unsupported source type: ${sourceType}`);
  }
}
