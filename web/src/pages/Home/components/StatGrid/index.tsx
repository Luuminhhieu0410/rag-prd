import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, FileText, KeyRound, RefreshCw } from 'lucide-react';

interface WorkspaceStats {
  documents: number;
  ready: number;
  failed: number;
  processing: number;
  chunks: number;
  activeApiKeys: number;
}

function StatTile({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm shadow-zinc-950/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            {value}
          </p>
        </div>
        <span className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-600">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

export function StatGrid({ stats }: { stats: WorkspaceStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Documents"
        value={stats.documents}
        detail={`${stats.ready} ready, ${stats.failed} failed`}
        icon={FileText}
      />
      <StatTile
        label="Processing"
        value={stats.processing}
        detail="Auto-refreshes while jobs run"
        icon={RefreshCw}
      />
      <StatTile
        label="Chunks"
        value={stats.chunks}
        detail="Indexed context pieces"
        icon={CheckCircle2}
      />
      <StatTile
        label="API keys"
        value={stats.activeApiKeys}
        detail="Active keys in this workspace"
        icon={KeyRound}
      />
    </div>
  );
}
