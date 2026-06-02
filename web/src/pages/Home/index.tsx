import useAuth from '../../hooks/useAuth';
import useMe from '../../hooks/api/useMe';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { signOut } = useAuth();
  const { data: me, loading, error } = useMe();

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Home</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void signOut().catch(console.error)}
        >
          Sign out
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4 text-card-foreground">
        {loading && <p className="text-muted-foreground">Loading profile…</p>}
        {error && <p className="text-destructive">Failed to load profile</p>}
        {me && (
          <dl className="grid grid-cols-[5rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">id</dt>
            <dd className="break-all">{me.id}</dd>
            <dt className="text-muted-foreground">email</dt>
            <dd>{me.email}</dd>
            <dt className="text-muted-foreground">name</dt>
            <dd>{me.name ?? '—'}</dd>
          </dl>
        )}
      </div>
    </div>
  );
}
