import { Folder, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/StateBlocks';

export function WorkspaceEmptyPanel({
  isCreating,
  onCreate,
}: {
  isCreating: boolean;
  onCreate: () => void;
}) {
  return (
    <Panel>
      <EmptyState
        icon={Folder}
        title="Start with a collection"
        body="Collections group documents, API keys, and future query endpoints."
        action={
          <Button onClick={onCreate} disabled={isCreating}>
            <Plus />
            New collection
          </Button>
        }
      />
    </Panel>
  );
}
