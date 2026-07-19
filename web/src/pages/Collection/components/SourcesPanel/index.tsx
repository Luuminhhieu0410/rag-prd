import {
  type SourcesPanelContextValue,
  SourcesPanelProvider,
} from '@/context/SourcesPanelContext';
import { isActiveIngestionStatus } from '@/const/ingestion-progress';
import useFetchApi from '@/hooks/api/useFetchApi';
import { useIngestionProgress } from '@/hooks/api/useIngestionProgress';
import { useDeleteSource } from '@/hooks/documents/useDeleteSource';
import { useMultiFileUpload } from '@/hooks/documents/useMultiFileUpload';
import type { DocumentRecord } from '@/types/api';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeleteSourceDialog } from './DeleteSourceDialog';
import { SourcesList } from './SourcesList';
import { SourcesToolbar } from './SourcesToolbar';
import { UploadSourcesDialog } from './UploadSourcesDialog';

interface Props {
  collectionId: string;
  className?: string;
}

export function SourcesPanel({ collectionId, className = '' }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const url = `/api/collection/${collectionId}/documents`;
  const query = useFetchApi<DocumentRecord[]>({ url, defaultData: [] });
  const documents = query.data;
  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [url] });
  }, [queryClient, url]);
  const progress = useIngestionProgress({
    collectionId,
    enabled: documents.some((item) => isActiveIngestionStatus(item.status)),
    onTerminal: invalidate,
  });
  const upload = useMultiFileUpload(url, t);
  const deletion = useDeleteSource(url, t);
  const openUpload = useCallback(() => {
    upload.clear();
    setUploadOpen(true);
  }, [upload]);
  const submitUpload = useCallback(
    async (files: FileList | File[]) => {
      if (await upload.upload(files)) setUploadOpen(false);
      if (inputRef.current) inputRef.current.value = '';
    },
    [upload],
  );
  const contextValue = useMemo<SourcesPanelContextValue>(
    () => ({
      documents,
      visibleDocuments: documents,
      loading: query.loading,
      hasError: Boolean(query.error),
      progress,
      inputRef,
      upload,
      uploadOpen,
      openUpload,
      submitUpload,
      setUploadOpen,
      deletion,
    }),
    [
      documents,
      query.loading,
      query.error,
      progress,
      upload,
      uploadOpen,
      deletion,
      openUpload,
      submitUpload,
    ],
  );

  return (
    <SourcesPanelProvider value={contextValue}>
      <aside
        className={`flex min-h-0 flex-col overflow-hidden rounded-xl bg-card ${className}`}
      >
        <SourcesToolbar />
        <SourcesList />
      </aside>
      <UploadSourcesDialog />
      <DeleteSourceDialog />
    </SourcesPanelProvider>
  );
}
