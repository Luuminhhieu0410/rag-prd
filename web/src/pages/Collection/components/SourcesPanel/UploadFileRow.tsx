import { Spinner } from '@/components/ui/spinner';
import type { UploadEntry } from '@/hooks/documents/useMultiFileUpload';
import { useTranslation } from 'react-i18next';

export function UploadFileRow({ entry }: { entry: UploadEntry }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      {entry.status === 'uploading' && <Spinner className="size-4" />}
      <span className="min-w-0 flex-1 truncate">{entry.name}</span>
      <span
        className={
          entry.status === 'failed'
            ? 'text-destructive'
            : 'text-muted-foreground'
        }
      >
        {entry.error ?? t(`collection.sources.uploadState.${entry.status}`)}
      </span>
    </div>
  );
}
