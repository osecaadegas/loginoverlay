import { createContext, useContext, useEffect, useState } from 'react';
import { replaceEqualDeep } from '@tanstack/react-query';
import { supabase } from '../config/supabaseClient';
import { queryClient } from '../config/queryClient';
import { withTimeout } from '../utils/asyncTimeout';
import { getSessionWithFallback } from '../utils/authSession';


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
    let mounted = true;
    let currentUser = null;
    let sessionRevision = 0;
    let preferenceTimer;

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

    const syncExperiencePreferenceInBackground = (authUser) => {
      if (!authUser) return;
      withTimeout(
        syncExperiencePreference(authUser),
        5000,
        'Experience preference sync'
      ).catch((error) => {
        console.warn('[Auth] Failed to sync selected experience:', error);
      });
    };

    const applySession = (session) => {
      if (!mounted) return;
      const nextUser = session?.user ?? null;
      const accountChanged = currentUser?.id !== nextUser?.id;
      if (accountChanged) queryClient.clear();

      // Supabase re-emits SIGNED_IN on tab focus. Keep the same object when
      // the account data is unchanged so page effects and drafts stay mounted.
      currentUser = replaceEqualDeep(currentUser, nextUser);
      setUser(currentUser);
      setLoading(false);

      if (accountChanged) {
        clearTimeout(preferenceTimer);
        // Auth callbacks run under Supabase's session lock; defer auth writes.
        preferenceTimer = setTimeout(() => {
          if (mounted) syncExperiencePreferenceInBackground(currentUser);
        }, 0);
      }
    };

    const initializeSession = async () => {
      const revision = sessionRevision;
      try {
        const session = await getSessionWithFallback({ timeoutMs: 12000, label: 'Auth session check' });
        if (sessionRevision === revision) applySession(session);
      } catch (error) {
        console.warn('[Auth] Session unavailable:', error);
        if (sessionRevision === revision) applySession(null);
      }
    };

    initializeSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionRevision += 1;
      applySession(session);
    });

    return () => {
      mounted = false;
      clearTimeout(preferenceTimer);
      subscription.unsubscribe();
    };
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
    <AuthContext.Provider key={user?.id || 'anonymous'} value={value}>
      {children}
    </AuthContext.Provider>
  );
};
