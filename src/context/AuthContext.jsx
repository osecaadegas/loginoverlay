import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { initSessionTracker, endSession } from '../utils/sessionTracker';
import { antiCheatLogger } from '../services/antiCheatLogger';
import { getActionContext } from '../utils/deviceFingerprint';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Initialize session tracking if logged in
      if (session?.user) {
        initializeSessionTracking(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      
      if (_event === 'SIGNED_IN' && session?.user) {
        // User logged in - start session tracking (non-blocking)
        initializeSessionTracking(session.user.id).catch(err => {
          console.warn('Session tracking failed (non-critical):', err);
        });
        
        // Log login action (non-blocking - don't await)
        logLoginAction(session.user).catch(err => {
          console.warn('Anti-cheat login logging failed (non-critical):', err);
        });
      } else if (_event === 'SIGNED_OUT') {
        // User logged out - end session
        endSession();
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // Initialize session tracking for a user
  const initializeSessionTracking = async (userId) => {
    try {
      // Get player ID
      const { data: playerData } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (playerData) {
        initSessionTracker(userId, playerData.id);
      }
    } catch (error) {
      console.error('Failed to initialize session tracking:', error);
    }
  };
  
  // Log login action (non-blocking)
  const logLoginAction = async (user) => {
    try {
      const context = await getActionContext();
      const { data: playerData } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (playerData) {
        await antiCheatLogger.logAction(playerData.id, 'login', {
          metadata: {
            email: user.email,
            provider: user.app_metadata?.provider || 'email'
          },
          ...context
        });
      }
    } catch (error) {
      // Silently fail - don't block login
      console.warn('Anti-cheat login logging failed:', error);
    }
  };

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    return { data, error };
  };

  const signInWithTwitch = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    return { data, error };
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    signInWithTwitch,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
