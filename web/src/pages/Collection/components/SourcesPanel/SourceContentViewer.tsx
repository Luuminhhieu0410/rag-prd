import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import useSourcesPanelContext from '@/context/SourcesPanelContext';
import useFetchApi from '@/hooks/api/useFetchApi';
import type { DocumentContentResponse } from '@/types/api';
import { FileWarning, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  collectionId: string;
}

export function SourceContentViewer({ collectionId }: Props) {
  const { t } = useTranslation();
  const { selectedDocument } = useSourcesPanelContext();
  const documentId = selectedDocument?.id;
  const {
    data: content,
    loading,
    error,
    refetch: retry,
  } = useFetchApi<DocumentContentResponse>({
    url: `/api/collection/${collectionId}/documents/${documentId}/content`,
    enabled: Boolean(documentId),

  });

  if (loading) {
    return (
      <div
        className="min-h-0 flex-1 space-y-3 p-4"
        aria-label={t('collection.sources.contentLoading')}
      >
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-6 h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (error) {
    return (
      <Empty className="min-h-0 flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileWarning />
          </EmptyMedia>
          <EmptyTitle>{t('collection.sources.contentErrorTitle')}</EmptyTitle>
          <EmptyDescription>
            {t('collection.sources.contentErrorDescription')}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={() => void retry()}>
            <RotateCw />
            {t('collection.sources.retryContent')}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="scrollbar-thin scrollbar-gutter-stable min-h-0 flex-1 overflow-x-hidden overflow-y-scroll">
      <article className="mx-auto max-w-[72ch] break-words p-4 text-sm leading-6 text-foreground">
        {content?.sections.map((section) => (
          <section
            key={section.id}
            id={`chunk-${section.id}`}
            data-chunk-id={section.id}
            data-chunk-index={section.index}
            className="mt-4 scroll-m-4 whitespace-pre-wrap first:mt-0"
          >
            {section.content}
          </section>
        ))}
      </article>
    </div>
  );
}
