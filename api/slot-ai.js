// Vercel Serverless Function: /api/slot-ai
// Pipeline: Known Slot DB (real data) → Gemini AI (structured knowledge) → merged result.
// Also returns a Twitch safety rating for the slot's imagery.
// Requires GEMINI_API_KEY env var in Vercel project settings.

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ═══════════════════════════════════════════════
// KNOWN SLOTS DATABASE — verified real data from provider pages
// ═══════════════════════════════════════════════
const KNOWN_SLOTS = {
  'sweet bonanza': {
    name: 'Sweet Bonanza', provider: 'Pragmatic Play', rtp: 96.48, volatility: 'high',
    max_win_multiplier: 21175, theme: 'Candy', release_year: 2019,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus', 'Scatter'],
    twitch_safe: true,
  },
  'gates of olympus': {
    name: 'Gates of Olympus', provider: 'Pragmatic Play', rtp: 96.50, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Greek Mythology', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus'],
    twitch_safe: true,
  },
  'wanted dead or a wild': {
    name: 'Wanted Dead or a Wild', provider: 'Hacksaw Gaming', rtp: 96.38, volatility: 'very_high',
    max_win_multiplier: 12500, theme: 'Western', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'Expanding Wilds', 'Buy Bonus', 'Duel Feature'],
    twitch_safe: true,
  },
  'dog house megaways': {
    name: 'The Dog House Megaways', provider: 'Pragmatic Play', rtp: 96.55, volatility: 'high',
    max_win_multiplier: 12305, theme: 'Animals', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'Sticky Wilds', 'Megaways', 'Buy Bonus'],
    twitch_safe: true,
  },
  'big bass bonanza': {
    name: 'Big Bass Bonanza', provider: 'Pragmatic Play', rtp: 96.71, volatility: 'high',
    max_win_multiplier: 2100, theme: 'Fishing', release_year: 2020,
    features: ['Free Spins', 'Multiplier', 'Scatter', 'Wild Symbols'],
    twitch_safe: true,
  },
  'sugar rush': {
    name: 'Sugar Rush', provider: 'Pragmatic Play', rtp: 96.50, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Candy', release_year: 2022,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus'],
    twitch_safe: true,
  },
  'starlight princess': {
    name: 'Starlight Princess', provider: 'Pragmatic Play', rtp: 96.50, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Anime', release_year: 2022,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus'],
    twitch_safe: true, // official art is fine
  },
  'mental': {
    name: 'Mental', provider: 'Nolimit City', rtp: 96.08, volatility: 'very_high',
    max_win_multiplier: 66666, theme: 'Horror', release_year: 2022,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus', 'xWays', 'xSplit'],
    twitch_safe: false, // disturbing imagery
  },
  'san quentin': {
    name: 'San Quentin xWays', provider: 'Nolimit City', rtp: 96.03, volatility: 'very_high',
    max_win_multiplier: 150000, theme: 'Prison', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus', 'xWays', 'Lockdown Spins'],
    twitch_safe: false, // violent imagery
  },
  'fire in the hole': {
    name: 'Fire in the Hole xBomb', provider: 'Nolimit City', rtp: 96.06, volatility: 'very_high',
    max_win_multiplier: 60000, theme: 'Mining', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus', 'Cascading Reels', 'xWays'],
    twitch_safe: true,
  },
  'tombstone rip': {
    name: 'Tombstone R.I.P.', provider: 'Nolimit City', rtp: 96.08, volatility: 'very_high',
    max_win_multiplier: 300000, theme: 'Western', release_year: 2022,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus', 'xWays', 'Shoot Out'],
    twitch_safe: true,
  },
  'razor shark': {
    name: 'Razor Shark', provider: 'Push Gaming', rtp: 96.70, volatility: 'high',
    max_win_multiplier: 50000, theme: 'Ocean', release_year: 2019,
    features: ['Free Spins', 'Multiplier', 'Mystery Symbols', 'Nudge Feature'],
    twitch_safe: true,
  },
  'book of dead': {
    name: 'Book of Dead', provider: "Play'n GO", rtp: 96.21, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Egyptian', release_year: 2016,
    features: ['Free Spins', 'Expanding Wilds', 'Scatter', 'Gamble Feature'],
    twitch_safe: true,
  },
  'reactoonz': {
    name: 'Reactoonz', provider: "Play'n GO", rtp: 96.51, volatility: 'high',
    max_win_multiplier: 4570, theme: 'Aliens', release_year: 2017,
    features: ['Cascading Reels', 'Multiplier', 'Random Wilds', 'Cluster Pays'],
    twitch_safe: true,
  },
  'fruit party': {
    name: 'Fruit Party', provider: 'Pragmatic Play', rtp: 96.47, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Fruits', release_year: 2020,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus'],
    twitch_safe: true,
  },
  'wild west gold': {
    name: 'Wild West Gold', provider: 'Pragmatic Play', rtp: 96.51, volatility: 'high',
    max_win_multiplier: 10000, theme: 'Western', release_year: 2020,
    features: ['Free Spins', 'Multiplier', 'Sticky Wilds', 'Scatter'],
    twitch_safe: true,
  },
  'dead or alive 2': {
    name: 'Dead or Alive 2', provider: 'NetEnt', rtp: 96.80, volatility: 'very_high',
    max_win_multiplier: 111111, theme: 'Western', release_year: 2019,
    features: ['Free Spins', 'Sticky Wilds', 'Multiplier', 'Scatter'],
    twitch_safe: true,
  },
  "gonzo's quest": {
    name: "Gonzo's Quest", provider: 'NetEnt', rtp: 95.97, volatility: 'medium',
    max_win_multiplier: 2500, theme: 'Adventure', release_year: 2013,
    features: ['Free Spins', 'Multiplier', 'Cascading Reels'],
    twitch_safe: true,
  },
  'chaos crew': {
    name: 'Chaos Crew', provider: 'Hacksaw Gaming', rtp: 96.35, volatility: 'very_high',
    max_win_multiplier: 10000, theme: 'Urban', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus', 'Expanding Wilds'],
    twitch_safe: true,
  },
  'money train 3': {
    name: 'Money Train 3', provider: 'Relax Gaming', rtp: 96.00, volatility: 'very_high',
    max_win_multiplier: 100000, theme: 'Sci-Fi Western', release_year: 2022,
    features: ['Free Spins', 'Multiplier', 'Respins', 'Buy Bonus'],
    twitch_safe: true,
  },
  'le bandit': {
    name: 'Le Bandit', provider: 'Hacksaw Gaming', rtp: 96.30, volatility: 'very_high',
    max_win_multiplier: 10000, theme: 'Heist', release_year: 2023,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus', 'Expanding Wilds'],
    twitch_safe: true,
  },
  'hand of anubis': {
    name: 'Hand of Anubis', provider: 'Hacksaw Gaming', rtp: 96.25, volatility: 'very_high',
    max_win_multiplier: 10000, theme: 'Egyptian', release_year: 2023,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus'],
    twitch_safe: true,
  },
  'big bamboo': {
    name: 'Big Bamboo', provider: 'Push Gaming', rtp: 96.73, volatility: 'high',
    max_win_multiplier: 50000, theme: 'Pandas', release_year: 2022,
    features: ['Free Spins', 'Multiplier', 'Mystery Symbols', 'Buy Bonus'],
    twitch_safe: true,
  },
  'zeus vs hades': {
    name: 'Zeus vs Hades - Gods of War', provider: 'Pragmatic Play', rtp: 96.07, volatility: 'high',
    max_win_multiplier: 15000, theme: 'Greek Mythology', release_year: 2023,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus'],
    twitch_safe: true,
  },
  'wisdom of athena': {
    name: 'Wisdom of Athena', provider: 'Pragmatic Play', rtp: 96.07, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Greek Mythology', release_year: 2023,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus'],
    twitch_safe: true,
  },
  'dork unit': {
    name: 'Dork Unit', provider: 'Hacksaw Gaming', rtp: 96.30, volatility: 'very_high',
    max_win_multiplier: 10000, theme: 'Comedy', release_year: 2022,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus', 'Expanding Wilds'],
    twitch_safe: true,
  },
  'retro tapes': {
    name: 'Retro Tapes', provider: 'Push Gaming', rtp: 96.72, volatility: 'high',
    max_win_multiplier: 50000, theme: 'Retro Music', release_year: 2022,
    features: ['Free Spins', 'Multiplier', 'Cascading Reels'],
    twitch_safe: true,
  },
  'jammin jars': {
    name: "Jammin' Jars", provider: 'Push Gaming', rtp: 96.83, volatility: 'high',
    max_win_multiplier: 20000, theme: 'Fruits Music', release_year: 2018,
    features: ['Cluster Pays', 'Multiplier', 'Free Spins'],
    twitch_safe: true,
  },
  'madame destiny megaways': {
    name: 'Madame Destiny Megaways', provider: 'Pragmatic Play', rtp: 96.56, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Fortune Teller', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'Megaways', 'Buy Bonus'],
    twitch_safe: true,
  },
  'gems bonanza': {
    name: 'Gems Bonanza', provider: 'Pragmatic Play', rtp: 96.51, volatility: 'high',
    max_win_multiplier: 10000, theme: 'Gems Mining', release_year: 2020,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus'],
    twitch_safe: true,
  },
  'das xboot': {
    name: 'Das xBoot', provider: 'Nolimit City', rtp: 96.03, volatility: 'very_high',
    max_win_multiplier: 55800, theme: 'Submarine', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'xWays', 'Buy Bonus'],
    twitch_safe: true,
  },
};

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function findKnownSlot(name) {
  const norm = name.toLowerCase().trim()
    .replace(/[^\w\s']/g, '')   // strip special chars
    .replace(/\s+/g, ' ');      // normalize whitespace

  // Exact match
  if (KNOWN_SLOTS[norm]) return { ...KNOWN_SLOTS[norm], source: 'verified_database' };

  // Partial match
  for (const [key, data] of Object.entries(KNOWN_SLOTS)) {
    if (norm.includes(key) || key.includes(norm)) {
      return { ...data, source: 'verified_database' };
    }
  }
  return null;
}

async function askGemini(apiKey, prompt) {
  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.05, maxOutputTokens: 600 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[slot-ai] Gemini error:', response.status, errText);
    return null;
  }

  const data = await response.json();
  let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  raw = raw.trim();
  if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  return JSON.parse(raw);
}

function sanitize(parsed) {
  return {
    name: typeof parsed.name === 'string' ? parsed.name : null,
    provider: typeof parsed.provider === 'string' ? parsed.provider : null,
    rtp: typeof parsed.rtp === 'number' ? parsed.rtp : null,
    volatility: ['low', 'medium', 'high', 'very_high'].includes(parsed.volatility)
      ? parsed.volatility : null,
    max_win_multiplier: typeof parsed.max_win_multiplier === 'number'
      ? parsed.max_win_multiplier : null,
    features: Array.isArray(parsed.features) ? parsed.features : [],
    theme: typeof parsed.theme === 'string' ? parsed.theme : null,
    release_year: typeof parsed.release_year === 'number' ? parsed.release_year : null,
    twitch_safe: typeof parsed.twitch_safe === 'boolean' ? parsed.twitch_safe : null,
  };
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

  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Provide "name"' });

  try {
    // ── Step 1: Check verified database (instant, 100% accurate) ──
    const known = findKnownSlot(name);
    if (known) {
      console.log(`[slot-ai] DB hit: "${name}" → ${known.name}`);
      return res.status(200).json({ ...known, source: 'verified_database' });
    }

    // ── Step 2: Ask Gemini with strict accuracy prompt ──
    const prompt = `You are a slot game data expert. I need VERIFIED, REAL data for the online slot game "${name}".

Return ONLY a raw JSON object (no markdown, no backticks, no explanation):

{
  "name": "Official full name as listed by the provider",
  "provider": "Provider/studio name (e.g. Pragmatic Play, Hacksaw Gaming, Nolimit City)",
  "rtp": 96.50,
  "volatility": "low" | "medium" | "high" | "very_high",
  "max_win_multiplier": 5000,
  "features": ["Free Spins", "Multiplier", ...],
  "theme": "Theme/genre",
  "release_year": 2021,
  "twitch_safe": true
}

CRITICAL RULES:
- ONLY return data you are confident is real and accurate from official provider specs
- rtp MUST be the official default RTP number (e.g. 96.50, NOT a range)
- max_win_multiplier MUST be the official max win in x (e.g. 5000 means 5000x bet)
- volatility MUST be exactly: "low", "medium", "high", or "very_high"
- twitch_safe: false if the slot contains nudity, sexual/suggestive imagery, extreme gore, or disturbing content. true if the imagery is safe for streaming on Twitch/YouTube
- If you are NOT SURE about a value, use null — DO NOT GUESS
- Return ONLY the JSON, nothing else`;

    const parsed = await askGemini(apiKey, prompt);
    if (!parsed) {
      return res.status(200).json({ error: null, name, source: 'not_found' });
    }

    const result = sanitize(parsed);
    result.source = 'gemini_ai';

    return res.status(200).json(result);
  } catch (err) {
    console.error('[slot-ai] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
