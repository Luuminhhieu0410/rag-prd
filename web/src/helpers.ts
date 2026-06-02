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

// Một axios instance dùng chung cho toàn app.
export const http = axios.create({ baseURL: API_BASE_URL, timeout: 60000 });

// Request interceptor: tự gắn Firebase ID token vào mọi request (SPEC §7).
// Token được Firebase SDK refresh tự động nên luôn lấy mới qua getIdToken().
http.interceptors.request.use(async (config) => {
  const idToken = await auth.currentUser?.getIdToken();
  config.headers.set('Accept', 'application/json');
  if (idToken) config.headers.set('Authorization', `Bearer ${idToken}`);
  return config;
});

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
  const resp = await http.request<T>({ url, data, method, params, ...options });
  return resp.data;
}
