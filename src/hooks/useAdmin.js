import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserRoles } from '../utils/adminUtils';

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
          
          setUserRoles(roles);
          setIsAdmin(roleNames.includes('admin') || roleNames.includes('superadmin'));
          setIsModerator(roleNames.includes('moderator') || roleNames.includes('admin') || roleNames.includes('superadmin'));
          setIsSlotModder(roleNames.includes('slot_modder') || roleNames.includes('admin') || roleNames.includes('superadmin'));
          setIsPremium(roleNames.includes('premium') || roleNames.includes('admin') || roleNames.includes('superadmin'));
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
