import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 0, // Her zaman fresh data çek (cache'i devre dışı bırak)
      cacheTime: 0, // Cache'i devre dışı bırak
    },
  },
});


