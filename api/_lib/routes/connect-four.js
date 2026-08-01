import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || process.env.VITE_TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const EVENTSUB_SECRET = process.env.CONNECT_FOUR_EVENTSUB_SECRET;

function getCallbackUrl() {
  if (process.env.CONNECT_FOUR_EVENTSUB_CALLBACK_URL) {
    return process.env.CONNECT_FOUR_EVENTSUB_CALLBACK_URL;
  }
  const appUrl = process.env.APP_URL || process.env.VITE_EBS_URL || process.env.PUBLIC_SITE_URL;
  return appUrl ? `${appUrl.replace(/\/$/, "")}/api/connect-four-eventsub` : null;
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
  if (!response.ok) throw new Error(`Twitch app token failed (${response.status})`);
  return (await response.json()).access_token;
}

async function validateProviderToken(providerToken) {
  const response = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${providerToken}` },
  });
  if (!response.ok) return null;
  return response.json();
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    return res.status(503).json({ error: "Connect 4 service is not configured" });
  }
  if (!EVENTSUB_SECRET || EVENTSUB_SECRET.length < 10 || EVENTSUB_SECRET.length > 100) {
    return res.status(503).json({ error: "EventSub secret is not configured" });
  }

  const callback = getCallbackUrl();
  if (!callback?.startsWith("https://")) {
    return res.status(503).json({ error: "EventSub callback URL is not configured" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const accessToken = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const providerToken = String(req.body?.providerToken || "");
  const twitchIdentity = await validateProviderToken(providerToken);
  const scopes = new Set(twitchIdentity?.scopes || []);
  const hasChatScopes = ["user:read:chat", "user:bot", "channel:bot"]
    .every((scope) => scopes.has(scope));
  if (!twitchIdentity?.user_id || twitchIdentity.client_id !== TWITCH_CLIENT_ID || !hasChatScopes) {
    return res.status(400).json({ error: "Twitch chat permission is missing" });
  }

  const identityMatches = user.identities?.some(
    (identity) => identity.provider === "twitch" && String(identity.identity_data?.sub) === twitchIdentity.user_id,
  );
  if (!identityMatches) return res.status(403).json({ error: "Twitch identity mismatch" });

  const { error: profileError } = await supabase
    .from("user_profiles")
    .upsert({
      user_id: user.id,
      twitch_id: twitchIdentity.user_id,
      twitch_username: twitchIdentity.login,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  if (profileError) throw profileError;

  const appToken = await getAppToken();
  const response = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appToken}`,
      "Client-Id": TWITCH_CLIENT_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "channel.chat.message",
      version: "1",
      condition: {
        broadcaster_user_id: twitchIdentity.user_id,
        user_id: twitchIdentity.user_id,
      },
      transport: { method: "webhook", callback, secret: EVENTSUB_SECRET },
    }),
  });

  if (!response.ok && response.status !== 409) {
    const details = await response.text();
    console.error("[ConnectFour] EventSub creation failed", response.status, details);
    return res.status(502).json({ error: "Twitch chat subscription failed" });
  }

  return res.status(200).json({ connected: true });
}