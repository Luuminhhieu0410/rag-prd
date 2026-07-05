import {LogOut, Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {ReactNode} from "react";
import {signOutUser} from "@/helpers";
import {useAuthStore} from "@/stores/authStore.ts";

export function AppShell({children}: {children: ReactNode}) {

  const me = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);

  const onSignOut = () => {
    signOutUser().catch((err) => console.error("Error signing out", err));
    setUser(null );
  }
  return (
    <div className="min-h-[100dvh] bg-[oklch(0.965_0.018_155)] text-zinc-950">
      <header className="sticky top-0 z-20 border-b border-emerald-950/10 bg-[oklch(0.985_0.006_155)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-950 text-emerald-50">
              <Search className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">
                Source notebook
              </h1>
              <p className="truncate text-xs text-zinc-600">
                {me?.email ?? 'Signed in'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onSignOut}>
              <LogOut />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1480px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)_22rem] lg:py-5">
        {children}
      </main>
    </div>
  );
}
