import { createSupabaseAdmin, setCors } from "./_lib/api-auth.js";

const PUBLIC_OVERLAY_ID_PATTERN = /^bo_[a-f0-9]{48}$/i;

async function refreshSpotifyToken(refreshToken) {
  const clientId =
    process.env.VITE_SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID;
  if (!clientId || !refreshToken) return null;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!response.ok) return null;

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
  };
}

async function fetchSpotifyNowPlaying(accessToken) {
  if (!accessToken) return { status: 204, nowPlaying: null };
  const response = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (response.status === 204) return { status: 204, nowPlaying: null };
  if (!response.ok) return { status: response.status, nowPlaying: null };

  const data = await response.json();
  if (!data.item) return { status: 200, nowPlaying: null };
  return {
    status: 200,
    nowPlaying: {
      artist:
        data.item.artists?.map((artist) => artist.name).join(", ") || "Unknown",
      track: data.item.name || "Unknown",
      isPlaying: data.is_playing,
      albumArt: data.item.album?.images?.[0]?.url || "",
      progressMs: data.progress_ms || 0,
      durationMs: data.item.duration_ms || 0,
    },
  };
}

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

    const { data: tokenRow, error: tokenError } = await supabase
      .from("spotify_tokens")
      .select("access_token,refresh_token,expires_at")
      .eq("user_id", publication.owner_user_id)
      .maybeSingle();

    if (tokenError) throw tokenError;
    if (!tokenRow?.refresh_token) {
      return res.status(200).json({ nowPlaying: null });
    }

    let accessToken = tokenRow.access_token;
    const tokenExpired =
      !accessToken ||
      !tokenRow.expires_at ||
      Date.now() >= Number(tokenRow.expires_at) - 60000;
    let refreshed = tokenExpired
      ? await refreshSpotifyToken(tokenRow.refresh_token)
      : null;

    if (refreshed) accessToken = refreshed.accessToken;
    let result = await fetchSpotifyNowPlaying(accessToken);

    if (result.status === 401 && !refreshed) {
      refreshed = await refreshSpotifyToken(tokenRow.refresh_token);
      if (refreshed) {
        accessToken = refreshed.accessToken;
        result = await fetchSpotifyNowPlaying(accessToken);
      }
    }

    if (refreshed) {
      const { error: updateError } = await supabase
        .from("spotify_tokens")
        .update({
          access_token: refreshed.accessToken,
          refresh_token: refreshed.refreshToken,
          expires_at: refreshed.expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", publication.owner_user_id);
      if (updateError) throw updateError;
    }

    return res.status(200).json({ nowPlaying: result.nowPlaying });
  } catch (error) {
    console.error(
      "[public-spotify-now-playing] Failed to load Spotify data:",
      error,
    );
    return res.status(500).json({ error: "Failed to load Spotify data" });
  }
}
