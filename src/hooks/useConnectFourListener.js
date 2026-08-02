import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../config/supabaseClient";
import useTwitchChat from "./useTwitchChat";
import useTwitchChannel from "./useTwitchChannel";

function getBetterConnectFourConfig(layout) {
  const instances = Array.isArray(layout?.instances) ? layout.instances : [];
  return (
    instances.find((instance) => instance?.widgetType === "connect_four")
      ?.config || null
  );
}

function normalizeConnectFourChatCommand(rawText, trigger) {
  const normalized = String(rawText || "").trim();
  const lowerText = normalized.toLowerCase();
  if (lowerText === "!c4" || lowerText.startsWith("!c4 ")) {
    return normalized;
  }
  if (/^!player2(?:\s+\d+)?$/i.test(normalized)) return "!c4 join";
  if (lowerText.startsWith("!player1 ")) {
    return `!c4 ${normalized.slice(9).trim()}`;
  }
  if (/^!play\s+[1-7]$/i.test(normalized)) {
    return `!c4 ${normalized.split(/\s+/)[1]}`;
  }
  if (lowerText === trigger || lowerText.startsWith(`${trigger} `)) {
    const suffix = normalized.slice(trigger.length);
    return /^\s+start\s+/i.test(suffix)
      ? `!c4 ${suffix.trim().replace(/^start\s+/i, "")}`
      : `!c4${suffix}`;
  }
  return null;
}

export default function useConnectFourListener() {
  const { user } = useAuth();
  const autoChannel = useTwitchChannel();
  const [widgetConfig, setWidgetConfig] = useState(null);
  const broadcasterIdRef = useRef("");
  const configRef = useRef(widgetConfig);
  configRef.current = widgetConfig;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const { data: betterOverlay } = await supabase
        .from("better_editor_overlays")
        .select("draft_layout")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const betterConfig = getBetterConnectFourConfig(
        betterOverlay?.draft_layout,
      );
      if (betterConfig) {
        if (!cancelled) setWidgetConfig(betterConfig);
        return;
      }

      const { data: legacyWidget } = await supabase
        .from("overlay_widgets")
        .select("config")
        .eq("user_id", user.id)
        .eq("widget_type", "connect_four")
        .limit(1)
        .maybeSingle();
      if (!cancelled) setWidgetConfig(legacyWidget?.config || null);
    };

    load();
    const pollTimer = setInterval(load, 10_000);
    const channel = supabase
      .channel(`connect-four-listener-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "better_editor_overlays",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const nextConfig = getBetterConnectFourConfig(
            payload.new?.draft_layout,
          );
          setWidgetConfig(nextConfig);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleRoomState = useCallback(({ channelId }) => {
    broadcasterIdRef.current = channelId;
  }, []);

  const handleMessage = useCallback(
    async (message) => {
      const config = configRef.current;
      if (
        !config ||
        !user ||
        !message.twitchUserId ||
        !broadcasterIdRef.current
      )
        return;
      const trigger = String(config.chatCommand || "!c4")
        .trim()
        .toLowerCase();
      const rawText = String(message.message || "").trim();
      const commandText = trigger
        ? normalizeConnectFourChatCommand(rawText, trigger)
        : null;
      if (!commandText) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      fetch(`${window.location.origin}/api/chat-commands?cmd=connect-four`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          message_id: message.id,
          broadcaster_id: broadcasterIdRef.current,
          chatter_id: message.twitchUserId,
          requester: message.login,
          display_name: message.username,
          command_text: commandText,
        }),
      }).catch((error) => console.error("[ConnectFourListener]", error));
    },
    [user],
  );

  const twitchChannel = String(widgetConfig?.twitchChannel || autoChannel || "")
    .trim()
    .toLowerCase()
    .replace(/^#/, "");
  useTwitchChat(widgetConfig ? twitchChannel : "", handleMessage, {
    onRoomState: handleRoomState,
  });
}
