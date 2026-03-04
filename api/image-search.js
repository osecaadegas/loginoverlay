/**
 * /api/image-search.js — Vercel Serverless Function
 *
 * Searches for images using DuckDuckGo (free, no API key needed).
 * Used by the Slot Submission form to let users pick a slot image.
 *
 * GET /api/image-search?q=Gates+of+Olympus+slot
 */

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
    // Step 1: Get a vqd token from DuckDuckGo
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    });
    const tokenHtml = await tokenRes.text();
    const vqdMatch = tokenHtml.match(/vqd=["']?([^"'&]+)/);
    
    if (!vqdMatch) {
      // Fallback: try the API token endpoint
      const tokenRes2 = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      const text2 = await tokenRes2.text();
      const vqd2 = text2.match(/vqd=["']?([^"'&]+)/);
      if (!vqd2) {
        console.error('[image-search] Could not extract vqd token');
        return res.status(502).json({ error: 'Could not initialize image search.' });
      }
      var vqd = vqd2[1];
    } else {
      var vqd = vqdMatch[1];
    }

    // Step 2: Fetch image results
    const imgUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`;
    const imgRes = await fetch(imgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/',
      },
    });
    const imgData = await imgRes.json();

    const results = (imgData.results || []).slice(0, 12);
    
    const images = results.map((item) => ({
      url: item.image,
      thumb: item.thumbnail,
      title: item.title || '',
      width: item.width,
      height: item.height,
    }));

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
