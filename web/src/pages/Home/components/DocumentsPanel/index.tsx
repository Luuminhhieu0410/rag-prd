import { AlertCircle, FileText, Loader2, Upload } from 'lucide-react';
import type { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/Panel';
import { EmptyState, LoadingRows } from '@/components/StateBlocks';
import type { DocumentRecord } from '@/types/api';
import { DocumentSourceCard } from '../DocumentSourceCard';
import { UploadSourceDialog } from '../UploadSourceDialog';

export function DocumentsPanel({
  documents,
  isLoading,
  isError,
  isUploading,
  isDeleting,
  isDraggingFile,
  uploadDialogOpen,
  fileInputRef,
  onUploadDialogOpenChange,
  onDraggingFileChange,
  onFileSelected,
  onOpenDocumentUrl,
  onDeleteDocument,
}: {
  documents: DocumentRecord[];
  isLoading: boolean;
  isError: boolean;
  isUploading: boolean;
  isDeleting: boolean;
  isDraggingFile: boolean;
  uploadDialogOpen: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onUploadDialogOpenChange: (open: boolean) => void;
  onDraggingFileChange: (dragging: boolean) => void;
  onFileSelected: (file?: File) => void;
  onOpenDocumentUrl: (docId: string, kind: 'raw' | 'text') => void;
  onDeleteDocument: (docId: string) => void;
}) {
  return (
    <Panel>
      <UploadSourceDialog
        open={uploadDialogOpen}
        isUploading={isUploading}
        isDraggingFile={isDraggingFile}
        fileInputRef={fileInputRef}
        onOpenChange={onUploadDialogOpenChange}
        onDraggingFileChange={onDraggingFileChange}
        onFileSelected={onFileSelected}
      />

      <div className="flex flex-col gap-4 border-b border-emerald-950/10 p-5 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-900">
            <FileText className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-zinc-950">Sources</h2>
            <p className="text-sm text-zinc-600">
              Upload documents and track parsing, chunking, and embedding.
            </p>
          </div>
        </div>

        <Button onClick={() => onUploadDialogOpenChange(true)} disabled={isUploading}>
          {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
          Upload source
        </Button>
      </div>

      <div className="p-5">
        <div
          className="mb-4 rounded-xl border border-dashed border-emerald-950/20 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-950"
          onDragEnter={(event) => {
            event.preventDefault();
            onDraggingFileChange(true);
            onUploadDialogOpenChange(true);
          }}
          onDragOver={(event) => event.preventDefault()}
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-white text-emerald-900">
              <Upload className="size-4" />
            </span>
            <p>Drag a PDF, DOCX, CSV, or text file here to upload.</p>
          </div>
        </div>

        {isLoading && <LoadingRows rows={6} />}

        {isError && (
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="size-4 shrink-0" />
            <p className="text-sm">Documents could not be loaded.</p>
          </div>
        )}

        {!isLoading && !isError && documents.length > 0 && (
          <div className="grid gap-2">
            {documents.map((doc) => (
              <DocumentSourceCard
                key={doc.id}
                document={doc}
                isDeleting={isDeleting}
                onOpenDocumentUrl={onOpenDocumentUrl}
                onDeleteDocument={onDeleteDocument}
              />
            ))}
          </div>
        )}

        {documents.length === 0 && !isLoading && !isError && (
          <EmptyState
            icon={Upload}
            title="No sources yet"
            body="Upload a source file to start the ingestion pipeline."
            action={
              <Button
                onClick={() => onUploadDialogOpenChange(true)}
                disabled={isUploading}
              >
                <Upload />
                Upload source
              </Button>
            }
          />
        )}
      </div>
    </Panel>
  );
}
