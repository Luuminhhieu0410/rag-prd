import { BadRequestException } from '@nestjs/common';
import {
  detectSourceType,
  detectSourceTypeFromName,
  type IngestSourceType,
} from '../../helpers/documents/source-type';

export const MAX_DOCUMENT_FILE_SIZE = 50 * 1024 * 1024;

export function validateDocumentFile(file?: Express.Multer.File): {
  file: Express.Multer.File;
  sourceType: IngestSourceType;
} {
  if (!file) throw new BadRequestException('file is required');
  if (file.size <= 0) throw new BadRequestException('file must not be empty');
  if (file.size > MAX_DOCUMENT_FILE_SIZE) {
    throw new BadRequestException('file exceeds 50 MB limit');
  }

  const sourceType = detectSourceTypeFromName(file.originalname);
  if (!sourceType) throw new BadRequestException('unsupported file type');
  const mimeSourceType = detectSourceType({ mimetype: file.mimetype });
  if (
    mimeSourceType &&
    ['pdf', 'docx'].includes(mimeSourceType) &&
    mimeSourceType !== sourceType
  ) {
    throw new BadRequestException('file extension does not match MIME type');
  }
  return { file, sourceType };
}
