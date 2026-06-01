import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { api } from '../../helpers';

interface UsePostApiParams<TData, TBody> {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  invalidateKey?: unknown[];
  options?: Omit<UseMutationOptions<TData, Error, TBody>, 'mutationFn'>;
}

export default function usePostApi<TData = unknown, TBody = unknown>({
  url,
  method = 'POST',
  invalidateKey,
  options = {},
}: UsePostApiParams<TData, TBody>) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options;

  const mutation = useMutation<TData, Error, TBody>({
    mutationFn: (body: TBody) => api<TData>({ url, method, data: body }),
    onSuccess: (...args) => {
      if (invalidateKey) {
        queryClient.invalidateQueries({ queryKey: invalidateKey });
      }
      onSuccess?.(...args);
    },
    ...restOptions,
  });

  return {
    ...mutation,
    submitting: mutation.isPending,
    handleSubmit: mutation.mutateAsync,
  };
}
