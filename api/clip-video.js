/**
 * /api/clip-video.js — Vercel Edge Function
 *
 * Proxies Twitch clip MP4 video through our domain so the browser's
 * <video autoplay muted> works without CORS issues or Twitch's
 * content-warning gate.
 *
 * Usage: /api/clip-video?thumbnail=<twitch_thumbnail_url>
 *    or: /api/clip-video?url=<direct_mp4_url>
 *
 * The Edge runtime supports streaming responses with no body-size limit.
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);

  // Accept either a pre-known MP4 URL or a thumbnail to derive from
  let mp4Url = searchParams.get('url');
  const thumbnail = searchParams.get('thumbnail');

  if (!mp4Url && thumbnail) {
    // Derive .mp4 from Twitch thumbnail:
    // https://clips-media-assets2.twitch.tv/xxx-preview-480x272.jpg → xxx.mp4
    mp4Url = thumbnail.replace(/-preview-\d+x\d+\.jpg$/i, '.mp4');
  }

  if (!mp4Url) {
    return new Response(JSON.stringify({ error: 'Missing url or thumbnail param' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only allow Twitch CDN URLs (security)
  try {
    const parsed = new URL(mp4Url);
    const allowed = ['clips-media-assets2.twitch.tv', 'clips-media-assets.twitch.tv', 'production.assets.clips.twitchcdn.net'];
    if (!allowed.some(h => parsed.hostname.endsWith(h))) {
      return new Response(JSON.stringify({ error: 'URL not from Twitch CDN' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Fetch the video from Twitch CDN (server-side — no CORS restrictions)
    const videoRes = await fetch(mp4Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://clips.twitch.tv/',
      },
    });

    if (!videoRes.ok) {
      return new Response(JSON.stringify({ error: `Twitch CDN returned ${videoRes.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream the video back to the client
    return new Response(videoRes.body, {
      status: 200,
      headers: {
        'Content-Type': videoRes.headers.get('Content-Type') || 'video/mp4',
        'Content-Length': videoRes.headers.get('Content-Length') || '',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch video', message: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
