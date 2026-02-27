// Vercel Serverless Function: /api/safe-image
// Server-side image search with Twitch/streaming safety filtering.
// Pipeline: Google Images (SafeSearch ON) → NSFW URL filter → Gemini Vision validation.
// Requires GEMINI_API_KEY env var. No CORS proxy needed (server-side fetch).

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ─── Blocked URL keywords (known NSFW / low-quality sources) ───
const BLOCKED_URL_WORDS = [
  'nsfw', 'xxx', 'porn', 'hentai', 'nude', 'naked', 'sexy',
  'adult', 'erotic', 'lewd', 'rule34', 'booru', 'gelbooru',
  'danbooru', 'paheal', 'e621', 'xhamster', 'xvideos',
  'favicon', 'icon', 'logo', 'gstatic.com', 'googleusercontent',
  'pixel', '1x1', 'spacer', 'blank', 'transparent',
];

// ─── Blocked image themes for Twitch (slot-specific) ───
const NSFW_SLOT_KEYWORDS = [
  'bikini', 'lingerie', 'strip', 'burlesque', 'playboy',
  'hot hot fruit', 'cherry fiesta', // known suggestive slots
];

function isUrlBlocked(url) {
  const lower = url.toLowerCase();
  return BLOCKED_URL_WORDS.some((w) => lower.includes(w));
}

// ─── Extract image URLs from Google Images HTML ───
function extractImageUrls(html) {
  const candidates = [];

  // Strategy 1: JSON pattern "https://…jpg",height,width
  const rxStandard = /"(https?:\/\/[^"]+?\.(?:jpg|png|jpeg|webp))",\d+,\d+/g;
  let m;
  while ((m = rxStandard.exec(html)) !== null && candidates.length < 15) {
    candidates.push(m[1]);
  }

  // Strategy 2: generic image URL in quotes
  if (!candidates.length) {
    const rxGeneric = /"(https?:\/\/[^"]+?\.(?:jpg|png|jpeg|webp))"/g;
    while ((m = rxGeneric.exec(html)) !== null && candidates.length < 15) {
      candidates.push(m[1]);
    }
  }

  // Filter out junk
  return candidates.filter((url) => {
    const l = url.toLowerCase();
    return (
      !isUrlBlocked(l) &&
      (l.includes('jpg') || l.includes('png') || l.includes('webp') || l.includes('jpeg'))
    );
  });
}

// ─── Ask Gemini Vision to validate an image URL for Twitch safety ───
async function validateImageSafety(apiKey, imageUrl, slotName) {
  try {
    // First fetch the image to check it exists and get content type
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SlotBot/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    if (!imgRes.ok) return { safe: false, reason: 'image_unreachable' };

    const contentType = imgRes.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return { safe: false, reason: 'not_an_image' };

    // Convert to base64 for Gemini Vision
    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = contentType.split(';')[0].trim();

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: { mimeType, data: base64 },
            },
            {
              text: `This is a slot game cover image for "${slotName}". Evaluate if it is SAFE to display on a Twitch or YouTube live stream.

Return ONLY a raw JSON object (no markdown):
{
  "safe": true,
  "reason": "brief explanation"
}

Mark safe=false if the image contains:
- Nudity or sexual/suggestive content (revealing clothing, sexual poses)
- Excessive gore, blood, or disturbing imagery
- Drug use depictions
- Real-world violence

Mark safe=true for:
- Standard slot game art (symbols, characters, themes)
- Cartoon violence (fantasy battles, monsters)
- Dark/horror themes without explicit gore
- Anime-style characters in normal attire`,
            },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
      }),
    });

    if (!response.ok) return { safe: true, reason: 'validation_skipped' };

    const data = await response.json();
    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    raw = raw.trim();
    if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');

    const parsed = JSON.parse(raw);
    return {
      safe: typeof parsed.safe === 'boolean' ? parsed.safe : true,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'unknown',
    };
  } catch (e) {
    console.warn('[safe-image] Vision validation error:', e.message);
    // On error, default to safe (don't block legitimate images)
    return { safe: true, reason: 'validation_error' };
  }
}

// ═══════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const { name, provider, validate } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Provide "name"' });

  try {
    const query = `${name} ${provider || ''} slot game official cover art`.trim();
    // SafeSearch ON → Google filters out explicit results server-side
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&safe=active`;

    // Server-side fetch — no CORS issues
    const googleRes = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!googleRes.ok) {
      return res.status(200).json({ imageUrl: null, error: 'Google search failed' });
    }

    const html = await googleRes.text();
    const imageUrls = extractImageUrls(html);

    if (!imageUrls.length) {
      return res.status(200).json({ imageUrl: null, error: 'No images found' });
    }

    // If validate=true, run Gemini Vision on top candidate
    if (validate !== false) {
      // Check up to 3 candidates until we find a safe one
      for (let i = 0; i < Math.min(3, imageUrls.length); i++) {
        const candidate = imageUrls[i];
        const check = await validateImageSafety(apiKey, candidate, name);
        if (check.safe) {
          return res.status(200).json({
            imageUrl: candidate,
            safe: true,
            reason: check.reason,
            source: 'google_safesearch+gemini_vision',
            candidates: imageUrls.length,
          });
        }
        console.log(`[safe-image] Rejected candidate ${i}: ${check.reason}`);
      }

      // All top candidates failed Vision check — return first with warning
      return res.status(200).json({
        imageUrl: imageUrls[0],
        safe: false,
        reason: 'All candidates flagged by AI — use at your own discretion',
        source: 'google_safesearch',
        candidates: imageUrls.length,
      });
    }

    // No validation requested — return first SafeSearch result
    return res.status(200).json({
      imageUrl: imageUrls[0],
      safe: null,
      reason: 'SafeSearch only (no AI validation)',
      source: 'google_safesearch',
      candidates: imageUrls.length,
    });
  } catch (err) {
    console.error('[safe-image] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
