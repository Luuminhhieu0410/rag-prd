import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { ROUTES } from '../../const/app';

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (user) return <Navigate to={ROUTES.home} replace />;

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>RAG NotebookLM-lite</h1>
        <p>Sign in to continue</p>
        <button onClick={() => void signInWithGoogle().catch(console.error)}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
