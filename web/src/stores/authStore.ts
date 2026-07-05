import {create} from 'zustand';
import {onAuthStateChanged, type User} from 'firebase/auth';
import {auth} from '@/helpers';
import type {Me} from "@/hooks/api/useMe.ts";

interface AuthState {
  user: User | Me | null;
  loading: boolean;
  setUser: (user: User | Me | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
}));


onAuthStateChanged(auth, (user) => {
  useAuthStore.getState().setUser(user);
});
