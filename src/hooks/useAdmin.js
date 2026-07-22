import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserRoles } from '../utils/adminUtils';
import { getAccessTokenWithFallback } from '../utils/authSession';
import { fetchWithTimeout, withTimeout } from '../utils/asyncTimeout';

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isSlotModder, setIsSlotModder] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsModerator(false);
        setIsSlotModder(false);
        setIsPremium(false);
        setIsAffiliate(false);
        setUserRoles([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        let roles = [];
        let rolesError = null;
        let serverRoleNames = [];

        try {
          const result = await withTimeout(getUserRoles(user.id), 8000, 'Role access check');
          roles = result.data || [];
          rolesError = result.error || null;
        } catch (error) {
          rolesError = error;
        }

        let hasStreamerEntitlement = false;

        try {
          const token = await getAccessTokenWithFallback({ timeoutMs: 6000, label: 'Premium session token check' });
          if (token) {
            const response = await fetchWithTimeout('/api/premium?action=status', {
              headers: { Authorization: `Bearer ${token}` },
            }, { timeoutMs: 8000, label: 'Premium entitlement check' });
            if (response.ok) {
              const payload = await response.json();
              hasStreamerEntitlement = !!payload.access?.hasStreamerAccess;
              serverRoleNames = Array.isArray(payload.access?.roleNames) ? payload.access.roleNames : [];
              if ((!roles.length || roles.every((role) => role.role === 'user')) && Array.isArray(payload.access?.roles)) {
                roles = payload.access.roles;
                rolesError = null;
              }
            }
          }
        } catch (error) {
          console.warn('Premium entitlement check failed:', error);
        }
        
        if (rolesError && !hasStreamerEntitlement) {
          console.error('Error checking admin status:', rolesError);
          setIsAdmin(false);
          setIsModerator(false);
          setIsSlotModder(false);
          setIsPremium(false);
          setIsAffiliate(false);
          setUserRoles([]);
        } else {
          const roleNames = [...new Set([...roles.map(r => r.role), ...serverRoleNames])];
          
          setUserRoles(roles);
          setIsAdmin(roleNames.includes('admin') || roleNames.includes('superadmin'));
          setIsModerator(roleNames.includes('moderator') || roleNames.includes('admin') || roleNames.includes('superadmin'));
          setIsSlotModder(roleNames.includes('slot_modder') || roleNames.includes('admin') || roleNames.includes('superadmin'));
          setIsPremium(hasStreamerEntitlement || roleNames.includes('premium') || roleNames.includes('admin') || roleNames.includes('superadmin'));
          setIsAffiliate(roleNames.includes('affiliate') || roleNames.includes('admin') || roleNames.includes('superadmin'));
        }
      } catch (error) {
        console.error('Error in useAdmin:', error);
        setIsAdmin(false);
        setIsModerator(false);
        setIsSlotModder(false);
        setIsPremium(false);
        setIsAffiliate(false);
        setUserRoles([]);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, isModerator, isSlotModder, isPremium, isAffiliate, userRoles, loading };
};
