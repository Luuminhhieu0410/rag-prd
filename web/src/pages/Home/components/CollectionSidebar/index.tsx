import { Folder, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/Panel';
import { EmptyState, LoadingRows } from '@/components/StateBlocks';
import { cn } from '@/lib/utils';
import type { Collection } from '@/types/api';

export function CollectionSidebar({
  collections,
  selectedId,
  isLoading,
  isError,
  isCreating,
  onCreate,
  onSelect,
}: {
  collections: Collection[];
  selectedId: string | null;
  isLoading: boolean;
  isError: boolean;
  isCreating: boolean;
  onCreate: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="lg:sticky lg:top-[5.5rem] lg:self-start">
      <Panel>
        <div className="flex items-center justify-between border-b border-emerald-950/10 px-4 py-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">Collections</h2>
            <p className="text-xs text-zinc-600">{collections.length} workspaces</p>
          </div>
          <Button
            size="icon"
            variant="outline"
            title="Create collection"
            onClick={onCreate}
            disabled={isCreating}
          >
            {isCreating ? <Loader2 className="animate-spin" /> : <Plus />}
          </Button>
        </div>

        <div className="max-h-[calc(100dvh-9rem)] overflow-auto p-2">
          {isLoading && <LoadingRows />}
          {isError && (
            <div className="m-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Collections could not be loaded.
            </div>
          )}
          {collections.length === 0 && !isLoading && (
            <EmptyState
              icon={Folder}
              title="No collections"
              body="Create a collection, then upload files into that workspace."
              action={
                <Button size="sm" onClick={onCreate} disabled={isCreating}>
                  <Plus />
                  Create
                </Button>
              }
            />
          )}
          {collections.map((collection) => (
            <button
              key={collection.id}
              className={cn(
                'mb-1 block w-full rounded-xl border border-transparent px-3 py-3 text-left text-sm transition active:translate-y-px',
                selectedId === collection.id
                  ? 'border-emerald-950 bg-emerald-950 text-white'
                  : 'hover:border-emerald-950/10 hover:bg-emerald-50/50',
              )}
              onClick={() => onSelect(collection.id)}
            >
              <span className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
                    selectedId === collection.id
                      ? 'bg-white/10 text-white'
                      : 'bg-emerald-100 text-emerald-900',
                  )}
                >
                  <Folder className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {collection.name}
                  </span>
                  <span
                    className={cn(
                      'mt-1 block text-xs',
                      selectedId === collection.id
                        ? 'text-emerald-100/75'
                        : 'text-zinc-600',
                    )}
                  >
                    {collection._count?.documents ?? 0} documents
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </Panel>
    </aside>
  );
}
