import { Copy, KeyRound, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/FormField';
import { Panel } from '@/components/Panel';
import { EmptyState, LoadingRows } from '@/components/StateBlocks';
import { Badge } from '@/components/ui/badge';
import { inputBaseClassName } from '@/components/ui/input';
import type { ApiKeyRecord } from '@/types/api';
import { formatDate } from '@/helpers/format';

export function ApiKeysPanel({
  activeApiKeys,
  apiKeyName,
  newApiKey,
  isLoading,
  isError,
  isCreating,
  isRevoking,
  onApiKeyNameChange,
  onCreateApiKey,
  onRevokeApiKey,
}: {
  activeApiKeys: ApiKeyRecord[];
  apiKeyName: string;
  newApiKey: string | null;
  isLoading: boolean;
  isError: boolean;
  isCreating: boolean;
  isRevoking: boolean;
  onApiKeyNameChange: (value: string) => void;
  onCreateApiKey: () => void;
  onRevokeApiKey: (id: string) => void;
}) {
  return (
    <Panel>
      <div className="grid gap-5 border-b border-zinc-100 p-5 lg:grid-cols-[1fr_22rem]">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-zinc-100 text-zinc-700">
            <KeyRound className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-zinc-950">API keys</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
              Generate collection-scoped keys for external query clients.
            </p>
          </div>
        </div>
        <div className="grid gap-2">
          <FormField label="Key name">
            <input
              className={inputBaseClassName}
              value={apiKeyName}
              onChange={(event) => onApiKeyNameChange(event.target.value)}
            />
          </FormField>
          <Button
            onClick={onCreateApiKey}
            disabled={!apiKeyName.trim() || isCreating}
          >
            {isCreating ? <Loader2 className="animate-spin" /> : <KeyRound />}
            Create key
          </Button>
        </div>
      </div>

      {newApiKey && (
        <div className="border-b border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <ShieldCheck className="size-4" />
            Copy this key now. It will not be shown again.
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <code className="break-all rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950">
              {newApiKey}
            </code>
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(newApiKey)}
            >
              <Copy />
              Copy
            </Button>
          </div>
        </div>
      )}

      <div className="divide-y divide-zinc-100">
        {isLoading && <LoadingRows />}
        {isError && (
          <div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            API keys could not be loaded.
          </div>
        )}
        {activeApiKeys.map((key) => (
          <div
            key={key.id}
            className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium text-zinc-950">{key.name}</p>
                <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600">
                  {key.prefix}...
                </Badge>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                Created {formatDate(key.createdAt)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRevokeApiKey(key.id)}
              disabled={isRevoking}
            >
              <Trash2 />
              Revoke
            </Button>
          </div>
        ))}
        {activeApiKeys.length === 0 && !isLoading && !isError && (
          <EmptyState
            icon={KeyRound}
            title="No active keys"
            body="Create a key when an external client needs collection access."
          />
        )}
      </div>
    </Panel>
  );
}
