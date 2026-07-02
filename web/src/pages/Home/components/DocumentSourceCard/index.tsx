import {
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DocumentRecord } from '@/types/api';
import { formatBytes, formatDate } from '@/helpers/format';
import { readableStatus, statusClass } from '@/helpers/documents';

function SourceIcon({ sourceType }: { sourceType: string }) {
  const type = sourceType.toLowerCase();
  const Icon = type.includes('csv')
    ? FileSpreadsheet
    : type.includes('database')
      ? Database
      : FileText;

  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-600">
      <Icon className="size-5" />
    </span>
  );
}

export function DocumentSourceCard({
  document,
  isDeleting,
  onOpenDocumentUrl,
  onDeleteDocument,
}: {
  document: DocumentRecord;
  isDeleting: boolean;
  onOpenDocumentUrl: (docId: string, kind: 'raw' | 'text') => void;
  onDeleteDocument: (docId: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm shadow-zinc-950/[0.03] transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-zinc-950/[0.06]">
      <div className="flex items-start gap-3">
        <SourceIcon sourceType={document.sourceType} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-zinc-950">
                {document.originalName ?? document.id}
              </h3>
              <p className="mt-1 truncate text-xs text-zinc-500">
                {document.sourceType}
              </p>
            </div>
            <details className="relative shrink-0">
              <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 [&::-webkit-details-marker]:hidden">
                <MoreHorizontal className="size-4" />
              </summary>
              <div className="absolute right-0 top-10 z-10 grid w-48 gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg shadow-zinc-950/10">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                  onClick={() => onOpenDocumentUrl(document.id, 'raw')}
                >
                  <Download className="size-4" />
                  Open raw file
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!document.textPath}
                  onClick={() => onOpenDocumentUrl(document.id, 'text')}
                >
                  <FileText className="size-4" />
                  Open text
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isDeleting}
                  onClick={() => onDeleteDocument(document.id)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </button>
              </div>
            </details>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge className={cn(statusClass(document.status))}>
          {readableStatus(document.status)}
        </Badge>
        <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600">
          {document.chunkCount ?? 0} chunks
        </Badge>
        {document.byteSize && (
          <Badge className="border-zinc-200 bg-white text-zinc-600">
            {formatBytes(document.byteSize)}
          </Badge>
        )}
      </div>

      {document.errorMessage && (
        <p className="mt-3 line-clamp-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
          {document.errorMessage}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500">
        <span>Updated {formatDate(document.updatedAt)}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onOpenDocumentUrl(document.id, 'text')}
          disabled={!document.textPath}
        >
          Preview
        </Button>
      </div>
    </article>
  );
}
