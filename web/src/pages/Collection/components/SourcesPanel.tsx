import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { formatBytes } from '@/helpers/format/bytes';
import useEditApi from '@/hooks/api/useEditApi';
import useFetchApi from '@/hooks/api/useFetchApi';
import { SourceIcon } from '@/pages/Collection/components/SourceIcon';
import type { DocumentRecord } from '@/types/api';
import {
  CloudUpload,
  FilePlus2,
  MoreHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mappingBadgeClassName } from '@/helpers/documents/sourcepanel.ts';

interface SourcesPanelProps {
  collectionId: string;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  className?: string;
}

export function SourcesPanel({
  collectionId,
  selectedIds,
  onSelectionChange,
  className = '',
}: SourcesPanelProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<DocumentRecord | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const url = `/api/collection/${collectionId}/documents`;
  const {
    data: documents = [],
    loading,
    error,
  } = useFetchApi<DocumentRecord[]>({ url, defaultData: [] });

  const uploadMutation = useEditApi<DocumentRecord, FormData>({
    url,
    successMsg: t('collection.sources.uploaded'),
    errorMsg: t('collection.sources.uploadError'),
  });
  const deleteMutation = useEditApi<unknown, undefined>({
    url: `${url}/${deleting?.id}`,
    method: 'DELETE',
    successMsg: t('collection.sources.deleted'),
    errorMsg: t('collection.sources.deleteError'),
  });
  const visibleDocuments = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase();
    return query
      ? documents.filter((document) =>
          (document.originalName ?? '').toLocaleLowerCase().includes(query),
        )
      : documents;
  }, [documents, filter]);
  const allSelected =
    documents.length > 0 &&
    documents.every((document) => selectedIds.has(document.id));

  function toggleDocument(id: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectionChange(next);
  }

  async function uploadFile(file?: File) {
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    try {
      await uploadMutation.mutateAsync({ data, invalidateKey: [url, {}] });
      setAddOpen(false);
    } catch {
      // The shared mutation hook shows the localized error toast.
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function deleteDocument() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync({
        data: undefined,
        invalidateKey: [url, {}],
      });
    } catch {
      return;
    }
    const next = new Set(selectedIds);
    next.delete(deleting.id);
    onSelectionChange(next);
    setDeleting(null);
  }

  return (
    <>
      <aside
        className={`flex min-h-0 flex-col overflow-hidden rounded-xl bg-card ${className}`}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
          <div className="min-w-0">
            <h2 className="font-semibold">{t('collection.sources.title')}</h2>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept=".pdf,.docx,.csv,.md,.markdown,.js,.ts,.py,.html,.json,.txt"
            onChange={(event) => uploadFile(event.target.files?.[0])}
          />
          <Button
            className="ml-auto"
            size="sm"
            onClick={() => setAddOpen(true)}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? <Spinner /> : <Upload />}
            {t('collection.sources.add')}
          </Button>
        </div>

        <div className="">
          {documents.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 px-1 text-xs text-muted-foreground">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) =>
                  onSelectionChange(
                    checked
                      ? new Set(documents.map((document) => document.id))
                      : new Set(),
                  )
                }
              />
              {t('collection.sources.selectAll')}
            </label>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {loading && (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-lg" />
              ))}
            </div>
          )}
          {!loading && error && (
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
          {!loading && !error && documents.length === 0 && (
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(true)}
              >
                <Upload />
                {t('collection.sources.addFirst')}
              </Button>
            </Empty>
          )}
          {!loading &&
            !error &&
            documents.length > 0 &&
            visibleDocuments.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                {t('collection.sources.noResults')}
              </p>
            )}
          {!loading && !error && visibleDocuments.length > 0 && (
            <div className="space-y-1 p-2">
              {visibleDocuments.map((document) => (
                <div
                  key={document.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/70 has-data-checked:bg-muted"
                >
                  <Checkbox
                    checked={selectedIds.has(document.id)}
                    onCheckedChange={(checked) =>
                      toggleDocument(document.id, checked)
                    }
                    aria-label={t('collection.sources.select', {
                      name:
                        document.originalName ??
                        t('collection.sources.untitled'),
                    })}
                  />
                  <SourceIcon sourceType={document.sourceType} />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      title={document.originalName ?? undefined}
                    >
                      {document.originalName ??
                        t('collection.sources.untitled')}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge
                        // variant={
                        //   document.status === 'failed'
                        //     ? 'destructive'
                        //     : 'secondary'
                        // }
                        className={
                          'h-5 px-1.5 text-[10px] ' +
                          mappingBadgeClassName(document.status)
                        }
                      >
                        {t(`collection.status.${document.status}`)}
                      </Badge>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {formatBytes(document.byteSize)}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('collection.sources.actions', {
                            name: document.originalName ?? '',
                          })}
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleting(document)}
                      >
                        <Trash2 />
                        {t('collection.sources.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
              uploadFile(event.dataTransfer.files[0]);
            }}
            disabled={uploadMutation.isPending}
            aria-busy={uploadMutation.isPending}
          >
            <span className="grid size-12 place-items-center rounded-xl bg-background text-primary ring-1 ring-border transition-transform group-hover:-translate-y-0.5">
              {uploadMutation.isPending ? (
                <Spinner className="size-5" />
              ) : (
                <CloudUpload className="size-5" />
              )}
            </span>
            <span className="mt-5 text-base font-semibold">
              {uploadMutation.isPending
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
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('collection.sources.deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('collection.sources.deleteDescription', {
                name: deleting?.originalName ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('collection.actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={deleteDocument}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Spinner />}
              {t('collection.sources.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
