import { useQuery } from '@tanstack/react-query';

export default function useLandingSubscriptions() {
  return useQuery({
    queryKey: ['public', 'landing-subscriptions'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/premium?action=page', { signal });
      if (!response.ok) throw new Error('Pricing unavailable');
      const payload = await response.json();
      if (!Array.isArray(payload?.plans) || !Array.isArray(payload?.productTypes) || !Array.isArray(payload?.features)) {
        throw new Error('Pricing unavailable');
      }
      return payload;
    },
    staleTime: 60000,
    retry: false,
  });
}
