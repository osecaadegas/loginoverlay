import {
  createSupabaseAdmin,
  parseBody,
  requireUser,
  setCors,
} from "../api-auth.js";
import { loadPremiumContent, resolvePremiumAccess } from "../premium-data.js";

const CARDLESS_TRIAL_DAYS = 7;

function trialEligibility(access) {
  return (
    !access.trial &&
    access.subscriptions.length === 0 &&
    !access.paidProductType
  );
}

async function handleStartTrial(req, res, supabase, body) {
  const user = await requireUser(req, supabase);
  const productType = body.productType === "player" ? "player" : "streamer";
  const access = await resolvePremiumAccess(supabase, user.id);

  if (!trialEligibility(access)) {
    const err = new Error(
      access.trial
        ? "This account has already used its free trial."
        : "Existing subscribers are not eligible for a free trial.",
    );
    err.statusCode = 409;
    err.code = access.trial ? "trial_already_used" : "existing_subscriber";
    err.trial = access.trial;
    throw err;
  }

  const startedAt = new Date();
  const expiresAt = new Date(
    startedAt.getTime() + CARDLESS_TRIAL_DAYS * 24 * 60 * 60 * 1000,
  );
  const { data: trial, error } = await supabase
    .from("user_trials")
    .insert({
      user_id: user.id,
      selected_product_type: productType,
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: "active",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const conflict = new Error(
        "This account has already used its free trial.",
      );
      conflict.statusCode = 409;
      conflict.code = "trial_already_used";
      throw conflict;
    }
    throw error;
  }

  const updatedAccess = await resolvePremiumAccess(supabase, user.id);
  return res.status(201).json({ trial, access: updatedAccess });
}

async function optionalUser(req, supabase) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function handlePage(req, res, supabase) {
  const user = await optionalUser(req, supabase);
  const content = await loadPremiumContent(supabase);
  const access = user ? await resolvePremiumAccess(supabase, user.id) : null;
  return res.status(200).json({
    ...content,
    access,
    authenticated: !!user,
    trialDays: CARDLESS_TRIAL_DAYS,
    trialRequiresPaymentMethod: false,
    trialEligible: access ? trialEligibility(access) : null,
  });
}

async function handleStatus(req, res, supabase) {
  const user = await requireUser(req, supabase);
  const access = await resolvePremiumAccess(supabase, user.id);
  return res.status(200).json({ access });
}

function errorResponse(res, err) {
  return res.status(err.statusCode || 500).json({
    error: err.message || "Premium request failed",
    code: err.code || null,
    trial: err.trial || null,
  });
}

export default async function handler(req, res) {
  setCors(res, "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const supabase = createSupabaseAdmin();
    const body = req.method === "POST" ? parseBody(req) : {};
    const action =
      req.query.action || body.action || (req.method === "GET" ? "page" : "");

    if (req.method === "GET" && action === "page")
      return handlePage(req, res, supabase);
    if (req.method === "GET" && action === "status")
      return handleStatus(req, res, supabase);
    if (req.method === "POST" && action === "start_trial")
      return handleStartTrial(req, res, supabase, body);
    return res.status(404).json({ error: "Unknown premium action" });
  } catch (err) {
    console.error("[premium]", err);
    return errorResponse(res, err);
  }
}
