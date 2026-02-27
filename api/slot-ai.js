// Vercel Serverless Function: /api/slot-ai
// Uses Google Gemini to extract structured slot data from a name or URL.
// Requires GEMINI_API_KEY env var in Vercel project settings.

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const { name, url } = req.body || {};
  if (!name && !url) {
    return res.status(400).json({ error: 'Provide "name" or "url"' });
  }

  const subject = name
    ? `the online slot game called "${name}"`
    : `the online slot game at this URL: ${url}`;

  const prompt = `You are an expert on online casino slot games. Given ${subject}, return ONLY a JSON object (no markdown, no backticks, no explanation) with these fields:

{
  "name": "Official game name",
  "provider": "Game provider/studio name",
  "rtp": 96.50,
  "volatility": "low" | "medium" | "high" | "very_high",
  "max_win_multiplier": 5000,
  "features": ["Free Spins", "Multiplier", ...],
  "theme": "Theme description",
  "release_year": 2021
}

Rules:
- rtp must be a number (percentage, e.g. 96.50)
- max_win_multiplier must be a number (e.g. 5000 means 5000x)
- volatility must be exactly one of: "low", "medium", "high", "very_high"
- If you're not sure about a value, use null
- Do NOT invent data — only return what you actually know
- Return ONLY raw JSON, nothing else`;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[slot-ai] Gemini API error:', response.status, errText);
      return res.status(502).json({ error: 'Gemini API error', status: response.status });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown fences if present
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    // Sanitize
    const result = {
      name: typeof parsed.name === 'string' ? parsed.name : null,
      provider: typeof parsed.provider === 'string' ? parsed.provider : null,
      rtp: typeof parsed.rtp === 'number' ? parsed.rtp : null,
      volatility: ['low', 'medium', 'high', 'very_high'].includes(parsed.volatility)
        ? parsed.volatility
        : null,
      max_win_multiplier: typeof parsed.max_win_multiplier === 'number'
        ? parsed.max_win_multiplier
        : null,
      features: Array.isArray(parsed.features) ? parsed.features : [],
      theme: typeof parsed.theme === 'string' ? parsed.theme : null,
      release_year: typeof parsed.release_year === 'number' ? parsed.release_year : null,
    };

    return res.status(200).json(result);
  } catch (err) {
    console.error('[slot-ai] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
