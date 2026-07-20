import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mappingBadgeClassName } from '@/helpers/documents/sourcepanel';
import { formatBytes } from '@/helpers/format/bytes';
import { SourceIcon } from '@/pages/Collection/components/SourceIcon';
import type { DocumentRecord } from '@/types/api';
import type { IngestionProgress } from '@/types/ingestion-progress';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { SourceIngestionProgress } from './SourceIngestionProgress';

interface Props {
  document: DocumentRecord;
  progress?: IngestionProgress;
  onOpen(): void;
  onDelete(): void;
}
export const SourceRow = memo(function SourceRow({
  document,
  progress,
  onOpen,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const name = document.originalName ?? t('collection.sources.untitled');
  return (
    <div className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/70 has-data-checked:bg-muted">
      <SourceIcon sourceType={document.sourceType} />
      <div className="min-w-0 flex-1">
        {document.status === 'ready' ? (
          <button
            type="button"
            className="block w-full truncate rounded-sm text-left text-sm font-medium underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            title={document.originalName ?? undefined}
            onClick={onOpen}
          >
            {name}
          </button>
        ) : (
          <p
            className="truncate text-sm font-medium"
            title={document.originalName ?? undefined}
          >
            {name}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1.5">
          <Badge
            className={`h-5 px-1.5 text-[10px] ${mappingBadgeClassName(document.status)}`}
          >
            {t(`collection.status.${document.status}`)}
          </Badge>
          <span className="truncate text-[11px] text-muted-foreground">
            {formatBytes(document.byteSize)}
          </span>
        </div>
        <SourceIngestionProgress progress={progress} />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('collection.sources.actions', { name })}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 />
            {t('collection.sources.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
