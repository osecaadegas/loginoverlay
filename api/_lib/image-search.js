/**
 * /api/image-search.js — Vercel Serverless Function
 *
 * Searches for slot images by scraping Bing Image Search (free, no API key).
 * Used by the Slot Submission form to let users pick a slot image.
 *
 * GET /api/image-search?q=Gates+of+Olympus+slot
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = (req.query.q || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter "q".' });
  }

  try {
    // Fetch Bing Image Search results page
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.error('[image-search] Bing returned status:', response.status);
      return res.status(502).json({ error: 'Image search temporarily unavailable.' });
    }

    const html = await response.text();

    // Extract image data from Bing's inline JSON (m attribute on image tiles)
    const images = [];
    const mRegex = /class="iusc"[^>]*m="([^"]+)"/g;
    let match;

    while ((match = mRegex.exec(html)) !== null && images.length < 30) {
      try {
        // Bing HTML-encodes the JSON in the m attribute
        const decoded = match[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#39;/g, "'");
        const data = JSON.parse(decoded);
        if (data.murl) {
          images.push({
            url: data.murl,
            thumb: data.turl || data.murl,
            title: data.t || '',
            width: data.mw || null,
            height: data.mh || null,
          });
        }
      } catch { /* skip malformed */ }
    }

    // Fallback: try extracting from "imgpt" data attributes or og:image meta tags
    if (images.length === 0) {
      const imgRegex = /mediaurl=([^&"]+)/gi;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(html)) !== null && images.length < 30) {
        try {
          const imgUrl = decodeURIComponent(imgMatch[1]);
          if (imgUrl.startsWith('http')) {
            images.push({ url: imgUrl, thumb: imgUrl, title: '', width: null, height: null });
          }
        } catch { /* skip */ }
      }
    }

    return res.status(200).json({
      images,
      totalResults: images.length,
      startIndex: 1,
      query,
    });
  } catch (err) {
    console.error('[image-search] fetch error:', err);
    return res.status(500).json({ error: 'Failed to search images.' });
  }
}
