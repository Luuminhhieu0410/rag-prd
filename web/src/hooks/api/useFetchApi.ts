import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { ApiResponse } from '@/helpers';
import { api } from '@/helpers';
import type { AxiosError } from 'axios';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface UseFetchApiParams<T> {
  url: string;
  params?: Record<string, unknown>;
  defaultData?: T;
  enabled?: boolean;
  useToast?: boolean;
  showError?: boolean;
  successMsg?: string;
  errorMsg?: string;
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
  useToast = false,
  showError = false,
  successMsg = 'Get successfully',
  errorMsg = 'Failed to get',
  options = {},
}: UseFetchApiParams<T>) {
  const query = useQuery<ApiResponse<T>, AxiosError<ApiResponse<null>>>({
    queryKey: [url, params],
    queryFn: () => api<T>({ url, method: 'GET', params }),
    enabled,
    ...options,
  });
  useEffect(() => {
    if (!useToast || !showError || !query.error) return;

    toast.error(query.error.response?.data?.message || errorMsg);
    // console.log(123);
    // throw query.error;
  }, [query.error]);

  return {
    data: (query?.data?.data ?? defaultData) as T,
    loading: query.isLoading,
    fetching: query.isFetching,
    fetched: query.isSuccess,
    isBackgroundRefetch: query.isRefetching,
    isFetched: query.isFetched,
    error: query.error,
    refetch: query.refetch,
  };
}
