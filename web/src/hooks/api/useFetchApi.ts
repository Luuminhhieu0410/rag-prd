import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '../../helpers';

interface UseFetchApiParams<T> {
  url: string;
  params?: Record<string, unknown>;
  defaultData?: T;
  enabled?: boolean;
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>;
}

export default function useFetchApi<T = unknown>({
  url,
  params = {},
  defaultData,
  enabled = true,
  options = {},
}: UseFetchApiParams<T>) {
  const query = useQuery<T, Error>({
    queryKey: [url, params],
    queryFn: () => api<T>({ url, method: 'GET', params }),
    enabled,
    ...options,
  });

  return {
    data: (query.data ?? defaultData) as T,
    loading: query.isLoading,
    fetching: query.isFetching,
    fetched: query.isSuccess,
    error: query.error,
    refetch: query.refetch,
  };
}
