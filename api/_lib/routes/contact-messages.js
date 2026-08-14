import crypto from "crypto";
import {
  createSupabaseAdmin,
  parseBody,
  requireUser,
  setCors,
} from "../api-auth.js";

const CONTACT_STATUSES = new Set(["new", "read", "resolved", "archived"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RATE_WINDOW_MS = 60_000;
const recentSubmissions = new Map();

function cleanText(value, maxLength) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

function clientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  const address = forwarded || req.socket?.remoteAddress || "unknown";
  return crypto.createHash("sha256").update(address).digest("hex");
}

function enforceRateLimit(req) {
  const key = clientKey(req);
  const now = Date.now();
  const previous = recentSubmissions.get(key) || 0;
  if (now - previous < RATE_WINDOW_MS) {
    const err = new Error(
      "Please wait a minute before sending another message.",
    );
    err.statusCode = 429;
    throw err;
  }
  recentSubmissions.set(key, now);
  for (const [entryKey, timestamp] of recentSubmissions) {
    if (now - timestamp > RATE_WINDOW_MS) recentSubmissions.delete(entryKey);
  }
}

async function requireAdmin(req, supabase) {
  const user = await requireUser(req, supabase);
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "superadmin"])
    .eq("is_active", true)
    .limit(1);
  if (error) throw error;
  if (!data?.length) {
    const err = new Error("Admin access required");
    err.statusCode = 403;
    throw err;
  }
  return user;
}

async function submitMessage(req, res, supabase) {
  const body = parseBody(req);
  if (cleanText(body.website, 200)) {
    return res.status(201).json({ message: "Message received." });
  }

  const name = cleanText(body.name, 100);
  const email = cleanText(body.email, 254).toLowerCase();
  const subject = cleanText(body.subject, 160);
  const message = cleanText(body.message, 5000);

  if (name.length < 2)
    throw Object.assign(new Error("Please enter your name."), {
      statusCode: 400,
    });
  if (!EMAIL_PATTERN.test(email))
    throw Object.assign(new Error("Please enter a valid email address."), {
      statusCode: 400,
    });
  if (subject.length < 3)
    throw Object.assign(new Error("Please enter a subject."), {
      statusCode: 400,
    });
  if (message.length < 10)
    throw Object.assign(
      new Error("Your message must contain at least 10 characters."),
      { statusCode: 400 },
    );

  enforceRateLimit(req);
  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    subject,
    message,
  });
  if (error) throw error;
  return res
    .status(201)
    .json({ message: "Thanks. Your message has been sent to the admin team." });
}

async function listMessages(req, res, supabase) {
  await requireAdmin(req, supabase);
  const status = cleanText(req.query.status, 20);
  let query = supabase
    .from("contact_messages")
    .select(
      "id, name, email, subject, message, status, read_at, resolved_at, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (CONTACT_STATUSES.has(status)) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return res.status(200).json({ messages: data || [] });
}

async function updateMessage(req, res, supabase) {
  await requireAdmin(req, supabase);
  const body = parseBody(req);
  const id = cleanText(body.id, 36);
  const status = cleanText(body.status, 20);
  if (!UUID_PATTERN.test(id) || !CONTACT_STATUSES.has(status)) {
    return res
      .status(400)
      .json({ error: "A valid message and status are required." });
  }

  const now = new Date().toISOString();
  const changes = {
    status,
    read_at: status === "new" ? null : now,
    resolved_at: status === "resolved" ? now : null,
  };
  const { data, error } = await supabase
    .from("contact_messages")
    .update(changes)
    .eq("id", id)
    .select("id, status, read_at, resolved_at, updated_at")
    .single();
  if (error) throw error;
  return res.status(200).json({ message: data });
}

export default async function handler(req, res) {
  setCors(res, "GET, POST, PATCH, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const supabase = createSupabaseAdmin();
    if (req.method === "POST") return await submitMessage(req, res, supabase);
    if (req.method === "GET") return await listMessages(req, res, supabase);
    if (req.method === "PATCH") return await updateMessage(req, res, supabase);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[contact-messages]", err);
    return res.status(err.statusCode || 500).json({
      error: err.message || "Contact message request failed",
    });
  }
}
