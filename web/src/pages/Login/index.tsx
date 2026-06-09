import {Navigate} from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import {ROUTES} from '@/const/app.ts';
import {Button} from '@/components/ui/button';

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Loading…
      </div>
    );
  if (user) return <Navigate to={ROUTES.home} replace />;

  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4">
        <p className="text-muted-foreground">Sign in to continue</p>
        <Button onClick={() => void signInWithGoogle().catch(console.error)}>
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}





