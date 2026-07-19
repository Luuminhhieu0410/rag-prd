import { validateDocumentFile } from '@/const/document-upload';
import useEditApi from '@/hooks/api/useEditApi';
import type { DocumentRecord } from '@/types/api';
import { useState } from 'react';
import type { TFunction } from 'i18next';

export interface UploadEntry {
  id: string;
  name: string;
  status: 'uploading' | 'accepted' | 'failed';
  error?: string;
}

export function useMultiFileUpload(url: string, t: TFunction) {
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const mutation = useEditApi<DocumentRecord, FormData>({
    url,
    successMsg: t('collection.sources.uploaded'),
    errorMsg: t('collection.sources.uploadError'),
  });
  const update = (id: string, value: Partial<UploadEntry>) =>
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, ...value } : entry,
      ),
    );

  async function upload(files: FileList | File[]): Promise<boolean> {
    const selected = Array.from(files);
    if (!selected.length) return false;
    const initial = selected.map(
      (file, index): UploadEntry => ({
        id: `${file.name}-${file.lastModified}-${index}`,
        name: file.name,
        status: 'uploading',
      }),
    );
    setEntries(initial);
    const results = await Promise.allSettled(
      selected.map(async (file, index) => {
        const entry = initial[index];
        const validationError = validateDocumentFile(file);
        if (validationError) {
          update(entry.id, {
            status: 'failed',
            error: t(`collection.sources.${validationError}`),
          });
          throw new Error(validationError);
        }
        const data = new FormData();
        data.append('file', file);
        try {
          await mutation.mutateAsync({ data, invalidateKey: [url, {}] });
          update(entry.id, { status: 'accepted' });
        } catch (error) {
          update(entry.id, {
            status: 'failed',
            error: t('collection.sources.uploadError'),
          });
          throw error;
        }
      }),
    );
    return results.every((result) => result.status === 'fulfilled');
  }

  return {
    entries,
    clear: () => setEntries([]),
    upload,
    isPending: mutation.isPending,
  };
}
