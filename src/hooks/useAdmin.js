import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserRoles } from '../utils/adminUtils';
import { supabase } from '../config/supabaseClient';

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isSlotModder, setIsSlotModder] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsModerator(false);
        setIsSlotModder(false);
        setIsPremium(false);
        setUserRoles([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await getUserRoles(user.id);
        
        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          setIsModerator(false);
          setIsSlotModder(false);
          setIsPremium(false);
          setUserRoles([]);
        } else {
          const roles = data || [];
          const roleNames = roles.map(r => r.role);
          let hasStreamerEntitlement = false;

          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            if (token) {
              const response = await fetch('/api/premium?action=status', {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (response.ok) {
                const payload = await response.json();
                hasStreamerEntitlement = !!payload.access?.hasStreamerAccess;
              }
            }
          } catch (error) {
            console.warn('Premium entitlement check failed:', error);
          }
          
          setUserRoles(roles);
          setIsAdmin(roleNames.includes('admin') || roleNames.includes('superadmin'));
          setIsModerator(roleNames.includes('moderator') || roleNames.includes('admin') || roleNames.includes('superadmin'));
          setIsSlotModder(roleNames.includes('slot_modder') || roleNames.includes('admin') || roleNames.includes('superadmin'));
          setIsPremium(hasStreamerEntitlement || roleNames.includes('premium') || roleNames.includes('admin') || roleNames.includes('superadmin'));
        }
      } catch (error) {
        console.error('Error in useAdmin:', error);
        setIsAdmin(false);
        setIsModerator(false);
        setIsSlotModder(false);
        setIsPremium(false);
        setUserRoles([]);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, isModerator, isSlotModder, isPremium, userRoles, loading };
};
