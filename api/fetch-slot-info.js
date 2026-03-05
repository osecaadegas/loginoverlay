/**
 * /api/fetch-slot-info.js — Vercel Serverless Function
 *
 * Scrapes slot information (RTP, max win, volatility, provider, image)
 * from demoslot.com AND slotark.com, merging results.
 *
 * GET /api/fetch-slot-info?name=Hot+Ross
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function decodeHtml(html) {
  return html
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripTags(html) {
  return decodeHtml(html.replace(/<[^>]+>/g, '')).trim();
}

/* ── helpers ── */

async function safeFetch(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' }, redirect: 'follow' });
    return r.ok ? r.text() : null;
  } catch { return null; }
}

function mapVolatility(v) {
  if (!v) return null;
  const map = { low: 'low', medium: 'medium', med: 'medium', high: 'high', 'very high': 'very_high', extreme: 'very_high' };
  return map[v.toLowerCase()] || v.toLowerCase();
}

/* ── demoslot.com parser ── */

function parseDemoSlot(html, slug) {
  const info = {};

  // Structured spec table (td pairs)
  const tdPairRegex = /<td[^>]*>\s*(Provider|RTP|Volatility|Max Win)\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = tdPairRegex.exec(html)) !== null) {
    const key = m[1].trim().toLowerCase();
    const val = stripTags(m[2]);
    if (key === 'provider') info.provider = val;
    else if (key === 'rtp') info.rtp = parseFloat(val.replace('%', '')) || null;
    else if (key === 'volatility') info.volatility = val.toLowerCase();
    else if (key === 'max win') info.max_win_multiplier = parseFloat(val.replace(/[,x]/g, '')) || null;
  }

  // Fallback inline patterns
  if (!info.provider) {
    const p = html.match(/Provider\s*<\/[^>]+>\s*<[^>]+>\s*<a[^>]*>(.*?)<\/a>/i);
    if (p) info.provider = stripTags(p[1]);
  }
  if (!info.rtp) {
    const r = html.match(/RTP\s*<\/[^>]+>\s*<[^>]+>\s*([\d.]+)%/i);
    if (r) info.rtp = parseFloat(r[1]);
  }
  if (!info.volatility) {
    const v = html.match(/Volatility\s*<\/[^>]+>\s*<[^>]+>\s*(\w[\w ]*\w|\w)/i);
    if (v) info.volatility = v[1].trim().toLowerCase();
  }
  if (!info.max_win_multiplier) {
    const x = html.match(/Max Win\s*<\/[^>]+>\s*<[^>]+>\s*([\d,]+)x/i);
    if (x) info.max_win_multiplier = parseFloat(x[1].replace(/,/g, ''));
  }

  // Image — 1) WordPress featured image (wp-post-image class), 2) slug match, 3) first safe image
  // The wp-post-image is the main slot thumbnail, most reliable source
  const wpPostMatch = html.match(/<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+\.(webp|png|jpg|jpeg))"[^>]*>/i)
    || html.match(/<img[^>]*src="([^"]+\.(webp|png|jpg|jpeg))"[^>]*class="[^"]*wp-post-image[^"]*"[^>]*>/i);

  const allImgs = [];
  const imgRe = /<img[^>]*src="(https:\/\/[^"]*demoslot\.com\/wp-content\/uploads\/[^"]*\.(webp|png|jpg|jpeg))"[^>]*>/gi;
  let imgM;
  while ((imgM = imgRe.exec(html)) !== null) allImgs.push(imgM[1]);

  if (wpPostMatch) {
    info.image = wpPostMatch[1];
  } else {
    const slugImg = allImgs.find(u => u.toLowerCase().includes(slug));
    if (slugImg) {
      info.image = slugImg;
    } else if (allImgs.length > 0) {
      const skip = /mostbet|casinia|casino|bonus|banner|logo|welcome|ad-/i;
      info.image = allImgs.find(u => !skip.test(u.split('/').pop())) || allImgs[0];
    }
  }

  return info;
}

/* ── slotark.com parser ── */

function parseSlotArk(html, slug) {
  const info = {};

  // Provider — appears as uppercase text before heading, e.g. "HACKSAW GAMING"
  const provMatch = html.match(/<[^>]*class="[^"]*provider[^"]*"[^>]*>([\s\S]*?)<\//i)
    || html.match(/>\s*([A-Z][A-Z &']+(?:GAMING|PLAY|GAMES|STUDIOS|KINGDOM|ORIGINALS))\s*<\/?\w/);
  if (provMatch) {
    // Title-case it: "HACKSAW GAMING" -> "Hacksaw Gaming"
    info.provider = stripTags(provMatch[1]).replace(/\b\w+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
  }

  // RTP — "RTP 96.32%" or "RTP</...>96.32%"
  const rtpMatch = html.match(/RTP\s*<[^>]*>\s*([\d.]+)%/i) || html.match(/RTP\s+([\d.]+)%/i);
  if (rtpMatch) info.rtp = parseFloat(rtpMatch[1]);

  // Volatility — "VOLATILITY</...>High" or "VOLATILITY High"
  const volMatch = html.match(/VOLATILITY\s*<[^>]*>\s*(\w[\w ]*\w|\w)/i) || html.match(/VOLATILITY\s+(\w[\w ]*\w|\w)/i);
  if (volMatch) info.volatility = volMatch[1].trim().toLowerCase();

  // Max Win — "MAX WIN</...>15,000x" or "MAX WIN 15,000x"
  const maxMatch = html.match(/MAX WIN\s*<[^>]*>\s*([\d,]+)x/i) || html.match(/MAX WIN\s+([\d,]+)x/i);
  if (maxMatch) info.max_win_multiplier = parseFloat(maxMatch[1].replace(/,/g, ''));

  // Image — https://www.slotark.com/images/slots/{slug}.jpg
  const imgMatch = html.match(/<img[^>]*src="(https:\/\/www\.slotark\.com\/images\/slots\/[^"]+\.(jpg|webp|png|jpeg))"[^>]*>/i);
  if (imgMatch) info.image = imgMatch[1];

  return info;
}

/* ── slotslaunch.com parser ── */

function parseSlotsLaunch(html, slug) {
  const info = {};

  // Provider — e.g. <a href="/pragmatic-play">Pragmatic Play</a> in GAME INFORMATION section
  const provMatch = html.match(/PROVIDER[\s\S]*?<a[^>]*href="\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
  if (provMatch) info.provider = stripTags(provMatch[2]);

  // Image — https://assets.slotslaunch.com/{id}/{slug}.jpg
  const imgMatch = html.match(/<img[^>]*src="(https:\/\/assets\.slotslaunch\.com\/\d+\/[^"]+\.(jpg|webp|png|jpeg))"[^>]*>/i);
  if (imgMatch) info.image = imgMatch[1];

  return info;
}

/* ── fetch helpers per source ── */

async function fetchDemoSlot(slug, name) {
  // Try direct URL patterns
  const patterns = [
    `https://www.demoslot.com/free-slots/${slug}-slot-review/`,
    `https://www.demoslot.com/free-slots/${slug}-slot/`,
    `https://www.demoslot.com/free-slots/${slug}-demo/`,
    `https://www.demoslot.com/free-slots/${slug}/`,
  ];
  for (const url of patterns) {
    const html = await safeFetch(url);
    if (html) return { html, url };
  }
  // Fallback: Bing site-search
  const searchHtml = await safeFetch(`https://www.bing.com/search?q=site:demoslot.com+${encodeURIComponent(name)}+slot`);
  if (searchHtml) {
    const link = searchHtml.match(/href="(https:\/\/www\.demoslot\.com\/free-slots\/[^"]+)"/);
    if (link) {
      const html = await safeFetch(link[1]);
      if (html) return { html, url: link[1] };
    }
  }
  return null;
}

async function fetchSlotArk(slug, name) {
  // Direct URL: /slots/{slug}/
  const url = `https://www.slotark.com/slots/${slug}/`;
  const html = await safeFetch(url);
  if (html) return { html, url };
  // Fallback: Bing site-search
  const searchHtml = await safeFetch(`https://www.bing.com/search?q=site:slotark.com+${encodeURIComponent(name)}+slot`);
  if (searchHtml) {
    const link = searchHtml.match(/href="(https:\/\/www\.slotark\.com\/slots\/[^"]+)"/);
    if (link) {
      const page = await safeFetch(link[1]);
      if (page) return { html: page, url: link[1] };
    }
  }
  return null;
}

async function fetchSlotsLaunch(slug, name) {
  // Bing site-search (URL requires provider slug we don't know)
  const searchHtml = await safeFetch(`https://www.bing.com/search?q=site:slotslaunch.com+${encodeURIComponent(name)}+slot`);
  if (searchHtml) {
    const link = searchHtml.match(/href="(https:\/\/slotslaunch\.com\/[^"]+\/[^"]+)"/);
    if (link) {
      const html = await safeFetch(link[1]);
      if (html) return { html, url: link[1] };
    }
  }
  return null;
}

/* ── main handler ── */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const name = (req.query.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Missing query parameter "name".' });

  try {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Fetch all sources in parallel
    const [demoResult, arkResult, launchResult] = await Promise.all([
      fetchDemoSlot(slug, name),
      fetchSlotArk(slug, name),
      fetchSlotsLaunch(slug, name),
    ]);

    const demoInfo = demoResult ? parseDemoSlot(demoResult.html, slug) : {};
    const arkInfo = arkResult ? parseSlotArk(arkResult.html, slug) : {};
    const launchInfo = launchResult ? parseSlotsLaunch(launchResult.html, slug) : {};

    if (!demoResult && !arkResult && !launchResult) {
      return res.status(404).json({ error: 'Slot not found', name });
    }

    // Merge: prefer demoslot data, fill gaps from slotark, then slotslaunch
    const info = {
      provider: demoInfo.provider || arkInfo.provider || launchInfo.provider || null,
      rtp: demoInfo.rtp || arkInfo.rtp || null,
      volatility: mapVolatility(demoInfo.volatility || arkInfo.volatility),
      max_win_multiplier: demoInfo.max_win_multiplier || arkInfo.max_win_multiplier || null,
      image: demoInfo.image || arkInfo.image || launchInfo.image || null,
      // Keep all images so the frontend can show all sources
      images: [demoInfo.image, arkInfo.image, launchInfo.image].filter(Boolean),
      sources: [demoResult?.url, arkResult?.url, launchResult?.url].filter(Boolean),
    };

    return res.status(200).json({ ok: true, info });
  } catch (err) {
    console.error('[fetch-slot-info] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch slot info.' });
  }
}
