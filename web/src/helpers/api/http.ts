import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS } from '@/const/api';
import { auth } from '@/helpers/firebase';

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
});

http.interceptors.request.use(async (config) => {
  const idToken = await auth.currentUser?.getIdToken();
  config.headers.set('Accept', 'application/json');
  if (idToken) config.headers.set('Authorization', `Bearer ${idToken}`);
  return config;
});
