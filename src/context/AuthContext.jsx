import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';

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
      if (session?.user) {
        autoConnectStreamElements(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user && _event === 'SIGNED_IN') {
        await autoConnectStreamElements(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-connect StreamElements for Twitch users
  const autoConnectStreamElements = async (user) => {
    if (!user) return;

    try {
      // Get user's Twitch username from their identity data
      const { data: identities } = await supabase.auth.admin.getUserById(user.id);
      const twitchIdentity = user.identities?.find(id => id.provider === 'twitch');
      
      const twitchUsername = twitchIdentity?.identity_data?.preferred_username || 
                            twitchIdentity?.identity_data?.name ||
                            user.user_metadata?.preferred_username ||
                            user.user_metadata?.name;

      if (!twitchUsername) {
        console.log('No Twitch username found for user');
        return;
      }

      // Check if SE connection already exists
      const { data: existingConnection } = await supabase
        .from('streamelements_connections')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingConnection) {
        console.log('StreamElements already connected');
        return;
      }

      // Get SE credentials from environment
      const SE_CHANNEL_ID = import.meta.env.VITE_SE_CHANNEL_ID;
      const SE_JWT_TOKEN = import.meta.env.VITE_SE_JWT_TOKEN;

      if (!SE_CHANNEL_ID || !SE_JWT_TOKEN) {
        console.log('SE credentials not configured');
        return;
      }

      // Create SE connection automatically
      const { error: insertError } = await supabase
        .from('streamelements_connections')
        .insert({
          user_id: user.id,
          se_username: twitchUsername,
          se_channel_id: SE_CHANNEL_ID,
          se_jwt_token: SE_JWT_TOKEN,
          connected_at: new Date().toISOString()
        });

      if (!insertError) {
        console.log('Auto-connected StreamElements for:', twitchUsername);
      }
    } catch (error) {
      console.error('Error auto-connecting StreamElements:', error);
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
