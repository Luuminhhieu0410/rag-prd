export type IngestSourceType =
  | 'pdf'
  | 'docx'
  | 'csv'
  | 'markdown'
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'html'
  | 'json'
  | 'text';

/**
 * Phát hiện loại nguồn từ mimetype / phần mở rộng. Trả null nếu không hỗ trợ.
 * Thêm case mới ở đây + ở `createLoader` để mở rộng loại file.
 */
export function detectSourceType(file: {
  mimetype?: string;
  originalname?: string;
}): IngestSourceType | null {
  const mt = (file.mimetype || '').toLowerCase();
  const name = (file.originalname || '').toLowerCase();

  if (mt === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (
    mt ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  )
    return 'docx';
  if (
    mt === 'text/csv' ||
    mt === 'application/csv' ||
    mt === 'application/vnd.ms-excel' ||
    name.endsWith('.csv')
  )
    return 'csv';
  if (
    mt === 'text/markdown' ||
    mt === 'text/x-markdown' ||
    name.endsWith('.md') ||
    name.endsWith('.markdown')
  )
    return 'markdown';
  if (
    mt === 'application/javascript' ||
    mt === 'text/javascript' ||
    name.endsWith('.js') ||
    name.endsWith('.jsx') ||
    name.endsWith('.mjs') ||
    name.endsWith('.cjs')
  )
    return 'javascript';
  if (
    mt === 'application/typescript' ||
    mt === 'text/typescript' ||
    name.endsWith('.ts') ||
    name.endsWith('.tsx') ||
    name.endsWith('.mts') ||
    name.endsWith('.cts')
  )
    return 'typescript';
  if (
    mt === 'text/x-python' ||
    mt === 'application/x-python-code' ||
    name.endsWith('.py')
  )
    return 'python';
  if (mt === 'text/html' || name.endsWith('.html') || name.endsWith('.htm'))
    return 'html';
  if (mt === 'application/json' || mt === 'text/json' || name.endsWith('.json'))
    return 'json';
  if (mt.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.log'))
    return 'text';

  return null;
}
