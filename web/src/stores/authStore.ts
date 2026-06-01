import { create } from 'zustand';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../helpers';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
}));

// Wire Firebase auth state into the store once, on module load.
onAuthStateChanged(auth, (user) => {
  useAuthStore.getState().setUser(user);
});
