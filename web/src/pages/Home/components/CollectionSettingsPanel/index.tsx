import { Database, Loader2, RefreshCw, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/FormField';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/ui/badge';
import { inputBaseClassName } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Collection } from '@/types/api';
import { formatDate } from '@/helpers/format';

export interface CollectionFormState {
  name: string;
  description: string;
}

export function CollectionSettingsPanel({
  collection,
  form,
  isUpdating,
  isDeleting,
  isFetchingDocuments,
  onFormChange,
  onUpdate,
  onDelete,
  onRefreshDocuments,
}: {
  collection: Collection;
  form: CollectionFormState;
  isUpdating: boolean;
  isDeleting: boolean;
  isFetchingDocuments: boolean;
  onFormChange: (form: CollectionFormState) => void;
  onUpdate: () => void;
  onDelete: () => void;
  onRefreshDocuments: () => void;
}) {
  return (
    <Panel>
      <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white shadow-sm shadow-zinc-950/15">
            <Database className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold tracking-tight text-zinc-950">
                {collection.name}
              </h2>
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                Active
              </Badge>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Created {formatDate(collection.createdAt)}
            </p>
            {collection.description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                {collection.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshDocuments}
            disabled={isFetchingDocuments}
          >
            <RefreshCw className={cn(isFetchingDocuments && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_1.5fr_auto]">
        <FormField label="Name">
          <input
            className={inputBaseClassName}
            value={form.name}
            onChange={(event) =>
              onFormChange({ ...form, name: event.target.value })
            }
          />
        </FormField>
        <FormField label="Description">
          <input
            className={inputBaseClassName}
            value={form.description}
            onChange={(event) =>
              onFormChange({ ...form, description: event.target.value })
            }
          />
        </FormField>
        <Button
          className="self-end"
          onClick={onUpdate}
          disabled={!form.name.trim() || isUpdating}
        >
          {isUpdating ? <Loader2 className="animate-spin" /> : <Save />}
          Save
        </Button>
      </div>
    </Panel>
  );
}
