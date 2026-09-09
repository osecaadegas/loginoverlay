import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep inactive data in cache for 10 minutes (Query v5)
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      retry: 1,
    },
  },
});

// Access checks are shared by route guards and pages, scoped to the signed-in user.
export const accountQueryOptions = {
  staleTime: 60 * 1000,
  refetchInterval: 5 * 60 * 1000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: false,
  retry: false,
};

export function invalidateAccountQueries(userId) {
  return queryClient.invalidateQueries({ queryKey: ['account', userId] });
}
