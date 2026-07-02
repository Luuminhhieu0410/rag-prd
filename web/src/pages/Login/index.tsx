import { Database, Loader2, Search, ShieldCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { ROUTES } from '@/const/app';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading)
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-zinc-50 text-zinc-500">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading workspace
        </div>
      </div>
    );
  if (user) return <Navigate to={ROUTES.home} replace />;

  return (
    <div className="min-h-[100dvh] bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(24,24,27,0.08)] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between border-b border-zinc-200 bg-zinc-950 p-6 text-white lg:border-b-0 lg:border-r lg:p-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-white text-zinc-950">
              <Search className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">RAG Workspace</p>
              <p className="text-xs text-zinc-400">Document retrieval console</p>
            </div>
          </div>

          <div className="my-14 max-w-xl lg:my-0">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
              Private knowledge base
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Manage collections, ingestion, and scoped API access.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-zinc-300">
              Upload source files, monitor parsing jobs, and keep external
              clients isolated with collection-level keys.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <Database className="mb-3 size-5 text-white" />
              <p className="font-medium text-white">Indexed context</p>
              <p className="mt-1 text-zinc-400">
                Track document state from upload to chunks.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <ShieldCheck className="mb-3 size-5 text-white" />
              <p className="font-medium text-white">Scoped access</p>
              <p className="mt-1 text-zinc-400">
                Issue keys only for the collections clients need.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight">
                Sign in
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Continue with the Google account connected to your workspace.
              </p>
            </div>

            <Button
              className="h-11 w-full active:translate-y-px"
              onClick={() => void signInWithGoogle().catch(console.error)}
            >
              Sign in with Google
            </Button>

            <p className="mt-5 text-xs leading-5 text-zinc-500">
              Access is protected by Firebase authentication and enforced again
              by the API.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
