import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';

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
