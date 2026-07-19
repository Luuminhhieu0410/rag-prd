import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { CloudUpload, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UploadFileRow } from './UploadFileRow';
import useSourcesPanelContext from '@/context/SourcesPanelContext';

export function UploadSourcesDialog() {
  const { t } = useTranslation();
  const { uploadOpen, setUploadOpen, inputRef, upload, submitUpload } =
    useSourcesPanelContext();
  return (
    <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle>{t('collection.sources.addTitle')}</DialogTitle>
          <DialogDescription>
            {t('collection.sources.addDescription')}
          </DialogDescription>
        </DialogHeader>
        <button
          type="button"
          className="group flex min-h-72 w-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 text-center transition-colors hover:border-primary/60 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-wait disabled:opacity-60"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void submitUpload(event.dataTransfer.files);
          }}
          disabled={upload.isPending}
          aria-busy={upload.isPending}
        >
          <span className="grid size-12 place-items-center rounded-xl bg-background text-primary ring-1 ring-border">
            {upload.isPending ? (
              <Spinner className="size-5" />
            ) : (
              <CloudUpload className="size-5" />
            )}
          </span>
          <span className="mt-5 text-base font-semibold">
            {upload.isPending
              ? t('collection.sources.uploading')
              : t('collection.sources.dropTitle')}
          </span>
          <span className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            {t('collection.sources.dropDescription')}
          </span>
          <span className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium shadow-xs">
            <Upload className="size-4" />
            {t('collection.sources.chooseFile')}
          </span>
        </button>
        {upload.entries.length > 0 && (
          <div className="space-y-2" aria-live="polite">
            {upload.entries.map((entry) => (
              <UploadFileRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
