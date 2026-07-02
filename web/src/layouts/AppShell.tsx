import type { ReactNode } from 'react';
import {
  BookOpen,
  FileText,
  KeyRound,
  LogOut,
  MessageSquare,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppShell({
  email,
  children,
  onSignOut,
}: {
  email?: string | null;
  children: ReactNode;
  onSignOut: () => void;
}) {
  return (
    <div className="min-h-[100dvh] bg-zinc-50 text-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-zinc-950 text-white shadow-sm shadow-zinc-950/20">
              <Search className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">
                RAG Workspace
              </h1>
              <p className="truncate text-xs text-zinc-500">
                {email ?? 'Signed in'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center rounded-full border border-zinc-200 bg-white p-1 text-xs text-zinc-500 shadow-sm shadow-zinc-950/[0.02] md:flex">
              <span className="rounded-full bg-zinc-950 px-3 py-1.5 font-medium text-white">
                Sources
              </span>
              <span className="px-3 py-1.5">Chat</span>
            </div>
            <Button variant="outline" size="sm" onClick={onSignOut}>
              <LogOut />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[5rem_20rem_minmax(0,1fr)] lg:py-6">
        <nav className="hidden lg:block">
          <div className="sticky top-[5.5rem] grid gap-2 rounded-2xl border border-zinc-200/80 bg-white p-2 shadow-sm shadow-zinc-950/[0.03]">
            {[
              { label: 'Collections', icon: BookOpen, active: true },
              { label: 'Documents', icon: FileText },
              { label: 'Chat', icon: MessageSquare },
              { label: 'API keys', icon: KeyRound },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  title={item.label}
                  className={
                    item.active
                      ? 'grid size-12 place-items-center rounded-2xl bg-zinc-950 text-white shadow-sm shadow-zinc-950/15'
                      : 'grid size-12 place-items-center rounded-2xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950'
                  }
                >
                  <Icon className="size-5" />
                </button>
              );
            })}
          </div>
        </nav>
        {children}
      </main>
    </div>
  );
}
