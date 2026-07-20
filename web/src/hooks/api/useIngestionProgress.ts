import { normalizeProgress } from '@/helpers/ingestion/normalize-progress';
import {
  isIngestionProgress,
  progressSnapshot,
} from '@/helpers/ingestion/reduce-progress-event';
import { useAuthenticatedSse } from '@/hooks/api/useAuthenticatedSse';
import type { IngestionProgressMap } from '@/types/ingestion-progress';
import { useCallback, useState } from 'react';
import { API_BASE_URL } from '@/const/api';

interface Options {
  collectionId: string;
  enabled: boolean;
  onTerminal: (documentId: string) => void;
}

export function useIngestionProgress({
  collectionId,
  enabled,
  onTerminal,
}: Options) {
  const [progressByDocument, setProgress] = useState<IngestionProgressMap>({});
  const handleMessage = useCallback(
    ({ event, data }: { event: string; data: string }) => {
      const value = JSON.parse(data) as unknown;
      if (event === 'snapshot') {
        const snapshot = progressSnapshot(value);
        if (snapshot) setProgress(snapshot);
        return;
      }
      if (!isIngestionProgress(value)) return;
      const progress = normalizeProgress(value);
      setProgress((current) => ({
        ...current,
        [progress.documentId]: progress,
      }));
      if (progress.status === 'ready' || progress.status === 'failed')
        onTerminal(progress.documentId);
    },
    [onTerminal],
  );

  useAuthenticatedSse({
    url: `${API_BASE_URL}/api/ingestion-processes/${collectionId}/stream`,
    enabled,
    onMessage: handleMessage,
  });
  return progressByDocument;
}
