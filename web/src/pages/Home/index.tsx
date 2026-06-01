import useAuth from '../../hooks/useAuth';
import useMe from '../../hooks/api/useMe';

export default function HomePage() {
  const { signOut } = useAuth();
  const { data: me, loading, error } = useMe();

  return (
    <div style={{ padding: 24 }}>
      <h1>Home</h1>
      {loading && <p>Loading profile…</p>}
      {error && <p style={{ color: 'crimson' }}>Failed to load profile</p>}
      {me && (
        <ul>
          <li>id: {me.id}</li>
          <li>email: {me.email}</li>
          <li>name: {me.name ?? '—'}</li>
        </ul>
      )}
      <button onClick={() => void signOut().catch(console.error)}>Sign out</button>
    </div>
  );
}
