import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { FilePlus2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SourceRow } from './SourceRow';
import useSourcesPanelContext from '@/context/SourcesPanelContext';

export function SourcesList() {
  const { t } = useTranslation();
  const {
    documents,
    visibleDocuments,
    loading,
    hasError,
    progress,
    openUpload,
    deletion,
    selectDocument,
  } = useSourcesPanelContext();
  return (
    <ScrollArea className="min-h-0 flex-1">
      {loading && (
        <div className="space-y-2 p-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg" />
          ))}
        </div>
      )}
      {!loading && hasError && (
        <Empty className="min-h-72">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FilePlus2 />
            </EmptyMedia>
            <EmptyTitle>{t('collection.sources.errorTitle')}</EmptyTitle>
            <EmptyDescription>
              {t('collection.sources.errorDescription')}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {!loading && !hasError && documents.length === 0 && (
        <Empty className="min-h-72">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FilePlus2 />
            </EmptyMedia>
            <EmptyTitle>{t('collection.sources.emptyTitle')}</EmptyTitle>
            <EmptyDescription>
              {t('collection.sources.emptyDescription')}
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" size="sm" onClick={openUpload}>
            <Upload />
            {t('collection.sources.addFirst')}
          </Button>
        </Empty>
      )}
      {!loading && !hasError && visibleDocuments.length > 0 && (
        <div className="space-y-1 p-2">
          {visibleDocuments.map((document) => (
            <SourceRow
              key={document.id}
              document={document}
              progress={progress[document.id]}
              onOpen={() => selectDocument(document)}
              onDelete={() => deletion.request(document)}
            />
          ))}
        </div>
      )}
    </ScrollArea>
  );
}
