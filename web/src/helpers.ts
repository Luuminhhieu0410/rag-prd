import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import axios, { type AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './const/app';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return firebaseSignOut(auth);
}

export interface ApiParams {
  url: string;
  data?: unknown;
  method?: AxiosRequestConfig['method'];
  params?: Record<string, unknown>;
  options?: AxiosRequestConfig;
}


export async function api<T = unknown>({
  url,
  data = {},
  method = 'GET',
  params = {},
  options = {},
}: ApiParams): Promise<T> {
  const idToken = await auth.currentUser?.getIdToken();
  const client = axios.create({ baseURL: API_BASE_URL, timeout: 60000 });
  const resp = await client.request<T>({
    url,
    data,
    method,
    params,
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
  });
  return resp.data;
}
