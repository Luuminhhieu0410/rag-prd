import type { ChatCitation } from '@/types/chat';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function CitationPreview({ citation }: { citation: ChatCitation }) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 rounded-lg bg-muted/70 p-3 text-sm" role="region">
      <div className="flex items-center gap-2 font-medium">
        <FileText className="size-4 shrink-0" />
        <span className="truncate">[{citation.number}] {citation.documentName}</span>
        {citation.page !== null && (
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {t('collection.chat.page', { page: citation.page })}
          </span>
        )}
      </div>
      <p className="mt-2 max-w-[70ch] text-sm leading-6 text-muted-foreground">
        {citation.excerpt}
      </p>
    </div>
  );
}

