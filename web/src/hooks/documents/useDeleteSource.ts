import useEditApi from '@/hooks/api/useEditApi';
import type { DocumentRecord } from '@/types/api';
import type { TFunction } from 'i18next';
import { useState } from 'react';

export function useDeleteSource(url: string, t: TFunction) {
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const mutation = useEditApi<unknown, undefined>({
    url: `${url}/${document?.id}`,
    method: 'DELETE',
    successMsg: t('collection.sources.deleted'),
    errorMsg: t('collection.sources.deleteError'),
  });
  async function confirm() {
    if (!document) return;
    try {
      await mutation.mutateAsync({ data: undefined, invalidateKey: [url, {}] });
      setDocument(null);
    } catch {
      /* shared mutation hook reports the error */
    }
  }
  return {
    document,
    request: setDocument,
    cancel: () => setDocument(null),
    confirm,
    isPending: mutation.isPending,
  };
}
