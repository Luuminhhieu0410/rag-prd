import { Button } from '@/components/ui/button';
import useSourcesPanelContext from '@/context/SourcesPanelContext';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SourceContentToolbar() {
  const { t } = useTranslation();
  const { selectedDocument, closeDocument } = useSourcesPanelContext();
  const name =
    selectedDocument?.originalName ?? t('collection.sources.untitled');

  return (
    <div className="flex h-14 shrink-0 items-center gap-1.5 border-b border-border px-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={closeDocument}
        aria-label={t('collection.sources.backToList')}
      >
        <ArrowLeft />

      </Button>
      <h2 className="min-w-0 truncate text-sm font-semibold" title={name}>
        {name}
      </h2>
    </div>
  );
}
