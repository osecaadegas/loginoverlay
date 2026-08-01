import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../config/supabaseClient";
import useTwitchChat from "./useTwitchChat";
import useTwitchChannel from "./useTwitchChannel";

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
      const { data } = await supabase
        .from("overlay_widgets")
        .select("config")
        .eq("user_id", user.id)
        .eq("widget_type", "connect_four")
        .limit(1)
        .maybeSingle();
      if (!cancelled) setWidgetConfig(data?.config || null);
    };

    load();
    const pollTimer = setInterval(load, 10_000);
    const channel = supabase
      .channel(`connect-four-listener-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "overlay_widgets",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const row = payload.new;
        if (row?.widget_type === "connect_four") setWidgetConfig(row.config || null);
      })
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

  const handleMessage = useCallback(async (message) => {
    const config = configRef.current;
    if (!config || !user || !message.twitchUserId || !broadcasterIdRef.current) return;
    const trigger = String(config.chatCommand || "!connect4").trim().toLowerCase();
    const rawText = String(message.message || "").trim();
    const lowerText = rawText.toLowerCase();
    if (!trigger || (lowerText !== trigger && !lowerText.startsWith(`${trigger} `))) return;

    const commandText = `!connect4${rawText.slice(trigger.length)}`;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;

    fetch(`${window.location.origin}/api/chat-commands?cmd=connect-four`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
  }, [user]);

  const twitchChannel = String(widgetConfig?.twitchChannel || autoChannel || "")
    .trim()
    .toLowerCase()
    .replace(/^#/, "");
  useTwitchChat(widgetConfig ? twitchChannel : "", handleMessage, { onRoomState: handleRoomState });
}