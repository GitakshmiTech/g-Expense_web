import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const useList = (key, fn, options = {}) => useQuery({ queryKey: [key], queryFn: fn, ...options });

export const useSave = (mutationFn, invalidateKeys = []) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }))
  });
};
