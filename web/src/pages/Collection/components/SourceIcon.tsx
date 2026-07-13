import type { DocumentRecord } from '@/types/api';
import {
  Braces,
  File,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const sourceIcons: Record<string, LucideIcon> = {
  pdf: FileText,
  docx: FileText,
  csv: FileSpreadsheet,
  markdown: FileText,
  javascript: Braces,
  typescript: FileCode2,
  python: FileCode2,
  html: FileCode2,
  json: FileJson,
  text: FileText,
  url: File,
};

const sourceStyles: Partial<Record<DocumentRecord['sourceType'], string>> = {
  pdf: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  docx: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  csv: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  markdown: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  javascript:
    'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  typescript: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
};

export function SourceIcon({
  sourceType,
}: {
  sourceType: DocumentRecord['sourceType'];
}) {
  const Icon = sourceIcons[sourceType] ?? File;

  return (
    <span
      className={`grid size-9 shrink-0 place-items-center rounded-lg ${sourceStyles[sourceType] ?? 'bg-muted text-muted-foreground'}`}
      aria-hidden="true"
    >
      <Icon className="size-4" />
    </span>
  );
}
