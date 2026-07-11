import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { ApiResponse } from '@/helpers';
import { api } from '@/helpers';
import type { AxiosError } from 'axios';

interface UseFetchApiParams<T> {
  url: string;
  params?: Record<string, unknown>;
  defaultData?: T;
  enabled?: boolean;
  options?: Omit<
    UseQueryOptions<ApiResponse<T>, AxiosError<ApiResponse<null>>>,
    'queryKey' | 'queryFn'
  >;
}

export default function useFetchApi<T = unknown>({
  url,
  params = {},
  defaultData,
  enabled = true,
  options = {},
}: UseFetchApiParams<T>) {
  const query = useQuery<ApiResponse<T>, AxiosError<ApiResponse<null>>>({
    queryKey: [url, params],
    queryFn: () => api<T>({ url, method: 'GET', params }),
    enabled,
    ...options,
  });
  return {
    data: (query?.data?.data ?? defaultData) as T,
    loading: query.isLoading,
    fetching: query.isFetching,
    fetched: query.isSuccess,
    error: query.error,
    refetch: query.refetch,
  };
}
