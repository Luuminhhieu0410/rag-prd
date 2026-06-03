export type IngestSourceType = 'pdf' | 'docx' | 'csv';

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

  return null;
}
