/**
 * Subscription Hook
 * Hook to check user's subscription status
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    loadSubscription();

    // REPLACED REALTIME WITH POLLING TO REDUCE EGRESS
    console.warn('useSubscription: Realtime disabled for egress reduction. Using polling instead.');
    
    // Poll every 60 seconds (subscription status rarely changes)
    const subscriptionInterval = setInterval(() => {
      loadSubscription();
    }, 60000);

    return () => {
      clearInterval(subscriptionInterval);
    };
  }, [user]);

  const loadSubscription = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setSubscription(data);
      setError(null);
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isTrialing = subscription?.status === 'trialing';
  const isPastDue = subscription?.status === 'past_due';
  const isCanceled = subscription?.status === 'canceled';

  const daysUntilRenewal = subscription?.current_period_end
    ? Math.ceil((new Date(subscription.current_period_end) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const daysInTrial = subscription?.trial_end && isTrialing
    ? Math.ceil((new Date(subscription.trial_end) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    subscription,
    loading,
    error,
    isActive,
    isTrialing,
    isPastDue,
    isCanceled,
    daysUntilRenewal,
    daysInTrial,
    reload: loadSubscription
  };
}
