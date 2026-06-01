import useFetchApi from './useFetchApi';
import useAuth from '../useAuth';

export interface Me {
  id: string;
  firebaseUid: string;
  email: string;
  name: string | null;
}

export default function useMe() {
  const { user } = useAuth();
  // Enabled only once Firebase reports a signed-in user; the first call
  // triggers the backend lazy-upsert into Postgres.
  return useFetchApi<Me>({ url: '/auth/me', enabled: !!user });
}
