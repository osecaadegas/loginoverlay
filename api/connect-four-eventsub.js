import { createClient } from "@supabase/supabase-js";
import {
  parseConnectFourCommand,
  processConnectFourCommand,
  verifyTwitchEventSubSignature,
} from "./_lib/connect-four-runtime.js";

export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.CONNECT_FOUR_EVENTSUB_SECRET;
  if (!secret || secret.length < 10 || secret.length > 100)
    return res.status(503).end();

  const rawBody = await readRawBody(req);
  if (
    !verifyTwitchEventSubSignature({ headers: req.headers, rawBody, secret })
  ) {
    return res.status(403).end();
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).end();
  }

  const messageType = req.headers["twitch-eventsub-message-type"];
  if (messageType === "webhook_callback_verification") {
    const challenge = String(payload.challenge || "");
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Length", Buffer.byteLength(challenge));
    return res.status(200).send(challenge);
  }
  if (messageType === "revocation") {
    console.warn(
      "[ConnectFour] EventSub revoked",
      payload.subscription?.status,
      payload.subscription?.condition,
    );
    return res.status(204).end();
  }
  if (
    messageType !== "notification" ||
    payload.subscription?.type !== "channel.chat.message"
  ) {
    return res.status(204).end();
  }

  const event = payload.event || {};
  const parsedCommand = parseConnectFourCommand(event.message?.text);
  if (!parsedCommand) return res.status(204).end();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(503).end();
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    await processConnectFourCommand(supabase, {
      messageId: event.message_id,
      broadcasterTwitchId: event.broadcaster_user_id,
      chatterTwitchId: event.chatter_user_id,
      chatterLogin: event.chatter_user_login,
      chatterDisplayName: event.chatter_user_name,
      text: event.message?.text,
    });
    return res.status(204).end();
  } catch (error) {
    console.error("[ConnectFour] Event processing failed", error);
    return res.status(500).end();
  }
}
