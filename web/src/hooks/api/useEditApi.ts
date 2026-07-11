import {
  type QueryKey,
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { toast } from 'sonner';

import { api, type ApiResponse } from '@/helpers';

type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiError = AxiosError<ApiResponse<null>>;

interface EditVariables<TBody> {
  data: TBody;
  invalidateKey?: QueryKey;
  successMsg?: string;
  errorMsg?: string;
}

interface UseEditApiParams<TData, TBody> {
  url: string;
  method?: HttpMethod;
  useToast?: boolean;
  showError?: boolean;
  successMsg?: string;
  errorMsg?: string;

  options?: Omit<
    UseMutationOptions<ApiResponse<TData>, ApiError, EditVariables<TBody>>,
    'mutationFn' | 'onSuccess' | 'onError' | 'onSettled'
  >;
}

export default function useEditApi<TData = unknown, TBody = unknown>({
  url,
  method = 'POST',
  useToast = true,
  showError = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save',
  options,
}: UseEditApiParams<TData, TBody>) {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<TData>, ApiError, EditVariables<TBody>>({
    ...options,

    mutationFn: ({ data }) =>
      api<TData>({
        url,
        method,
        data,
      }),

    onSuccess: async (_response, variables) => {
      console.log(variables.data);
      if (variables.invalidateKey?.length) {
        await queryClient.invalidateQueries({
          queryKey: variables.invalidateKey,
        });
      }

      if (useToast) {
        toast.success(variables.successMsg ?? successMsg);
      }
    },

    onError: (error, variables) => {
      console.error('Edit API failed:', error, variables);

      if (useToast && showError) {
        toast.error(
          variables.errorMsg ?? error.response?.data?.message ?? errorMsg,
          { position: 'top-right' },
        );
      }
    },
  });
}
