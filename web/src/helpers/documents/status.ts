import type { DocumentRecord } from '@/types/api';

export const processingStatuses: DocumentRecord['status'][] = [
  'uploaded',
  'parsing',
  'chunking',
  'embedding',
];

export function isProcessing(doc: DocumentRecord) {
  return processingStatuses.includes(doc.status);
}

export function readableStatus(status: DocumentRecord['status']) {
  switch (status) {
    case 'uploaded':
      return 'Uploaded';
    case 'parsing':
      return 'Parsing';
    case 'chunking':
      return 'Chunking';
    case 'embedding':
      return 'Embedding';
    case 'ready':
      return 'Ready';
    case 'failed':
      return 'Failed';
  }
}

export function statusClass(status: DocumentRecord['status']) {
  switch (status) {
    case 'ready':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'failed':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'uploaded':
      return 'border-zinc-200 bg-zinc-50 text-zinc-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-800';
  }
}
