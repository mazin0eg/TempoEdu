import { useState, useCallback, useRef } from 'react';
import { invalidateQueries } from './useQuery';

interface UseMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error) => void;
  invalidateKeys?: string[];
}

export function useMutation<TData = unknown, TVariables = void>(
  options: UseMutationOptions<TData, TVariables>,
) {
  const [isLoading, setIsLoading] = useState(false);
  const optsRef = useRef(options);
  optsRef.current = options;

  const mutate = useCallback((variables: TVariables) => {
    setIsLoading(true);
    optsRef.current
      .mutationFn(variables)
      .then((result) => {
        setIsLoading(false);
        optsRef.current.onSuccess?.(result, variables);
        optsRef.current.invalidateKeys?.forEach((k) => invalidateQueries(k));
      })
      .catch((err) => {
        setIsLoading(false);
        const error = err instanceof Error ? err : new Error(String(err));
        optsRef.current.onError?.(error);
      });
  }, []);

  return { mutate, isLoading };
}
