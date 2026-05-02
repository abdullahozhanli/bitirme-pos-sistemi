import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 0,
      gcTime: 0, // cacheTime yerine gcTime (React Query v5)
    },
  },
});








