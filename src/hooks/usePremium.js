import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';
import { fetchWithTimeout } from '../utils/asyncTimeout';

export function usePremium() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPremium = async () => {
      if (!user) {
        setIsPremium(false);
        setPremiumUntil(null);
        setLoading(false);
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
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
              setIsPremium(true);
              setPremiumUntil(trialExpiry ? new Date(trialExpiry) : subscriptionExpiry ? new Date(subscriptionExpiry) : null);
              return;
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
                .map((row) => new Date(row.access_expires_at))
                .sort((a, b) => b.getTime() - a.getTime())[0];

          setIsPremium(true);
          setPremiumUntil(latestExpiry);
        } else {
          setIsPremium(false);
          setPremiumUntil(null);
        }
      } catch (error) {
        console.error('Error checking premium status:', error);
        setIsPremium(false);
      } finally {
        setLoading(false);
      }
    };

    checkPremium();
  }, [user]);

  return { isPremium, premiumUntil, loading };
}
