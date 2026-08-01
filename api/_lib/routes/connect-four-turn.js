import { createClient } from "@supabase/supabase-js";
import {
  announceConnectFourState,
  settleConnectFourOperations,
} from "../connect-four-runtime.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const matchId = String(req.body?.matchId || "");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      matchId,
    )
  ) {
    return res.status(400).json({ error: "Invalid match" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(503).end();
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { data, error } = await supabase.rpc(
      "process_connect_four_turn_deadline",
      { p_match_id: matchId },
    );
    if (error) throw error;
    if (!data?.action) return res.status(204).end();

    await settleConnectFourOperations(supabase, data.operations);
    await announceConnectFourState(supabase, matchId, data.action).catch(
      (chatError) =>
        console.error("[ConnectFour] Chat announcement failed", chatError),
    );
    return res.status(204).end();
  } catch (error) {
    console.error("[ConnectFour] Turn deadline processing failed", error);
    return res.status(500).end();
  }
}