import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';
import { accountQueryOptions } from '../config/queryClient';
import { fetchWithTimeout } from '../utils/asyncTimeout';
import { getAccessTokenWithFallback } from '../utils/authSession';

export function usePremium() {
  const { user, loading: authLoading } = useAuth();
  const premium = useQuery({
    ...accountQueryOptions,
    queryKey: ['account', user?.id, 'premium'],
    enabled: !!user?.id && !authLoading,
    queryFn: async () => {
      const token = await getAccessTokenWithFallback({ timeoutMs: 6000, label: 'Premium session token check' });
      if (token) {
        const response = await fetchWithTimeout('/api/premium?action=status', {
          headers: { Authorization: `Bearer ${token}` },
        }, { timeoutMs: 8000, label: 'Premium entitlement check' });
        if (response.ok) {
          const payload = await response.json();
          const access = payload.access || {};
          if (access.hasStreamerAccess) {
            const trialExpiry = access.activeTrial?.expires_at || access.trial?.expires_at || null;
            const subscriptionExpiry = access.currentSubscription?.currentPeriodEnd || null;
            return { isPremium: true, premiumUntil: trialExpiry || subscriptionExpiry };
          }
        }
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role, is_active, access_expires_at')
        .eq('user_id', user.id)
        .eq('role', 'premium')
        .eq('is_active', true);

      if (error) throw error;

      const now = new Date();
      const activeRows = (data || []).filter((row) => {
        const expires = row.access_expires_at ? new Date(row.access_expires_at) : null;
        return !expires || expires > now;
      });

      if (activeRows.length > 0) {
        const noExpiry = activeRows.some((row) => !row.access_expires_at);
        const latestExpiry = noExpiry
          ? null
          : activeRows
              .map((row) => row.access_expires_at)
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

        return { isPremium: true, premiumUntil: latestExpiry };
      }
      return { isPremium: false, premiumUntil: null };
    },
  });
  const data = user && !premium.isError ? premium.data : null;

  return {
    isPremium: !!data?.isPremium,
    premiumUntil: data?.premiumUntil ? new Date(data.premiumUntil) : null,
    loading: authLoading || (!!user && premium.isPending),
  };
}
