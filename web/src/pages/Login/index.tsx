import {Navigate} from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import {ROUTES} from '@/const/app';
import {Button} from '@/components/ui/button';

export default function LoginPage() {
  const { user, signInWithGoogle } = useAuth();

  // if (loading)
  //   return (
  //     <div className="grid min-h-[100dvh] place-items-center bg-zinc-50 text-zinc-500">
  //       <div className="flex items-center gap-2 text-sm">
  //         <Loader2 className="size-4 animate-spin" />
  //         Loading workspace
  //       </div>
  //     </div>
  //   );
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
