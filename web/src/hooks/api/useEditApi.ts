import {
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from '@tanstack/react-query';
import type { ApiResponse } from '@/helpers';
import { api } from '@/helpers';
import type { AxiosError } from 'axios';

interface UsePostApiParams<TData, TBody> {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  invalidateKey?: unknown[];
  options?: Omit<
    UseMutationOptions<
      ApiResponse<TData>,
      AxiosError<ApiResponse<null>>,
      TBody
    >,
    'mutationFn'
  >;
}

export default function useEditApi<TData = unknown, TBody = unknown>({
  url,
  method = 'POST',
  invalidateKey,
  options = {},
}: UsePostApiParams<TData, TBody>) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options;

  const mutation = useMutation<
    ApiResponse<TData>,
    AxiosError<ApiResponse<null>>,
    TBody
  >({
    mutationFn: (body: TBody) => api<TData>({ url, method, data: body }),
    onSuccess: (...args) => {
      if (invalidateKey) {
        queryClient.invalidateQueries({ queryKey: invalidateKey });
      }
      onSuccess?.(...args);
    },
    onError: (error, variables, onMutateResult, context) => {
      console.log('error', error);
      console.log('variables', variables);
    },
    ...restOptions,
  });

  return {
    ...mutation,
    submitting: mutation.isPending,
    handleSubmit: mutation.mutateAsync,
  };
}
