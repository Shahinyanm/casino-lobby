import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 'online' (the default) would not even try a request while offline, so the service worker's
      // cached catalog would never be reached. Let the request run and let the SW answer it.
      networkMode: 'offlineFirst',
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // The first attempt always runs, so a deposit made offline fails and rolls back now instead of
      // sitting "pending". Resending an unknown outcome (see retryDeposit) waits for the network.
      networkMode: 'offlineFirst',
    },
  },
});
