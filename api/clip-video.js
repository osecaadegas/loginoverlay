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
 * Tries multiple Twitch CDN URL patterns for maximum compatibility.
 * The Edge runtime supports streaming responses with no body-size limit.
 */
export const config = { runtime: 'edge' };

/** Allowed Twitch CDN hostnames */
const ALLOWED_HOSTS = [
  'clips-media-assets2.twitch.tv',
  'clips-media-assets.twitch.tv',
  'production.assets.clips.twitchcdn.net',
  'clips.twitchcdn.net',
  'vod-secure.twitch.tv',
  'vod-metro.twitch.tv',
  'd1m7jfoe9zdc1j.cloudfront.net',
  'd2nvs31859zcd8.cloudfront.net',
];

function isTwitchCdn(urlStr) {
  try {
    const { hostname } = new URL(urlStr);
    return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

/**
 * Derive all possible .mp4 URLs from a Twitch thumbnail URL.
 * Twitch uses several CDN patterns — try them all.
 */
function deriveMp4Urls(thumbnail) {
  const urls = [];
  if (!thumbnail) return urls;

  // Pattern 1: Standard — strip "-preview-WxH.jpg"
  const p1 = thumbnail.replace(/-preview-\d+x\d+\.jpg$/i, '.mp4');
  if (p1 !== thumbnail) urls.push(p1);

  // Pattern 2: Some thumbnails have query params — strip those first
  const cleanThumb = thumbnail.split('?')[0];
  const p2 = cleanThumb.replace(/-preview-\d+x\d+\.jpg$/i, '.mp4');
  if (p2 !== cleanThumb && !urls.includes(p2)) urls.push(p2);

  // Pattern 3: Try on the other CDN hostname
  for (const url of [...urls]) {
    if (url.includes('clips-media-assets2')) {
      urls.push(url.replace('clips-media-assets2', 'clips-media-assets'));
    } else if (url.includes('clips-media-assets.')) {
      urls.push(url.replace('clips-media-assets.', 'clips-media-assets2.'));
    }
  }

  // Pattern 4: URL-encoded pipe (AT-cm%7C) — decode it
  for (const url of [...urls]) {
    const decoded = decodeURIComponent(url);
    if (decoded !== url) urls.push(decoded);
  }

  return [...new Set(urls)];
}

/** Attempt to fetch with a browser-like UA */
async function tryFetch(url) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Referer': 'https://clips.twitch.tv/',
      'Accept': 'video/mp4, video/*, */*',
    },
    redirect: 'follow',
  });
  return res;
}

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const { searchParams } = new URL(req.url);
  const directUrl = searchParams.get('url');
  const thumbnail = searchParams.get('thumbnail');

  // Build list of URLs to try, in priority order
  const urlsToTry = [];

  // Pre-verified direct URL first
  if (directUrl && isTwitchCdn(directUrl)) {
    urlsToTry.push(directUrl);
  }

  // Derive alternatives from thumbnail
  if (thumbnail) {
    for (const url of deriveMp4Urls(thumbnail)) {
      if (isTwitchCdn(url) && !urlsToTry.includes(url)) {
        urlsToTry.push(url);
      }
    }
  }

  // If direct URL was given but not on CDN, try it anyway as last resort
  if (directUrl && !urlsToTry.includes(directUrl)) {
    urlsToTry.push(directUrl);
  }

  if (urlsToTry.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing url or thumbnail param' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Try each URL until one succeeds
  let lastError = null;
  for (const mp4Url of urlsToTry) {
    try {
      const videoRes = await tryFetch(mp4Url);

      if (videoRes.ok) {
        const ct = videoRes.headers.get('Content-Type') || 'video/mp4';
        // Only stream if it looks like video (not HTML error page)
        if (ct.includes('video') || ct.includes('octet-stream')) {
          return new Response(videoRes.body, {
            status: 200,
            headers: {
              'Content-Type': ct,
              'Content-Length': videoRes.headers.get('Content-Length') || '',
              'Cache-Control': 'public, max-age=3600, s-maxage=86400',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Expose-Headers': 'Content-Length, Content-Type',
            },
          });
        }
      }
      lastError = `${mp4Url} → ${videoRes.status}`;
    } catch (err) {
      lastError = `${mp4Url} → ${err.message}`;
    }
  }

  return new Response(
    JSON.stringify({ error: 'All CDN URLs failed', tried: urlsToTry.length, last: lastError }),
    { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
}
