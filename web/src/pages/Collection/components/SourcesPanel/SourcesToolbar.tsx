import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { DOCUMENT_FILE_ACCEPT } from '@/const/document-upload';
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useSourcesPanelContext from '@/context/SourcesPanelContext';

export function SourcesToolbar() {
  const { t } = useTranslation();
  const { inputRef, upload, openUpload, submitUpload } =
    useSourcesPanelContext();
  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
        <h2 className="font-semibold">{t('collection.sources.title')}</h2>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={DOCUMENT_FILE_ACCEPT}
          multiple
          onChange={(event) =>
            event.target.files && void submitUpload(event.target.files)
          }
        />
        <Button
          className="ml-auto"
          size="sm"
          onClick={openUpload}
          disabled={upload.isPending}
        >
          {upload.isPending ? <Spinner /> : <Upload />}
          {t('collection.sources.add')}
        </Button>
      </div>
    </>
  );
}
