import { api } from '@/helpers';
import { useQuery } from '@tanstack/react-query';
import type { DocumentContentResponse } from '@/types/api';

export function useDocumentContent(
  collectionId: string,
  documentId: string | null,
) {
  const query = useQuery({
    queryKey: ['document-content', collectionId, documentId],
    enabled: Boolean(documentId),
    queryFn: async () => {
      const response = await api<DocumentContentResponse>({
        url: `/api/collection/${collectionId}/documents/${documentId}/content`,
      });
      if (!response.data) throw new Error('Document content is missing');
      return response.data;
    },
  });

  return {
    content: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    retry: query.refetch,
  };
}
