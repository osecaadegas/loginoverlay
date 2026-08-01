import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../config/supabaseClient";
import { withTimeout } from "../utils/asyncTimeout";
import { getSessionWithFallback } from "../utils/authSession";

const AuthContext = createContext({});
const AUDIENCE_STORAGE_KEY = "streamerscenter:selectedAudience";
const VALID_EXPERIENCES = new Set(["player", "streamer"]);

async function requestTwitchChatListener(session, method = "GET") {
  if (!session?.access_token) return { status: "signed_out" };
  const isConnectRequest = method === "POST";
  const response = await fetch("/api/connect-four", {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    ...(isConnectRequest
      ? { body: JSON.stringify({ providerToken: session.provider_token }) }
      : {}),
  });
  const details = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      details?.error || `Twitch chat connection failed (${response.status})`,
    );
  }
  return details;
}

async function connectTwitchChat(session) {
  const status = await requestTwitchChatListener(session);
  if (status?.connected || !session?.provider_token) return status;
  return requestTwitchChatListener(session, "POST");
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [twitchListener, setTwitchListener] = useState({
    loading: true,
    connected: false,
    status: "checking",
    error: "",
  });

  useEffect(() => {
    const syncExperiencePreference = async (authUser) => {
      if (!authUser) return;
      try {
        const storedExperience = localStorage.getItem(AUDIENCE_STORAGE_KEY);
        const profileExperience = authUser.user_metadata?.selected_experience;

        if (
          VALID_EXPERIENCES.has(storedExperience) &&
          storedExperience !== profileExperience
        ) {
          await supabase.auth.updateUser({
            data: { selected_experience: storedExperience },
          });
          return;
        }

        if (!storedExperience && VALID_EXPERIENCES.has(profileExperience)) {
          localStorage.setItem(AUDIENCE_STORAGE_KEY, profileExperience);
        }
      } catch (error) {
        console.warn("[Auth] Failed to sync selected experience:", error);
      }
    };

    const syncExperiencePreferenceInBackground = (authUser) => {
      if (!authUser) return;
      withTimeout(
        syncExperiencePreference(authUser),
        5000,
        "Experience preference sync",
      ).catch((error) => {
        console.warn("[Auth] Failed to sync selected experience:", error);
      });
    };

    let mounted = true;

    const initializeSession = async () => {
      try {
        const session = await getSessionWithFallback({
          timeoutMs: 12000,
          label: "Auth session check",
        });
        syncExperiencePreferenceInBackground(session?.user);
        connectTwitchChat(session)
          .then((result) =>
            setTwitchListener({
              loading: false,
              connected: result?.connected === true,
              status: result?.status || "authorization_required",
              error: "",
            }),
          )
          .catch((error) => {
            console.warn("[Auth] Twitch chat connection failed:", error);
            setTwitchListener({
              loading: false,
              connected: false,
              status: "authorization_required",
              error: error.message,
            });
          });
        if (mounted) setUser(session?.user ?? null);
      } catch (error) {
        console.warn("[Auth] Session unavailable:", error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (_event === "SIGNED_IN" && session?.user) {
        syncExperiencePreferenceInBackground(session.user);
        connectTwitchChat(session)
          .then((result) =>
            setTwitchListener({
              loading: false,
              connected: result?.connected === true,
              status: result?.status || "authorization_required",
              error: "",
            }),
          )
          .catch((error) => {
            console.warn("[Auth] Twitch chat connection failed:", error);
            setTwitchListener({
              loading: false,
              connected: false,
              status: "authorization_required",
              error: error.message,
            });
          });
      }
      setUser(session?.user ?? null);

      if (_event === "SIGNED_IN" && session?.user) {
        // User logged in
      } else if (_event === "SIGNED_OUT") {
        // User logged out
      }
    });

    return () => {
      mounted = false;
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

  const getOAuthRedirectTo = (returnTo = "/") => {
    const safeReturnTo =
      typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : "/";
    return `${window.location.origin}/login?redirectTo=${encodeURIComponent(safeReturnTo)}`;
  };

  const signInWithGoogle = async (returnTo = "/") => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthRedirectTo(returnTo),
      },
    });
    return { data, error };
  };

  const signInWithTwitch = async (returnTo = "/") => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "twitch",
      options: {
        redirectTo: getOAuthRedirectTo(returnTo),
        scopes: "user:read:chat user:bot channel:bot",
        queryParams: { force_verify: "true" },
      },
    });
    return { data, error };
  };

  const signInWithDiscord = async (returnTo = "/") => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: getOAuthRedirectTo(returnTo),
      },
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
    twitchListener,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
