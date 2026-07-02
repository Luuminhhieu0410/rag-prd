import axios from 'axios';
import { API_BASE_URL } from '@/const/api';
import { auth } from '@/helpers/firebase';

export const http = axios.create({ baseURL: API_BASE_URL, timeout: 60000 });

http.interceptors.request.use(async (config) => {
  const idToken = await auth.currentUser?.getIdToken();
  config.headers.set('Accept', 'application/json');
  if (idToken) config.headers.set('Authorization', `Bearer ${idToken}`);
  return config;
});
