import {useAuthStore} from '../stores/authStore';
import {signInWithGoogle, signOutUser} from '@/helpers';


export default function useFirebaseAuth() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  return { user, loading, signInWithGoogle, signOut: signOutUser };
}
