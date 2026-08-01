import { createHmac, timingSafeEqual } from "node:crypto";

const SE_BASE = "https://api.streamelements.com/kappa/v2";
const MAX_EVENT_AGE_MS = 10 * 60 * 1000;

export function parseConnectFourCommand(message) {
  const parts = String(message || "").trim().split(/\s+/);
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

  const requestedColumn = action === "drop" && parts.length === 3
    ? parts[2]
    : parts.length === 2
      ? parts[1]
      : null;
  const column = Number(requestedColumn);
  return Number.isInteger(column) && column >= 1 && column <= 7
    ? { type: "drop", column: column - 1 }
    : null;
}

export function verifyTwitchEventSubSignature({ headers, rawBody, secret, now = Date.now() }) {
  const messageId = String(headers["twitch-eventsub-message-id"] || "");
  const timestamp = String(headers["twitch-eventsub-message-timestamp"] || "");
  const signature = String(headers["twitch-eventsub-message-signature"] || "");
  const sentAt = Date.parse(timestamp);

  if (!messageId || !timestamp || !signature || !Number.isFinite(sentAt)) return false;
  if (Math.abs(now - sentAt) > MAX_EVENT_AGE_MS) return false;

  const expected = `sha256=${createHmac("sha256", secret)
    .update(messageId + timestamp)
    .update(rawBody)
    .digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);
  return expectedBuffer.length === receivedBuffer.length
    && timingSafeEqual(expectedBuffer, receivedBuffer);
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

async function getStreamElementsPoints(channelId, token, twitchLogin) {
  const response = await fetch(
    `${SE_BASE}/points/${channelId}/${encodeURIComponent(twitchLogin)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(`StreamElements balance check failed (${response.status})`);
  const body = await response.json();
  return Number(body?.points) || 0;
}

async function adjustStreamElementsPoints(channelId, token, twitchLogin, delta) {
  const response = await fetch(
    `${SE_BASE}/points/${channelId}/${encodeURIComponent(twitchLogin)}/${delta}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    },
  );
  if (!response.ok) throw new Error(`StreamElements adjustment failed (${response.status})`);
}

export async function settleConnectFourOperations(supabase, operations) {
  const queue = [...(Array.isArray(operations) ? operations : [])];
  const queuedIds = new Set(queue.map((operation) => operation?.id).filter(Boolean));

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
      const credentials = await getStreamElementsCredentials(supabase, claimed.streamerId);
      if (claimed.operationType === "stake") {
        const balance = await getStreamElementsPoints(
          credentials.se_channel_id,
          credentials.se_jwt_token,
          claimed.twitchLogin,
        );
        if (balance < Number(claimed.amount)) throw new Error("Insufficient StreamElements points");
      }

      const delta = claimed.operationType === "stake"
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
      errorMessage = error instanceof Error ? error.message : "Point operation failed";
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