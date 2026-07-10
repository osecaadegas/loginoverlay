import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getPlayerSubscriptionStatus } from './playerBonusHuntService';

export default function usePlayerSubscription() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({
    loading: true,
    entitled: false,
    subscription: null,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!user) {
      setState({ loading: false, entitled: false, subscription: null, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getPlayerSubscriptionStatus();
      setState({
        loading: false,
        entitled: !!data.entitled,
        subscription: data.subscription || null,
        plan: data,
        error: null,
      });
    } catch (error) {
      setState({
        loading: false,
        entitled: false,
        subscription: null,
        error: error.message,
      });
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  return { ...state, refresh };
}
