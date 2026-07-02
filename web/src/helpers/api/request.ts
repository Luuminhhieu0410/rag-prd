import type { AxiosRequestConfig } from 'axios';
import { http } from './http';

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
