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
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          /* Check if access hasn't expired */
          const expires = data.access_expires_at ? new Date(data.access_expires_at) : null;
          const active = !expires || expires > new Date();
          setIsPremium(active);
          setPremiumUntil(expires);
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
