import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../config/supabaseClient";
import { manageStreamElementsConnection } from '../services/streamElementsConnectionService';

const StreamElementsContext = createContext();

function isMissingRedemptionTable(error) {
  const text =
    `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    error?.code === "PGRST205" ||
    error?.status === 404 ||
    (text.includes("point_redemptions") &&
      (text.includes("could not find") || text.includes("schema cache")))
  );
}

function shouldPollRedemptionNotifications() {
  return (
    typeof window !== "undefined" &&
    window.location.pathname === "/admin-overlay"
  );
}


export function useStreamElements() {
  const context = useContext(StreamElementsContext);
  if (!context) {
    throw new Error(
      "useStreamElements must be used within StreamElementsProvider",
    );
  }
  return context;
}

export function StreamElementsProvider({ children }) {
  const { user } = useAuth();
  const [seAccount, setSeAccount] = useState(null);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [latestRedemption, setLatestRedemption] = useState(null);
  const autoConnecting = false;
  const redemptionPollingDisabled = useRef(false);

  // Load user's StreamElements connection from database
  useEffect(() => {
    if (user) {
      const init = async () => {
        await loadStreamElementsConnection();
      };
      init();
    } else {
      setSeAccount(null);
      setPoints(0);
    }
    const refresh = () => { if (user) loadStreamElementsConnection(); };
    window.addEventListener('streamelements-connection-changed', refresh);
    return () => window.removeEventListener('streamelements-connection-changed', refresh);
  }, [user?.id]);


  const loadStreamElementsConnection = async () => {
    try {
      const { data, error } = await supabase
        .from("streamelements_connections")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data?.verified_at && data.verified_twitch_id === user.identities?.find(i => i.provider === 'twitch')?.identity_data?.sub) {
        setSeAccount(data);
        // Connection consumers only need the verified account. A broadcaster may
        // have no loyalty entry in their own channel. Read balances on explicit
        // refresh, rather than requesting this unused value on every page load.
      } else {
        setSeAccount(null);
        setPoints(0);
      }
    } catch (err) {
      console.error("Error loading SE connection:", err);
    }
  };

  const fetchPoints = async (channelId, jwtToken, username = null) => {
    setLoading(true);
    setError(null);

    try {
      // StreamElements expects a Twitch login, never a Supabase user UUID.
      const userId = String(username || '').trim();
      if (!userId) throw new Error('Reconnect StreamElements to refresh your Twitch username.');

      // Call StreamElements API to get user points
      const response = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${channelId}/${encodeURIComponent(userId)}`,
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) throw new Error(response.status === 404
        ? 'No loyalty record was found for this username. Check Loyalty settings in StreamElements.'
        : `Could not fetch StreamElements points (HTTP ${response.status}).`);

      const data = await response.json();
      setPoints(data.points || 0);
    } catch (err) {
      console.error("Error fetching points:", err);
      setError(err.message);
      setPoints(0);
    } finally {
      setLoading(false);
    }
  };

  const linkAccount = async (channelId, jwtToken, username) => {
    setLoading(true);
    setError(null);

    try {
      const verified = await manageStreamElementsConnection({ se_channel_id: channelId, se_jwt_token: jwtToken });
      await loadStreamElementsConnection();
      if (!verified.success) throw new Error('Connection was not saved.');

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const unlinkAccount = async () => {
    try {
      const { error } = await supabase
        .from("streamelements_connections")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setSeAccount(null);
      setPoints(0);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const redeemPoints = async (redemptionId, pointCost) => {
    if (points < pointCost) {
      return { success: false, error: "Insufficient points" };
    }

    // Validate redemptionId is a valid UUID format
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(redemptionId)) {
      console.error("Invalid redemption ID format:", redemptionId);
      return { success: false, error: "Invalid redemption item" };
    }

    setLoading(true);
    setError(null);

    try {
      // Use SE username for API call
      const userId = seAccount.se_username || user.id;

      // Deduct points via StreamElements API
      const response = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${seAccount.se_channel_id}/${userId}/${-pointCost}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${seAccount.se_jwt_token}`,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) throw new Error("Failed to deduct points");

      // Get the redemption item to check available_units
      const { data: itemData, error: itemError } = await supabase
        .from("redemption_items")
        .select("available_units")
        .eq("id", redemptionId)
        .single();

      if (itemError) throw itemError;

      // Check if item has limited units and if any are available
      if (itemData.available_units !== null) {
        if (itemData.available_units <= 0) {
          throw new Error("This item is out of stock");
        }

        // Decrement available_units
        const { error: updateError } = await supabase
          .from("redemption_items")
          .update({ available_units: itemData.available_units - 1 })
          .eq("id", redemptionId);

        if (updateError) throw updateError;
      }

      // Record redemption in database
      const { error: dbError } = await supabase
        .from("point_redemptions")
        .insert({
          user_id: user.id,
          redemption_id: redemptionId,
          points_spent: pointCost,
          redeemed_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error("Database insert error:", dbError);
        throw dbError;
      }

      // Update local points
      setPoints((prev) => prev - pointCost);

      return { success: true };
    } catch (err) {
      console.error("Redemption error:", err);
      const errorMessage = err.message || "Failed to process redemption";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const refreshPoints = async () => {
    if (seAccount) {
      await fetchPoints(
        seAccount.se_channel_id,
        seAccount.se_jwt_token,
        seAccount.se_username,
      );
    }
  };

  const updateUserPoints = async (amount) => {
    if (!seAccount) {
      return { success: false, error: "StreamElements account not connected" };
    }

    setLoading(true);
    setError(null);

    try {
      const userId = seAccount.se_username || user.id;

      // Update points via StreamElements API
      const response = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${seAccount.se_channel_id}/${userId}/${amount}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${seAccount.se_jwt_token}`,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) throw new Error("Failed to update points");

      // Update local points
      setPoints((prev) => Math.max(0, prev + amount));

      return { success: true };
    } catch (err) {
      console.error("Update points error:", err);
      const errorMessage = err.message || "Failed to update points";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Poll for redemptions from database
  useEffect(() => {
    if (!user || !seAccount || !shouldPollRedemptionNotifications()) return;
    redemptionPollingDisabled.current = false;

    const checkRedemptions = async () => {
      if (redemptionPollingDisabled.current) return;
      try {
        const lastCheck = localStorage.getItem("last_redemption_id");

        // Query redemptions from database, ordered by most recent first
        const { data, error } = await supabase
          .from("point_redemptions")
          .select(
            `
            *,
            redemption_items!inner(name, point_cost, image_url)
          `,
          )
          .order("redeemed_at", { ascending: false })
          .limit(1);

        if (error) {
          if (isMissingRedemptionTable(error)) {
            redemptionPollingDisabled.current = true;
            return;
          }
          console.error("[Redemptions] Error fetching redemptions:", error);
          return;
        }

        // Check for new redemptions
        if (data && data.length > 0) {
          const newest = data[0];

          if (newest.id !== lastCheck) {
            // Get username via RPC (bypasses RLS on streamelements_connections)
            const { data: usernames } = await supabase.rpc(
              "get_usernames_for_ids",
              {
                p_user_ids: [newest.user_id],
              },
            );

            const twitchUsername = usernames?.[0]?.username || "Unknown";

            const itemName = newest.redemption_items?.name || "Unknown Item";
            const cost =
              newest.redemption_items?.point_cost || newest.points_spent || 0;
            const imageUrl = newest.redemption_items?.image_url || null;

            setLatestRedemption({
              username: twitchUsername,
              item: itemName,
              cost: cost,
              imageUrl: imageUrl,
              id: newest.id,
              timestamp: newest.redeemed_at,
            });
            localStorage.setItem("last_redemption_id", newest.id);
          }
        }
      } catch (err) {
        console.error("[Redemptions] Error checking redemptions:", err);
      }
    };

    // Check immediately and then every 60 seconds (reduced from 10s to save egress)
    checkRedemptions();
    const interval = setInterval(checkRedemptions, 60000);

    return () => clearInterval(interval);
  }, [user?.id, seAccount?.id]);

  const value = useMemo(
    () => ({
      seAccount,
      points,
      loading,
      error,
      latestRedemption,
      setLatestRedemption,
      linkAccount,
      unlinkAccount,
      redeemPoints,
      refreshPoints,
      updateUserPoints,
      isConnected: !!seAccount,
      autoConnecting,
    }),
    [
      autoConnecting,
      error,
      latestRedemption,
      linkAccount,
      loading,
      points,
      redeemPoints,
      refreshPoints,
      seAccount,
      unlinkAccount,
      updateUserPoints,
    ],
  );

  return (
    <StreamElementsContext.Provider value={value}>
      {children}
    </StreamElementsContext.Provider>
  );
}
