import { createHmac, timingSafeEqual } from "node:crypto";

const SE_BASE = "https://api.streamelements.com/kappa/v2";
const MAX_EVENT_AGE_MS = 10 * 60 * 1000;

export function parseConnectFourCommand(message) {
  const parts = String(message || "")
    .trim()
    .split(/\s+/);
  if (parts[0]?.toLowerCase() !== "!connect4") return null;

  const action = parts[1]?.toLowerCase();
  if (action === "join" && parts.length === 2) return { type: "join" };
  if (action === "reset" && parts.length === 2) return { type: "reset" };

  if (action === "start" && parts.length === 3) {
    const wager = Number(parts[2]);
    return Number.isSafeInteger(wager) && wager > 0 && wager <= 1_000_000_000
      ? { type: "start", wager }
      : null;
  }

  const requestedColumn =
    action === "drop" && parts.length === 3
      ? parts[2]
      : parts.length === 2
        ? parts[1]
        : null;
  const column = Number(requestedColumn);
  return Number.isInteger(column) && column >= 1 && column <= 7
    ? { type: "drop", column: column - 1 }
    : null;
}

export function verifyTwitchEventSubSignature({
  headers,
  rawBody,
  secret,
  now = Date.now(),
}) {
  const messageId = String(headers["twitch-eventsub-message-id"] || "");
  const timestamp = String(headers["twitch-eventsub-message-timestamp"] || "");
  const signature = String(headers["twitch-eventsub-message-signature"] || "");
  const sentAt = Date.parse(timestamp);

  if (!messageId || !timestamp || !signature || !Number.isFinite(sentAt))
    return false;
  if (Math.abs(now - sentAt) > MAX_EVENT_AGE_MS) return false;

  const expected = `sha256=${createHmac("sha256", secret)
    .update(messageId + timestamp)
    .update(rawBody)
    .digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

async function getStreamElementsCredentials(supabase, streamerId) {
  const { data, error } = await supabase
    .from("streamelements_connections")
    .select("se_channel_id, se_jwt_token")
    .eq("user_id", streamerId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.se_channel_id || !data?.se_jwt_token) {
    throw new Error("StreamElements is not connected");
  }
  return data;
}

async function sendStreamElementsChatMessage(credentials, message) {
  const response = await fetch(
    `${SE_BASE}/bot/${credentials.se_channel_id}/say`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.se_jwt_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    },
  );
  if (!response.ok)
    throw new Error(`StreamElements chat message failed (${response.status})`);
}

const announcementBuilders = {
  start(state) {
    if (state.status !== "waiting") return null;
    return `${state.player_one_display_name} started Connect 4 for ${Number(state.wager).toLocaleString("en-US")} points. Join with !connect4 join`;
  },
  join(state) {
    if (state.status !== "active") return null;
    return `${state.player_two_display_name} joined ${state.player_one_display_name}. ${state.player_one_display_name} starts: play with !connect4 1 through !connect4 7`;
  },
  drop(state) {
    if (state.status === "active") {
      const nextPlayer =
        state.current_player === 1
          ? state.player_one_display_name
          : state.player_two_display_name;
      return `${nextPlayer}'s turn. Play with !connect4 1 through !connect4 7`;
    }
    if (state.completion_reason === "draw")
      return "Connect 4 ended in a draw. Both wagers were refunded.";
    if (state.completion_reason !== "win") return null;
    const winner =
      state.winner === 1
        ? state.player_one_display_name
        : state.player_two_display_name;
    return `${winner} wins Connect 4 and receives ${(Number(state.wager) * 2).toLocaleString("en-US")} points!`;
  },
  reset(state) {
    return state.completion_reason === "reset"
      ? "Connect 4 was cancelled. Applied wagers were refunded."
      : null;
  },
  reminder(state) {
    if (state.status !== "active") return null;
    const currentPlayer =
      state.current_player === 1
        ? state.player_one_display_name
        : state.player_two_display_name;
    return `${currentPlayer}, 10 seconds left! Play with !connect4 1 through !connect4 7`;
  },
  timeout(state) {
    if (state.completion_reason !== "timeout") return null;
    const winner =
      state.winner === 1
        ? state.player_one_display_name
        : state.player_two_display_name;
    return `Time expired. ${winner} wins Connect 4 and receives ${(Number(state.wager) * 2).toLocaleString("en-US")} points!`;
  },
};

export function buildConnectFourAnnouncement(state, eventType) {
  return state ? announcementBuilders[eventType]?.(state) || null : null;
}

export async function announceConnectFourState(supabase, matchId, eventType) {
  if (!matchId) return;

  const { data: state, error } = await supabase
    .from("connect_four_matches")
    .select(
      "streamer_id,status,wager,player_one_display_name,player_two_display_name,current_player,winner,completion_reason",
    )
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw error;

  const message = buildConnectFourAnnouncement(state, eventType);
  if (!message) return;
  const credentials = await getStreamElementsCredentials(
    supabase,
    state.streamer_id,
  );
  await sendStreamElementsChatMessage(credentials, message);
}

async function getStreamElementsPoints(channelId, token, twitchLogin) {
  const response = await fetch(
    `${SE_BASE}/points/${channelId}/${encodeURIComponent(twitchLogin)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok)
    throw new Error(`StreamElements balance check failed (${response.status})`);
  const body = await response.json();
  return Number(body?.points) || 0;
}

async function adjustStreamElementsPoints(
  channelId,
  token,
  twitchLogin,
  delta,
) {
  const response = await fetch(
    `${SE_BASE}/points/${channelId}/${encodeURIComponent(twitchLogin)}/${delta}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!response.ok)
    throw new Error(`StreamElements adjustment failed (${response.status})`);
}

export async function settleConnectFourOperations(supabase, operations) {
  const queue = [...(Array.isArray(operations) ? operations : [])];
  const queuedIds = new Set(
    queue.map((operation) => operation?.id).filter(Boolean),
  );

  while (queue.length > 0) {
    const pending = queue.shift();
    if (!pending?.id) continue;

    const { data: claimed, error: claimError } = await supabase.rpc(
      "claim_connect_four_point_operation",
      { p_operation_id: pending.id },
    );
    if (claimError) throw claimError;
    if (!claimed?.id) continue;

    let succeeded = false;
    let errorMessage = null;
    try {
      const credentials = await getStreamElementsCredentials(
        supabase,
        claimed.streamerId,
      );
      if (claimed.operationType === "stake") {
        const balance = await getStreamElementsPoints(
          credentials.se_channel_id,
          credentials.se_jwt_token,
          claimed.twitchLogin,
        );
        if (balance < Number(claimed.amount))
          throw new Error("Insufficient StreamElements points");
      }

      const delta =
        claimed.operationType === "stake"
          ? -Number(claimed.amount)
          : Number(claimed.amount);
      await adjustStreamElementsPoints(
        credentials.se_channel_id,
        credentials.se_jwt_token,
        claimed.twitchLogin,
        delta,
      );
      succeeded = true;
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "Point operation failed";
    }

    const { data: completion, error: completionError } = await supabase.rpc(
      "complete_connect_four_point_operation",
      {
        p_operation_id: claimed.id,
        p_succeeded: succeeded,
        p_error_message: errorMessage,
      },
    );
    if (completionError) throw completionError;

    for (const nextOperation of completion?.operations || []) {
      if (nextOperation?.id && !queuedIds.has(nextOperation.id)) {
        queue.push(nextOperation);
        queuedIds.add(nextOperation.id);
      }
    }
  }
}
