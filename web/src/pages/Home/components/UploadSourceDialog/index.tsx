import type { RefObject } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function UploadSourceDialog({
  open,
  isUploading,
  isDraggingFile,
  fileInputRef,
  onOpenChange,
  onDraggingFileChange,
  onFileSelected,
}: {
  open: boolean;
  isUploading: boolean;
  isDraggingFile: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onOpenChange: (open: boolean) => void;
  onDraggingFileChange: (dragging: boolean) => void;
  onFileSelected: (file?: File) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload source</DialogTitle>
          <DialogDescription>
            Add a source file to the selected collection. The ingestion pipeline
            will parse, chunk, and index it.
          </DialogDescription>
        </DialogHeader>
      <div className="p-5">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            onFileSelected(event.target.files?.[0] ?? undefined);
            onOpenChange(false);
          }}
        />
        <div
          className={cn(
            'grid min-h-64 place-items-center rounded-xl border border-dashed p-6 text-center transition',
            isDraggingFile
              ? 'border-emerald-950 bg-emerald-100'
              : 'border-emerald-950/20 bg-emerald-50/60',
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            onDraggingFileChange(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => onDraggingFileChange(false)}
          onDrop={(event) => {
            event.preventDefault();
            onDraggingFileChange(false);
            onFileSelected(event.dataTransfer.files?.[0]);
            onOpenChange(false);
          }}
        >
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-xl bg-white text-emerald-900">
              {isUploading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Upload className="size-5" />
              )}
            </div>
            <h3 className="mt-4 text-sm font-semibold text-zinc-950">
              Drop your source here
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-600">
              PDF, DOCX, CSV, and text documents can be uploaded into this workspace.
            </p>
            <Button
              className="mt-5"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload />
              Select file
            </Button>
          </div>
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
}
