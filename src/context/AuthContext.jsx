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
        // User logged in - start session tracking
        await initializeSessionTracking(session.user.id);
        
        // Log login action
        const context = await getActionContext();
        const { data: playerData } = await supabase
          .from('the_life_players')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();
          
        if (playerData) {
          await antiCheatLogger.logAction(playerData.id, 'login', {
            metadata: {
              email: session.user.email,
              provider: session.user.app_metadata?.provider || 'email'
            },
            ...context
          });
        }
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
