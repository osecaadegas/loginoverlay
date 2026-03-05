/**
 * /api/fetch-slot-info.js — Vercel Serverless Function
 *
 * Scrapes slot information (RTP, max win, volatility, provider, image)
 * from demoslot.com by searching for a slot name.
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

/**
 * Parse the spec table from demoslot.com HTML.
 * The table rows look like: <td>Provider</td><td><a ...>Hacksaw Gaming</a></td>
 * Or inline text like: ProviderHacksaw GamingReels5...
 */
function parseSpecTable(html, slug) {
  const info = {};

  // Try to extract from the structured spec table (td pairs)
  const tdPairRegex = /<td[^>]*>\s*(Provider|RTP|Volatility|Max Win|Bet Range|Reels|Rows|Paylines|Bonus Buy)\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = tdPairRegex.exec(html)) !== null) {
    const key = m[1].trim().toLowerCase();
    const val = stripTags(m[2]);
    if (key === 'provider') info.provider = val;
    else if (key === 'rtp') info.rtp = parseFloat(val.replace('%', '')) || null;
    else if (key === 'volatility') info.volatility = val.toLowerCase();
    else if (key === 'max win') info.max_win_multiplier = parseFloat(val.replace(/[,x]/g, '')) || null;
  }

  // Fallback: try the inline text block pattern
  if (!info.provider) {
    const provMatch = html.match(/Provider\s*<\/[^>]+>\s*<[^>]+>\s*<a[^>]*>(.*?)<\/a>/i);
    if (provMatch) info.provider = stripTags(provMatch[1]);
  }
  if (!info.rtp) {
    const rtpMatch = html.match(/RTP\s*<\/[^>]+>\s*<[^>]+>\s*([\d.]+)%/i);
    if (rtpMatch) info.rtp = parseFloat(rtpMatch[1]);
  }
  if (!info.volatility) {
    const volMatch = html.match(/Volatility\s*<\/[^>]+>\s*<[^>]+>\s*(\w+)/i);
    if (volMatch) info.volatility = volMatch[1].toLowerCase();
  }
  if (!info.max_win_multiplier) {
    const maxMatch = html.match(/Max Win\s*<\/[^>]+>\s*<[^>]+>\s*([\d,]+)x/i);
    if (maxMatch) info.max_win_multiplier = parseFloat(maxMatch[1].replace(/,/g, ''));
  }

  // Extract main slot image — prioritise images whose filename contains the slug
  const allImgs = [];
  const imgRegex = /<img[^>]*src="(https:\/\/www\.demoslot\.com\/wp-content\/uploads\/[^"]*\.(webp|png|jpg|jpeg))"[^>]*>/gi;
  let imgM;
  while ((imgM = imgRegex.exec(html)) !== null) allImgs.push(imgM[1]);

  // 1st: image whose filename contains the slug (e.g. big-bass-raceday-repeat-slot-1.webp)
  const slugMatch = allImgs.find(u => u.toLowerCase().includes(slug));
  if (slugMatch) {
    info.image = slugMatch;
  } else if (allImgs.length > 0) {
    // 2nd: skip common ad/brand images, pick the first remaining one
    const skip = /mostbet|casinia|casino|bonus|banner|logo|welcome|ad-/i;
    const clean = allImgs.find(u => !skip.test(u.split('/').pop()));
    info.image = clean || allImgs[0];
  }

  return info;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const name = (req.query.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Missing query parameter "name".' });

  try {
    // Build slug from name: "Hot Ross" -> "hot-ross-slot-review"
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Try common URL patterns on demoslot.com
    const patterns = [
      `https://www.demoslot.com/free-slots/${slug}-slot-review/`,
      `https://www.demoslot.com/free-slots/${slug}-slot/`,
      `https://www.demoslot.com/free-slots/${slug}-demo/`,
      `https://www.demoslot.com/free-slots/${slug}/`,
    ];

    let html = null;
    let finalUrl = null;

    for (const url of patterns) {
      try {
        const resp = await fetch(url, {
          headers: { 'User-Agent': UA, 'Accept': 'text/html' },
          redirect: 'follow',
        });
        if (resp.ok) {
          html = await resp.text();
          finalUrl = url;
          break;
        }
      } catch { /* try next */ }
    }

    // If direct URL didn't work, try Google search for the slot on demoslot.com
    if (!html) {
      const searchUrl = `https://www.bing.com/search?q=site:demoslot.com+${encodeURIComponent(name)}+slot`;
      const searchResp = await fetch(searchUrl, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html' },
      });
      if (searchResp.ok) {
        const searchHtml = await searchResp.text();
        const linkMatch = searchHtml.match(/href="(https:\/\/www\.demoslot\.com\/free-slots\/[^"]+)"/);
        if (linkMatch) {
          const pageResp = await fetch(linkMatch[1], {
            headers: { 'User-Agent': UA, 'Accept': 'text/html' },
            redirect: 'follow',
          });
          if (pageResp.ok) {
            html = await pageResp.text();
            finalUrl = linkMatch[1];
          }
        }
      }
    }

    if (!html) {
      return res.status(404).json({ error: 'Slot not found on demoslot.com', name });
    }

    const info = parseSpecTable(html, slug);
    info.source = finalUrl;

    // Map volatility to our format
    if (info.volatility) {
      const volMap = {
        'low': 'low',
        'medium': 'medium',
        'med': 'medium',
        'high': 'high',
        'very high': 'very_high',
        'extreme': 'very_high',
      };
      info.volatility = volMap[info.volatility] || info.volatility;
    }

    return res.status(200).json({ ok: true, info });
  } catch (err) {
    console.error('[fetch-slot-info] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch slot info.' });
  }
}
