import type { ChatCitation } from '@/types/chat';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function CitationPreview({ citation }: { citation: ChatCitation }) {
  const { t } = useTranslation();
  const structuredLocation =
    citation.kind === 'structured'
      ? citation.table === null
        ? t('collection.chat.csvRow', { row: citation.row })
        : t('collection.chat.tableRow', {
            table: citation.table,
            row: citation.row,
          })
      : null;

  return (
    <div
      className="mt-3 rounded-lg bg-muted/70 p-3 text-sm"
      role="region"
      aria-label={t('collection.chat.openCitation', {
        number: citation.number,
      })}
    >
      <div className="flex min-w-0 items-start gap-2">
        <FileText className="size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2 font-medium">
            <span className="truncate">
              [{citation.number}] {citation.documentName}
            </span>
            {citation.kind === 'chunk' && citation.page !== null && (
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {t('collection.chat.page', { page: citation.page })}
              </span>
            )}
          </div>
          {citation.kind === 'structured' && (
            <div className="mt-1 flex min-w-0 flex-col gap-0.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-1.5">
              <span className="truncate">{citation.datasetName}</span>
              <span className="hidden sm:inline" aria-hidden="true">
                ·
              </span>
              <span className="shrink-0">{structuredLocation}</span>
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 max-w-[70ch] text-sm leading-6 text-muted-foreground">
        {citation.excerpt}
      </p>
    </div>
  );
}
