/* eslint-disable react-refresh/only-export-components -- feature context intentionally co-locates its provider and consumer hook */
import type { useDeleteSource } from '@/hooks/documents/useDeleteSource';
import type { useMultiFileUpload } from '@/hooks/documents/useMultiFileUpload';
import type { DocumentRecord } from '@/types/api';
import type { IngestionProgressMap } from '@/types/ingestion-progress';
import {
  createContext,
  useContext,
  type ReactNode,
  type RefObject,
} from 'react';

export interface SourcesPanelContextValue {
  documents: DocumentRecord[];
  visibleDocuments: DocumentRecord[];
  loading: boolean;
  hasError: boolean;
  progress: IngestionProgressMap;
  inputRef: RefObject<HTMLInputElement | null>;
  upload: ReturnType<typeof useMultiFileUpload>;
  uploadOpen: boolean;
  openUpload(): void;
  submitUpload(files: FileList | File[]): Promise<void>;
  setUploadOpen(open: boolean): void;
  deletion: ReturnType<typeof useDeleteSource>;
}

const SourcesPanelContext = createContext<SourcesPanelContextValue | null>(
  null,
);

const useSourcesPanelContext = () => {
  const value = useContext(SourcesPanelContext);
  if (!value) {
    throw new Error(
      'useSourcesPanelContext must be used inside SourcesPanelProvider',
    );
  }
  return value;
};

interface SourcesPanelProviderProps {
  children: ReactNode;
  value: SourcesPanelContextValue;
}

export const SourcesPanelProvider = ({
  children,
  value,
}: SourcesPanelProviderProps) => {
  return (
    <SourcesPanelContext.Provider value={value}>
      {children}
    </SourcesPanelContext.Provider>
  );
};

export default useSourcesPanelContext;
