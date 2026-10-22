import { createSupabaseAdmin, setCors } from "../api-auth.js";

const PUBLIC_OVERLAY_ID_PATTERN = /^bo_[a-f0-9]{48}$/i;
export const PUBLIC_SLOT_REQUESTS_CACHE_CONTROL = "public, max-age=0, s-maxage=2";

export function createPublicSlotRequestsHandler({
  createClient = createSupabaseAdmin,
  applyCors = setCors,
} = {}) {
  return async function publicSlotRequestsHandler(req, res) {
    applyCors(res, "GET, OPTIONS");
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
      const supabase = createClient();
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

      const actionCutoff = new Date(Date.now() - 20000).toISOString();
      const [requestsResult, actionsResult] = await Promise.all([
        supabase
          .from("slot_requests")
          .select("id,slot_name,slot_image,requested_by,created_at")
          .eq("user_id", publication.owner_user_id)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(limit),
        supabase
          .from("slot_requests")
          .select(
            "id,slot_name,slot_image,requested_by,status,created_at,updated_at",
          )
          .eq("user_id", publication.owner_user_id)
          .in("status", ["played", "refunded", "refund_failed"])
          .gte("updated_at", actionCutoff)
          .order("updated_at", { ascending: true })
          .limit(20),
      ]);

      if (requestsResult.error) throw requestsResult.error;
      if (actionsResult.error) throw actionsResult.error;
      const actions = (actionsResult.data || []).map((row) => ({
        ...row,
        action: row.status === "played" ? "accepted" : "rejected",
        action_at: row.updated_at,
      }));

      // These fields are deliberately public in the OBS request widget. A short
      // CDN TTL lets overlapping OBS/editor reads share work without making the
      // regular five- or ten-second poll return stale queue state.
      // Keep failures, invalid IDs, and revoked URLs explicitly uncached.
      res.setHeader("Cache-Control", PUBLIC_SLOT_REQUESTS_CACHE_CONTROL);
      return res.status(200).json({
        requests: requestsResult.data || [],
        actions,
      });
    } catch (error) {
      console.error("[public-slot-requests] Failed to load requests:", error);
      return res.status(500).json({ error: "Failed to load slot requests" });
    }
  };
}

export default createPublicSlotRequestsHandler();
