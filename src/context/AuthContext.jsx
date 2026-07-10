import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';


const AuthContext = createContext({});
const AUDIENCE_STORAGE_KEY = 'streamerscenter:selectedAudience';
const VALID_EXPERIENCES = new Set(['player', 'streamer']);

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
    const syncExperiencePreference = async (authUser) => {
      if (!authUser) return;
      try {
        const storedExperience = localStorage.getItem(AUDIENCE_STORAGE_KEY);
        const profileExperience = authUser.user_metadata?.selected_experience;

        if (VALID_EXPERIENCES.has(storedExperience) && storedExperience !== profileExperience) {
          await supabase.auth.updateUser({ data: { selected_experience: storedExperience } });
          return;
        }

        if (!storedExperience && VALID_EXPERIENCES.has(profileExperience)) {
          localStorage.setItem(AUDIENCE_STORAGE_KEY, profileExperience);
        }
      } catch (error) {
        console.warn('[Auth] Failed to sync selected experience:', error);
      }
    };

    // Check active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await syncExperiencePreference(session?.user);
      setUser(session?.user ?? null);
      setLoading(false);
      

    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (_event === 'SIGNED_IN' && session?.user) {
        await syncExperiencePreference(session.user);
      }
      setUser(session?.user ?? null);
      
      if (_event === 'SIGNED_IN' && session?.user) {
        // User logged in
      } else if (_event === 'SIGNED_OUT') {
        // User logged out
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  
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

  const getOAuthRedirectTo = (returnTo = '/') => {
    const safeReturnTo = typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : '/';
    return `${window.location.origin}/login?redirectTo=${encodeURIComponent(safeReturnTo)}`;
  };

  const signInWithGoogle = async (returnTo = '/') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthRedirectTo(returnTo)
      }
    });
    return { data, error };
  };

  const signInWithTwitch = async (returnTo = '/') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        redirectTo: getOAuthRedirectTo(returnTo)
      }
    });
    return { data, error };
  };

  const signInWithDiscord = async (returnTo = '/') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: getOAuthRedirectTo(returnTo)
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
    signInWithDiscord,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
