import { createSupabaseAdmin, setCors } from "./_lib/api-auth.js";

const PUBLIC_OVERLAY_ID_PATTERN = /^bo_[a-f0-9]{48}$/i;

export default async function handler(req, res) {
  setCors(res, "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const publicOverlayId = String(req.query.publicOverlayId || "").trim();
  if (!PUBLIC_OVERLAY_ID_PATTERN.test(publicOverlayId)) {
    return res.status(400).json({ error: "Invalid public overlay ID" });
  }

  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(50, Math.max(1, requestedLimit))
    : 20;

  try {
    const supabase = createSupabaseAdmin();
    const { data: publication, error: publicationError } = await supabase
      .from("better_overlay_publications")
      .select("owner_user_id")
      .eq("public_overlay_id", publicOverlayId)
      .is("revoked_at", null)
      .maybeSingle();

    if (publicationError) throw publicationError;
    if (!publication?.owner_user_id) {
      return res.status(404).json({ error: "Overlay not found" });
    }

    const { data, error } = await supabase
      .from("slot_requests")
      .select("id,slot_name,slot_image,requested_by,created_at")
      .eq("user_id", publication.owner_user_id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return res.status(200).json({ requests: data || [] });
  } catch (error) {
    console.error("[public-slot-requests] Failed to load requests:", error);
    return res.status(500).json({ error: "Failed to load slot requests" });
  }
}