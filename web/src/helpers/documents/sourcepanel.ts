import type { DocumentStatus } from '@/types/api.ts';

export const mappingBadgeClassName = (documentStatus: DocumentStatus) => {
  switch (documentStatus) {
    case 'uploaded':
      return 'bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300';
    case 'parsing':
    case 'chunking':
    case 'embedding':
      return 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
    case 'ready':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    case 'failed':
      return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300';
  }
};
