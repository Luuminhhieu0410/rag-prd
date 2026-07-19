export const MAX_DOCUMENT_FILE_SIZE = 50 * 1024 * 1024;

export const SUPPORTED_DOCUMENT_EXTENSIONS = [
  'pdf',
  'docx',
  'csv',
  'md',
  'markdown',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'mts',
  'cts',
  'py',
  'html',
  'htm',
  'json',
  'txt',
  'log',
] as const;

export const DOCUMENT_FILE_ACCEPT = SUPPORTED_DOCUMENT_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(',');

const supportedPattern = new RegExp(
  `\\.(${SUPPORTED_DOCUMENT_EXTENSIONS.join('|')})$`,
  'i',
);

export type DocumentFileValidationError =
  | 'emptyFile'
  | 'fileTooLarge'
  | 'unsupportedFile';

export function validateDocumentFile(
  file: File,
): DocumentFileValidationError | null {
  if (file.size === 0) return 'emptyFile';
  if (file.size > MAX_DOCUMENT_FILE_SIZE) return 'fileTooLarge';
  return supportedPattern.test(file.name) ? null : 'unsupportedFile';
}
