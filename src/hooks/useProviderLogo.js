import { useQuery } from '@tanstack/react-query';
import { fetchManagedProviders, PROVIDER_QUERY_KEY } from '../services/slotProviderService';
import { resolveCatalogProviderLogo } from '../utils/slotProviderCatalog';
import { queryClient } from '../config/queryClient';

export function useProviderLogo(provider) {
  const { data } = useQuery({
    queryKey: PROVIDER_QUERY_KEY, queryFn: fetchManagedProviders,
    staleTime: 300000, gcTime: 1800000, refetchOnWindowFocus: false, retry: 1,
    enabled: Boolean(provider),
  }, queryClient);
  return resolveCatalogProviderLogo(data || [], provider);
}
