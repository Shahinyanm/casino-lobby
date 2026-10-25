import type { CatalogResponse } from '@lobby/contracts';
import { queryOptions } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const catalogQuery = queryOptions({
  queryKey: ['catalog'],
  queryFn: ({ signal }) => api<CatalogResponse>('/games', { signal }),
  staleTime: 5 * 60_000,
});
