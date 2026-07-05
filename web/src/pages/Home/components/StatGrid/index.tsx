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
    <div className="rounded-xl border border-emerald-950/10 bg-[oklch(0.99_0.003_155)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-600">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            {value}
          </p>
        </div>
        <span className="rounded-lg bg-emerald-100 p-2 text-emerald-900">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-xs text-zinc-600">{detail}</p>
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
