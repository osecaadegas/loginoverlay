/**
 * /api/image-search.js — Vercel Serverless Function
 *
 * Searches Google Custom Search API for images.
 * Used by the Slot Submission form to let users pick a slot image.
 *
 * GET /api/image-search?q=Gates+of+Olympus+slot&start=1
 *
 * Env vars required:
 *   GOOGLE_API_KEY           — Google Cloud Console → Credentials → API Key
 *   GOOGLE_SEARCH_ENGINE_ID  — programmablesearchengine.google.com → Search Engine ID
 */

const GOOGLE_API = 'https://www.googleapis.com/customsearch/v1';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !cx) {
    return res.status(500).json({
      error: 'Missing GOOGLE_API_KEY or GOOGLE_SEARCH_ENGINE_ID environment variables.',
    });
  }

  const query = (req.query.q || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter "q".' });
  }

  const start = parseInt(req.query.start, 10) || 1;

  try {
    const url = new URL(GOOGLE_API);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', cx);
    url.searchParams.set('q', query);
    url.searchParams.set('searchType', 'image');
    url.searchParams.set('num', '12');
    url.searchParams.set('start', String(start));
    url.searchParams.set('safe', 'active');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) {
      console.error('[image-search] Google API error:', data);
      return res.status(response.status).json({
        error: data.error?.message || 'Google API error',
      });
    }

    const images = (data.items || []).map((item) => ({
      url: item.link,
      thumb: item.image?.thumbnailLink || item.link,
      title: item.title || '',
      width: item.image?.width,
      height: item.image?.height,
    }));

    const totalResults = parseInt(data.searchInformation?.totalResults || '0', 10);

    return res.status(200).json({
      images,
      totalResults,
      startIndex: start,
      query,
    });
  } catch (err) {
    console.error('[image-search] fetch error:', err);
    return res.status(500).json({ error: 'Failed to search images.' });
  }
}
