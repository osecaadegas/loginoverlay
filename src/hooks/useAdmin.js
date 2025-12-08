import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserRole } from '../utils/adminUtils';

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isSlotModder, setIsSlotModder] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsModerator(false);
        setIsSlotModder(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await getUserRole(user.id);
        
        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          setIsModerator(false);
          setIsSlotModder(false);
        } else {
          const role = data?.role;
          setIsAdmin(role === 'admin');
          setIsModerator(role === 'moderator' || role === 'admin');
          setIsSlotModder(role === 'slot_modder' || role === 'admin');
        }
      } catch (error) {
        console.error('Error in useAdmin:', error);
        setIsAdmin(false);
        setIsModerator(false);
        setIsSlotModder(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, isModerator, isSlotModder, loading };
};
