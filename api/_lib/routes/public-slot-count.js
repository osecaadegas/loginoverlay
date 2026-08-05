import { createSupabaseAdmin, setCors } from "../api-auth.js";

export default async function handler(req, res) {
  setCors(res, "GET, OPTIONS");
  res.setHeader(
    "Cache-Control",
    "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  );

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = createSupabaseAdmin();
    const { count, error } = await supabase
      .from("slots")
      .select("id", { count: "exact", head: true });

    if (error) throw error;
    return res.status(200).json({ count: count || 0 });
  } catch (error) {
    console.error("[public-slot-count] Failed to count slots:", error);
    return res.status(500).json({ error: "Failed to count slots" });
  }
}