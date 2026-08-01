import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TWITCH_CLIENT_ID =
  process.env.TWITCH_CLIENT_ID || process.env.VITE_TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const EVENTSUB_SECRET = process.env.CONNECT_FOUR_EVENTSUB_SECRET;

function getCallbackUrl() {
  if (process.env.CONNECT_FOUR_EVENTSUB_CALLBACK_URL) {
    return process.env.CONNECT_FOUR_EVENTSUB_CALLBACK_URL;
  }
  const appUrl =
    process.env.APP_URL ||
    process.env.VITE_EBS_URL ||
    process.env.PUBLIC_SITE_URL;
  return appUrl
    ? `${appUrl.replace(/\/$/, "")}/api/connect-four-eventsub`
    : null;
}

async function getAppToken() {
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!response.ok)
    throw new Error(`Twitch app token failed (${response.status})`);
  return (await response.json()).access_token;
}

async function validateProviderToken(providerToken) {
  const response = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${providerToken}` },
  });
  if (!response.ok) return null;
  return response.json();
}

async function twitchEventSubRequest(appToken, path, options = {}) {
  return fetch(`https://api.twitch.tv/helix/eventsub/subscriptions${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${appToken}`,
      "Client-Id": TWITCH_CLIENT_ID,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

async function findChatSubscription(appToken, twitchUserId, callback) {
  const listResponse = await twitchEventSubRequest(
    appToken,
    "?type=channel.chat.message",
  );
  if (!listResponse.ok)
    throw new Error(
      `Twitch subscription lookup failed (${listResponse.status})`,
    );

  const subscriptions = (await listResponse.json()).data || [];
  const relevant = subscriptions.filter(
    (subscription) =>
      subscription.condition?.broadcaster_user_id === twitchUserId &&
      subscription.condition?.user_id === twitchUserId &&
      subscription.transport?.method === "webhook",
  );
  return {
    relevant,
    enabled: relevant.find(
      (subscription) =>
        subscription.status === "enabled" &&
        subscription.transport?.callback === callback,
    ),
  };
}

async function reconcileChatSubscription(appToken, twitchUserId, callback) {
  const { relevant, enabled } = await findChatSubscription(
    appToken,
    twitchUserId,
    callback,
  );
  if (enabled) return enabled;

  for (const subscription of relevant) {
    const deleteResponse = await twitchEventSubRequest(
      appToken,
      `?id=${encodeURIComponent(subscription.id)}`,
      { method: "DELETE" },
    );
    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      throw new Error(
        `Twitch stale subscription cleanup failed (${deleteResponse.status})`,
      );
    }
  }

  const createResponse = await twitchEventSubRequest(appToken, "", {
    method: "POST",
    body: JSON.stringify({
      type: "channel.chat.message",
      version: "1",
      condition: {
        broadcaster_user_id: twitchUserId,
        user_id: twitchUserId,
      },
      transport: { method: "webhook", callback, secret: EVENTSUB_SECRET },
    }),
  });
  if (!createResponse.ok) {
    const details = await createResponse.text();
    console.error(
      "[ConnectFour] EventSub creation failed",
      createResponse.status,
      details,
    );
    throw new Error(
      `Twitch chat subscription failed (${createResponse.status})`,
    );
  }
  return (await createResponse.json()).data?.[0] || null;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_KEY ||
    !TWITCH_CLIENT_ID ||
    !TWITCH_CLIENT_SECRET
  ) {
    return res
      .status(503)
      .json({ error: "Connect 4 service is not configured" });
  }
  if (
    !EVENTSUB_SECRET ||
    EVENTSUB_SECRET.length < 10 ||
    EVENTSUB_SECRET.length > 100
  ) {
    return res.status(503).json({ error: "EventSub secret is not configured" });
  }

  const callback = getCallbackUrl();
  if (!callback?.startsWith("https://")) {
    return res
      .status(503)
      .json({ error: "EventSub callback URL is not configured" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const accessToken = String(req.headers.authorization || "").replace(
    /^Bearer\s+/i,
    "",
  );
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);
  if (authError || !user)
    return res.status(401).json({ error: "Unauthorized" });

  const twitchIdentity = user.identities?.find(
    (identity) => identity.provider === "twitch",
  );
  const twitchUserId = String(twitchIdentity?.identity_data?.sub || "");
  if (!twitchUserId) {
    return res.status(409).json({
      connected: false,
      status: "twitch_login_required",
      error: "Connect Twitch to enable the chat listener",
    });
  }

  if (req.method === "GET") {
    try {
      const appToken = await getAppToken();
      const { enabled } = await findChatSubscription(
        appToken,
        twitchUserId,
        callback,
      );
      return res.status(200).json({
        connected: Boolean(enabled),
        status: enabled?.status || "authorization_required",
      });
    } catch (error) {
      console.error("[ConnectFour] EventSub status failed", error);
      return res.status(502).json({ error: "Twitch listener status failed" });
    }
  }

  const providerToken = String(req.body?.providerToken || "");
  const validatedTwitchIdentity = await validateProviderToken(providerToken);
  const scopes = new Set(validatedTwitchIdentity?.scopes || []);
  const hasChatScopes = ["user:read:chat", "user:bot", "channel:bot"].every(
    (scope) => scopes.has(scope),
  );
  if (
    !validatedTwitchIdentity?.user_id ||
    validatedTwitchIdentity.client_id !== TWITCH_CLIENT_ID ||
    !hasChatScopes
  ) {
    return res.status(400).json({ error: "Twitch chat permission is missing" });
  }

  if (twitchUserId !== validatedTwitchIdentity.user_id)
    return res.status(403).json({ error: "Twitch identity mismatch" });

  const { error: profileError } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      twitch_id: validatedTwitchIdentity.user_id,
      twitch_username: validatedTwitchIdentity.login,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (profileError) throw profileError;

  try {
    const appToken = await getAppToken();
    const subscription = await reconcileChatSubscription(
      appToken,
      validatedTwitchIdentity.user_id,
      callback,
    );
    console.info(
      "[ConnectFour] EventSub subscription",
      validatedTwitchIdentity.user_id,
      subscription?.status,
    );
    return res.status(200).json({
      connected: subscription?.status === "enabled",
      status: subscription?.status || "unknown",
    });
  } catch (error) {
    console.error("[ConnectFour] EventSub reconciliation failed", error);
    return res.status(502).json({ error: "Twitch chat subscription failed" });
  }
}
