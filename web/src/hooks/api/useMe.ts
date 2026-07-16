import useFetchApi from './useFetchApi';
import useFirebaseAuth from '../useAuth';
import { useAuthStore } from '@/stores/authStore.ts';
import { useEffect } from 'react';

export interface Me {
  id: string;
  firebaseUid: string;
  email: string;
  name: string | null;
}

export default function useMe() {
  const { user: firebaseUser } = useFirebaseAuth();
  const query = useFetchApi<Me>({
    url: '/auth/me',
    enabled: !!firebaseUser,
    useToast: true,
    showError: true,
  });
  const setUser = useAuthStore((state) => state.setUser);
  useEffect(() => {
    if (query.data) {
      setUser(query.data);
    }
  }, [query.data, setUser]);

  return query;
}
