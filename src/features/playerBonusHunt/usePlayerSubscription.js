import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { accountQueryOptions } from '../../config/queryClient';
import { getPlayerSubscriptionStatus } from './playerBonusHuntService';

export default function usePlayerSubscription() {
  const { user, loading: authLoading } = useAuth();
  const { data, isPending, isError, error, refetch } = useQuery({
    ...accountQueryOptions,
    queryKey: ['account', user?.id, 'player-subscription'],
    enabled: !!user?.id && !authLoading,
    queryFn: getPlayerSubscriptionStatus,
  });
  const userId = user?.id;
  const refresh = useCallback(async () => {
    if (userId) await refetch();
  }, [userId, refetch]);
  const plan = user && !isError ? data : null;

  return {
    loading: authLoading || (!!user && isPending),
    entitled: !!plan?.entitled,
    subscription: plan?.subscription || null,
    plan: plan || null,
    error: error?.message || null,
    refresh,
  };
}
