// Vercel Serverless Function: /api/slot-ai
// Pipeline: Supabase DB (8000+) → Hardcoded → Gemini AI → Provider Website → Google fallback.
// New slots found by AI are auto-saved to the DB. Missing RTP/max_win are enriched via Gemini.
// Requires GEMINI_API_KEY + SUPABASE env vars in Vercel project settings.

import { createClient } from '@supabase/supabase-js';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ═══════════════════════════════════════════════
// PROVIDERS ALWAYS SAFE FOR TWITCH (controversial names, safe imagery)
// ═══════════════════════════════════════════════
const SAFE_PROVIDERS = [
  'nolimit city', 'nolimit', 'hacksaw gaming', 'hacksaw',
  'pragmatic play', 'pragmatic', 'push gaming',
  'big time gaming', 'btg', 'elk studios', 'elk',
  'thunderkick', 'relax gaming', 'red tiger',
  'blueprint gaming', 'quickspin', 'yggdrasil',
  'play\'n go', 'playngo', 'netent', 'evolution',
  'gamomat', 'kalamba games', 'avatarux', 'fantasma games',
  'print studios', '3 oaks', 'wazdan', 'spinomenal',
  'booming games', 'gameart', 'endorphina', 'habanero',
];

function isProviderSafe(provider) {
  if (!provider) return null;
  const low = provider.toLowerCase().trim();
  return SAFE_PROVIDERS.some(p => low.includes(p) || p.includes(low)) ? true : null;
}

// ═══════════════════════════════════════════════
// SUPABASE — query your 8000+ slots database
// ═══════════════════════════════════════════════

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Search the slots table by name.
 * Uses Postgres ilike for fuzzy matching + word-based fallback.
 */
async function searchSlotsDB(name) {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[slot-ai] Supabase not configured, skipping DB search');
    return null;
  }

  const norm = name.trim();

  try {
    const cols = 'id, name, provider, image, rtp, volatility, max_win_multiplier, theme, features';

    // 1. Exact match (case-insensitive)
    let { data } = await supabase
      .from('slots')
      .select(cols)
      .ilike('name', norm)
      .limit(1);

    if (data?.length) return formatDBSlot(data[0]);

    // 2. Contains match (e.g. "gold party" matches "Gold Party")
    ({ data } = await supabase
      .from('slots')
      .select(cols)
      .ilike('name', `%${norm}%`)
      .limit(5));

    if (data?.length) {
      // Pick best match by shortest name (most specific)
      const best = data.sort((a, b) => a.name.length - b.name.length)[0];
      return formatDBSlot(best);
    }

    // 3. Try each word (for multi-word names like "wanted dead wild")
    const words = norm.split(/\s+/).filter(w => w.length > 2);
    if (words.length >= 2) {
      // Search with first two significant words using AND pattern
      const pattern = `%${words[0]}%${words[1]}%`;
      ({ data } = await supabase
        .from('slots')
        .select(cols)
        .ilike('name', pattern)
        .limit(5));

      if (data?.length) {
        const best = data.sort((a, b) => a.name.length - b.name.length)[0];
        return formatDBSlot(best);
      }
    }

    return null;
  } catch (e) {
    console.error('[slot-ai] Supabase search error:', e);
    return null;
  }
}

function formatDBSlot(row) {
  return {
    _dbId: row.id,       // internal — used to update the row if we enrich missing data
    name: row.name,
    provider: row.provider,
    image: row.image || null,
    rtp: row.rtp ? parseFloat(row.rtp) : null,
    volatility: normalizeVolatility(row.volatility),
    max_win_multiplier: row.max_win_multiplier ? parseFloat(row.max_win_multiplier) : null,
    theme: row.theme || null,
    features: Array.isArray(row.features) ? row.features : [],
    twitch_safe: isProviderSafe(row.provider),
    source: 'slots_database',
  };
}

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
  'gold party': {
    name: 'Gold Party', provider: 'Pragmatic Play', rtp: 96.50, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Gold Mining', release_year: 2023,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus'],
    twitch_safe: true,
  },
  'sweet bonanza 1000': {
    name: 'Sweet Bonanza 1000', provider: 'Pragmatic Play', rtp: 96.53, volatility: 'very_high',
    max_win_multiplier: 25000, theme: 'Candy', release_year: 2024,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus'],
    twitch_safe: true,
  },
  'gates of olympus 1000': {
    name: 'Gates of Olympus 1000', provider: 'Pragmatic Play', rtp: 96.50, volatility: 'very_high',
    max_win_multiplier: 15000, theme: 'Greek Mythology', release_year: 2024,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus'],
    twitch_safe: true,
  },
  'sugar rush 1000': {
    name: 'Sugar Rush 1000', provider: 'Pragmatic Play', rtp: 96.53, volatility: 'very_high',
    max_win_multiplier: 25000, theme: 'Candy', release_year: 2024,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus'],
    twitch_safe: true,
  },
  'the dog house': {
    name: 'The Dog House', provider: 'Pragmatic Play', rtp: 96.51, volatility: 'high',
    max_win_multiplier: 6750, theme: 'Animals', release_year: 2019,
    features: ['Free Spins', 'Multiplier', 'Sticky Wilds'],
    twitch_safe: true,
  },
  'buffalo king megaways': {
    name: 'Buffalo King Megaways', provider: 'Pragmatic Play', rtp: 96.52, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Animals', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'Megaways', 'Buy Bonus'],
    twitch_safe: true,
  },
  'big bass splash': {
    name: 'Big Bass Splash', provider: 'Pragmatic Play', rtp: 96.71, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Fishing', release_year: 2022,
    features: ['Free Spins', 'Multiplier', 'Scatter', 'Wild Symbols'],
    twitch_safe: true,
  },
  'floating dragon': {
    name: 'Floating Dragon', provider: 'Pragmatic Play', rtp: 96.71, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Asian', release_year: 2022,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus'],
    twitch_safe: true,
  },
  'the hand of midas': {
    name: 'The Hand of Midas', provider: 'Pragmatic Play', rtp: 96.54, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Greek Mythology', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus'],
    twitch_safe: true,
  },
  'might of ra': {
    name: 'Might of Ra', provider: 'Pragmatic Play', rtp: 96.50, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Egyptian', release_year: 2023,
    features: ['Free Spins', 'Multiplier', 'Expanding Wilds'],
    twitch_safe: true,
  },
  'bonanza': {
    name: 'Bonanza Megaways', provider: 'Big Time Gaming', rtp: 96.00, volatility: 'high',
    max_win_multiplier: 10000, theme: 'Mining', release_year: 2016,
    features: ['Free Spins', 'Multiplier', 'Megaways', 'Cascading Reels'],
    twitch_safe: true,
  },
  'extra chilli': {
    name: 'Extra Chilli Megaways', provider: 'Big Time Gaming', rtp: 96.15, volatility: 'high',
    max_win_multiplier: 20000, theme: 'Food', release_year: 2018,
    features: ['Free Spins', 'Multiplier', 'Megaways', 'Gamble Feature'],
    twitch_safe: true,
  },
  'white rabbit': {
    name: 'White Rabbit Megaways', provider: 'Big Time Gaming', rtp: 97.24, volatility: 'high',
    max_win_multiplier: 13000, theme: 'Alice in Wonderland', release_year: 2017,
    features: ['Free Spins', 'Megaways', 'Feature Drop', 'Extending Reels'],
    twitch_safe: true,
  },
  'royal mint': {
    name: 'Royal Mint Megaways', provider: 'Big Time Gaming', rtp: 96.42, volatility: 'high',
    max_win_multiplier: 14400, theme: 'Heist', release_year: 2022,
    features: ['Free Spins', 'Megaways', 'Multiplier'],
    twitch_safe: true,
  },
  'kingmaker': {
    name: 'Kingmaker Megaways', provider: 'Big Time Gaming', rtp: 96.65, volatility: 'high',
    max_win_multiplier: 14000, theme: 'Medieval', release_year: 2020,
    features: ['Free Spins', 'Megaways', 'Multiplier'],
    twitch_safe: true,
  },
  'immortal romance': {
    name: 'Immortal Romance', provider: 'Microgaming', rtp: 96.86, volatility: 'high',
    max_win_multiplier: 12150, theme: 'Vampires', release_year: 2011,
    features: ['Free Spins', 'Multiplier', 'Wild Desire'],
    twitch_safe: true,
  },
  'starburst': {
    name: 'Starburst', provider: 'NetEnt', rtp: 96.09, volatility: 'low',
    max_win_multiplier: 500, theme: 'Space Gems', release_year: 2012,
    features: ['Expanding Wilds', 'Re-spins', 'Both Ways Pay'],
    twitch_safe: true,
  },
  'mega moolah': {
    name: 'Mega Moolah', provider: 'Microgaming', rtp: 88.12, volatility: 'medium',
    max_win_multiplier: null, theme: 'African Safari', release_year: 2006,
    features: ['Free Spins', 'Progressive Jackpot', 'Multiplier'],
    twitch_safe: true,
  },
  'rick and morty megaways': {
    name: 'Rick and Morty Megaways', provider: 'Blueprint Gaming', rtp: 96.01, volatility: 'high',
    max_win_multiplier: 50000, theme: 'Sci-Fi Cartoon', release_year: 2021,
    features: ['Free Spins', 'Megaways', 'Multiplier', 'Random Features'],
    twitch_safe: true,
  },
  'mystery museum': {
    name: 'Mystery Museum', provider: 'Push Gaming', rtp: 96.65, volatility: 'high',
    max_win_multiplier: 25000, theme: 'Museum', release_year: 2019,
    features: ['Free Spins', 'Multiplier', 'Expanding Symbols'],
    twitch_safe: true,
  },
  'stack em': {
    name: "Stack 'Em", provider: 'Hacksaw Gaming', rtp: 96.29, volatility: 'very_high',
    max_win_multiplier: 10000, theme: 'Puzzle', release_year: 2022,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus'],
    twitch_safe: true,
  },
  'itero': {
    name: 'Itero', provider: 'Hacksaw Gaming', rtp: 96.22, volatility: 'very_high',
    max_win_multiplier: 10000, theme: 'Abstract', release_year: 2023,
    features: ['Free Spins', 'Multiplier', 'Re-spins', 'Buy Bonus'],
    twitch_safe: true,
  },
  'xways hoarder': {
    name: 'xWays Hoarder xSplit', provider: 'Nolimit City', rtp: 96.05, volatility: 'very_high',
    max_win_multiplier: 31050, theme: 'Heist', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'xWays', 'xSplit', 'Buy Bonus'],
    twitch_safe: true,
  },
  'el paso gunfight': {
    name: 'El Paso Gunfight xNudge', provider: 'Nolimit City', rtp: 96.06, volatility: 'very_high',
    max_win_multiplier: 44440, theme: 'Western', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'xNudge', 'Buy Bonus'],
    twitch_safe: true,
  },
  'misery mining': {
    name: 'Misery Mining', provider: 'Nolimit City', rtp: 96.09, volatility: 'very_high',
    max_win_multiplier: 30100, theme: 'Mining Horror', release_year: 2022,
    features: ['Free Spins', 'Multiplier', 'xWays', 'Buy Bonus'],
    twitch_safe: false, // dark imagery
  },
  'bushido ways': {
    name: 'Bushido Ways xNudge', provider: 'Nolimit City', rtp: 96.06, volatility: 'very_high',
    max_win_multiplier: 20230, theme: 'Samurai', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'xNudge', 'Buy Bonus'],
    twitch_safe: true,
  },
  'curse of the werewolf': {
    name: 'Curse of the Werewolf Megaways', provider: 'Pragmatic Play', rtp: 96.50, volatility: 'high',
    max_win_multiplier: 20000, theme: 'Horror', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'Megaways', 'Buy Bonus'],
    twitch_safe: true,
  },
  'piranha pays': {
    name: 'Piranha Pays', provider: 'Play\'n GO', rtp: 96.20, volatility: 'high',
    max_win_multiplier: 15000, theme: 'Ocean', release_year: 2023,
    features: ['Cluster Pays', 'Free Spins', 'Multiplier'],
    twitch_safe: true,
  },
  'fire joker': {
    name: 'Fire Joker', provider: 'Play\'n GO', rtp: 96.15, volatility: 'high',
    max_win_multiplier: 800, theme: 'Classic', release_year: 2016,
    features: ['Re-spins', 'Multiplier', 'Wheel of Multipliers'],
    twitch_safe: true,
  },
  'rise of merlin': {
    name: 'Rise of Merlin', provider: 'Play\'n GO', rtp: 96.58, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Fantasy', release_year: 2019,
    features: ['Free Spins', 'Expanding Symbols'],
    twitch_safe: true,
  },
  'coin train': {
    name: 'Coin Train', provider: 'Pragmatic Play', rtp: 96.50, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Train', release_year: 2023,
    features: ['Free Spins', 'Multiplier', 'Hold & Win'],
    twitch_safe: true,
  },
  '5 lions megaways': {
    name: '5 Lions Megaways', provider: 'Pragmatic Play', rtp: 96.50, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Asian', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'Megaways', 'Buy Bonus'],
    twitch_safe: true,
  },
  'power of thor': {
    name: 'Power of Thor Megaways', provider: 'Pragmatic Play', rtp: 96.55, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Norse Mythology', release_year: 2021,
    features: ['Free Spins', 'Multiplier', 'Megaways', 'Buy Bonus'],
    twitch_safe: true,
  },
  'release the kraken': {
    name: 'Release the Kraken', provider: 'Pragmatic Play', rtp: 96.50, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Ocean Mythology', release_year: 2020,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus'],
    twitch_safe: true,
  },
  'drill that gold': {
    name: 'Drill That Gold', provider: 'Pragmatic Play', rtp: 96.50, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Mining', release_year: 2023,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus'],
    twitch_safe: true,
  },
  'joker king': {
    name: 'Joker King', provider: 'Pragmatic Play', rtp: 96.50, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Classic', release_year: 2022,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus'],
    twitch_safe: true,
  },
  'aztec king': {
    name: 'Aztec King Megaways', provider: 'Pragmatic Play', rtp: 96.50, volatility: 'high',
    max_win_multiplier: 5000, theme: 'Aztec', release_year: 2022,
    features: ['Free Spins', 'Multiplier', 'Megaways', 'Buy Bonus'],
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

  // Partial / substring match
  for (const [key, data] of Object.entries(KNOWN_SLOTS)) {
    if (norm.includes(key) || key.includes(norm)) {
      return { ...data, source: 'verified_database' };
    }
  }

  // Word-overlap match (handles "wanted dead or wild" ↔ "wanted dead or a wild")
  const normWords = norm.split(' ').filter(w => w.length > 1);
  let bestMatch = null;
  let bestScore = 0;
  for (const [key, data] of Object.entries(KNOWN_SLOTS)) {
    const keyWords = key.split(' ').filter(w => w.length > 1);
    const overlap = normWords.filter(w => keyWords.includes(w)).length;
    const score = overlap / Math.max(normWords.length, keyWords.length);
    if (score > bestScore && score >= 0.65) {   // at least 65% word overlap
      bestScore = score;
      bestMatch = { ...data, source: 'verified_database' };
    }
  }
  return bestMatch;
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
  if (!raw) {
    console.error('[slot-ai] Gemini returned empty response');
    return null;
  }
  // Strip markdown code fences if present
  if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('[slot-ai] Gemini JSON parse failed:', e.message, 'Raw:', raw.substring(0, 200));
    return null;
  }
}

// ═══════════════════════════════════════════════
// PROVIDER OFFICIAL WEBSITES — maps to game catalog URLs
// Search here first for safety & accuracy before Google.
// ═══════════════════════════════════════════════

const PROVIDER_SITES = {
  // { domain, searchUrl(slug), directUrl(slug), aliases }
  'pragmatic play':  { domain: 'pragmaticplay.com',     search: s => `https://www.pragmaticplay.com/en/games/?game=${encodeURIComponent(s)}`, direct: s => `https://www.pragmaticplay.com/en/games/${s}/` },
  'hacksaw gaming':  { domain: 'hacksawgaming.com',     search: s => `https://www.hacksawgaming.com/games`,                                   direct: s => `https://www.hacksawgaming.com/games/${s}` },
  'nolimit city':    { domain: 'nolimitcity.com',       search: s => `https://www.nolimitcity.com/games/`,                                    direct: s => `https://www.nolimitcity.com/games/${s}` },
  "play'n go":       { domain: 'playngo.com',           search: s => `https://www.playngo.com/games`,                                         direct: s => `https://www.playngo.com/games/${s}` },
  'push gaming':     { domain: 'pushgaming.com',        search: s => `https://www.pushgaming.com/games`,                                      direct: s => `https://www.pushgaming.com/games/${s}` },
  'big time gaming': { domain: 'bigtimegaming.com',     search: s => `https://www.bigtimegaming.com/games/`,                                  direct: s => `https://www.bigtimegaming.com/games/${s}/` },
  'elk studios':     { domain: 'elkstudios.com',        search: s => `https://www.elkstudios.com/games/`,                                     direct: s => `https://www.elkstudios.com/game/${s}/` },
  'relax gaming':    { domain: 'relaxgaming.com',       search: s => `https://www.relaxgaming.com/games`,                                     direct: s => `https://www.relaxgaming.com/games/${s}` },
  'red tiger':       { domain: 'redtiger.com',          search: s => `https://www.redtiger.com/games`,                                        direct: s => `https://www.redtiger.com/games/${s}` },
  'netent':          { domain: 'netent.com',            search: s => `https://www.netent.com/en/games/`,                                      direct: s => `https://www.netent.com/en/games/${s}/` },
  'thunderkick':     { domain: 'thunderkick.com',       search: s => `https://www.thunderkick.com/games`,                                     direct: s => `https://www.thunderkick.com/games/${s}` },
  'quickspin':       { domain: 'quickspin.com',         search: s => `https://www.quickspin.com/slots/`,                                      direct: s => `https://www.quickspin.com/slots/${s}/` },
  'yggdrasil':       { domain: 'yggdrasilgaming.com',   search: s => `https://www.yggdrasilgaming.com/games`,                                 direct: s => `https://www.yggdrasilgaming.com/games/${s}` },
  'blueprint gaming':{ domain: 'blueprintgaming.com',   search: s => `https://www.blueprintgaming.com/game-catalogue`,                        direct: s => `https://www.blueprintgaming.com/game/${s}` },
  'kalamba games':   { domain: 'kalambagames.com',      search: s => `https://www.kalambagames.com/games`,                                    direct: s => `https://www.kalambagames.com/games/${s}` },
  'avatarux':        { domain: 'avatarux.com',          search: s => `https://www.avatarux.com/games/`,                                       direct: s => `https://www.avatarux.com/games/${s}/` },
  'fantasma games':  { domain: 'fantasmagames.com',     search: s => `https://fantasmagames.com/games`,                                       direct: s => `https://fantasmagames.com/games/${s}` },
  'print studios':   { domain: 'printstudios.com',      search: s => `https://www.printstudios.com/games`,                                    direct: s => `https://www.printstudios.com/games/${s}` },
  'wazdan':          { domain: 'wazdan.com',            search: s => `https://www.wazdan.com/en/games`,                                       direct: s => `https://www.wazdan.com/en/games/${s}` },
  'spinomenal':      { domain: 'spinomenal.com',        search: s => `https://www.spinomenal.com/games`,                                      direct: s => `https://www.spinomenal.com/games/${s}` },
  'habanero':        { domain: 'habanerosystems.com',   search: s => `https://www.habanerosystems.com/en/games`,                              direct: s => `https://www.habanerosystems.com/en/games/${s}` },
  'endorphina':      { domain: 'endorphina.com',        search: s => `https://endorphina.com/games`,                                          direct: s => `https://endorphina.com/games/${s}` },
  'booming games':   { domain: 'boominggames.com',      search: s => `https://www.boominggames.com/games`,                                    direct: s => `https://www.boominggames.com/games/${s}` },
  'gameart':         { domain: 'gameart.net',           search: s => `https://www.gameart.net/slot-games.html`,                                direct: s => `https://www.gameart.net/slot-game/${s}.html` },
  '3 oaks':          { domain: '3oaks.com',             search: s => `https://3oaks.com/games/`,                                              direct: s => `https://3oaks.com/games/${s}` },
  'gamomat':         { domain: 'gamomat.com',           search: s => `https://www.gamomat.com/games`,                                         direct: s => `https://www.gamomat.com/games/${s}` },
  'isoftbet':        { domain: 'isoftbet.com',          search: s => `https://www.isoftbet.com/games`,                                        direct: s => `https://www.isoftbet.com/game/${s}` },
  'betsoft':         { domain: 'betsoft.com',           search: s => `https://www.betsoft.com/games`,                                          direct: s => `https://www.betsoft.com/game/${s}` },
  'pgsoft':          { domain: 'pgsoft.com',            search: s => `https://www.pgsoft.com/games`,                                           direct: s => `https://www.pgsoft.com/games/${s}` },
  'evolution':       { domain: 'evolution.com',          search: s => `https://www.evolution.com/games`,                                       direct: s => `https://www.evolution.com/games/${s}` },
  'spribe':          { domain: 'spribe.co',             search: s => `https://spribe.co/games`,                                               direct: s => `https://spribe.co/games/${s}` },
};

// Aliases to normalize provider input
const PROVIDER_ALIASES = {
  'pragmatic': 'pragmatic play', 'ppgames': 'pragmatic play',
  'hacksaw': 'hacksaw gaming',
  'nolimit': 'nolimit city', 'nolimitcity': 'nolimit city',
  'playngo': "play'n go", "play'n go": "play'n go",
  'btg': 'big time gaming', 'bigtime': 'big time gaming',
  'elk': 'elk studios',
  'relax': 'relax gaming', 'rlx': 'relax gaming',
  'blueprint': 'blueprint gaming',
  'kalamba': 'kalamba games',
  'avatarux': 'avatarux',
  'fantasma': 'fantasma games',
  'print': 'print studios',
  'endorphina': 'endorphina',
  'booming': 'booming games',
  'isoftbet': 'isoftbet',
  'betsoft': 'betsoft',
  'pgsoft': 'pgsoft', 'pocketgames': 'pgsoft', 'pg soft': 'pgsoft',
  'evolution': 'evolution',
  'spribe': 'spribe',
  'net ent': 'netent', 'net entertainment': 'netent',
  'red tiger gaming': 'red tiger',
  'yggdrasil gaming': 'yggdrasil',
  'quickspin': 'quickspin',
  'thunderkick': 'thunderkick',
  'wazdan': 'wazdan',
  'spinomenal': 'spinomenal',
  'habanero': 'habanero',
  'gamomat': 'gamomat',
  'gameart': 'gameart',
  '3oaks': '3 oaks', 'three oaks': '3 oaks',
};

function resolveProvider(provider) {
  if (!provider) return null;
  const low = provider.toLowerCase().trim();
  return PROVIDER_ALIASES[low] || low;
}

function getProviderSite(provider) {
  const key = resolveProvider(provider);
  if (!key) return null;
  return PROVIDER_SITES[key] || null;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Helper: strip HTML to text
function htmlToText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Search OFFICIAL provider website for a slot.
 * Strategy: 1) direct URL  2) site-specific Google search
 * Returns { text, url, fetchFailed } or null
 */
async function searchProviderSite(provider, slotName) {
  const site = getProviderSite(provider);
  if (!site) return { fetchFailed: false, found: false, text: null };

  const slug = slugify(slotName);
  const directUrl = site.direct(slug);
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // ── Attempt 1: direct game page URL ──
  try {
    console.log(`[slot-ai] Provider direct: ${directUrl}`);
    const res = await fetch(directUrl, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text/html')) {
        const html = await res.text();
        const text = htmlToText(html);
        // Check if the page actually mentions the slot (not a generic 404/redirect)
        const nameLow = slotName.toLowerCase();
        const words = nameLow.split(/\s+/).filter(w => w.length > 2);
        const textLow = text.toLowerCase();
        const nameMatch = words.filter(w => textLow.includes(w)).length >= Math.max(1, words.length * 0.5);
        if (nameMatch && text.length > 200) {
          console.log(`[slot-ai] Found on provider site (direct): ${directUrl}`);
          return { fetchFailed: false, found: true, text: text.substring(0, 4000), url: directUrl };
        }
      }
    }
  } catch (e) {
    console.warn(`[slot-ai] Provider direct fetch failed: ${e.message}`);
    // Will try site-search next
  }

  // ── Attempt 2: Google site-specific search (e.g. site:hacksawgaming.com "Hot Ross") ──
  try {
    const siteQuery = `site:${site.domain} "${slotName}"`;
    console.log(`[slot-ai] Provider Google: ${siteQuery}`);
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(siteQuery)}`;
    const gRes = await fetch(googleUrl, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(6000),
    });
    if (!gRes.ok) return { fetchFailed: true, found: false, text: null };

    const gHtml = await gRes.text();
    // Extract first result URL from the provider domain
    const urlRx = /href="\/url\?q=(https?:\/\/[^&"]+)/g;
    let m;
    while ((m = urlRx.exec(gHtml)) !== null) {
      const u = decodeURIComponent(m[1]);
      if (u.includes(site.domain)) {
        // Found a page on the provider's site — fetch it
        try {
          const pageRes = await fetch(u, {
            headers: { 'User-Agent': UA },
            redirect: 'follow',
            signal: AbortSignal.timeout(6000),
          });
          if (pageRes.ok) {
            const ct = pageRes.headers.get('content-type') || '';
            if (ct.includes('text/html')) {
              const text = htmlToText(await pageRes.text());
              if (text.length > 200) {
                console.log(`[slot-ai] Found on provider site (Google): ${u}`);
                return { fetchFailed: false, found: true, text: text.substring(0, 4000), url: u };
              }
            }
          }
        } catch (_) { /* skip this URL */ }
      }
    }

    // Google worked but no results on the provider domain → slot not on their site
    const serpText = htmlToText(gHtml);
    if (serpText.length > 100) {
      // Check if SERP itself has some slot data from snippets
      const nameLow = slotName.toLowerCase();
      if (serpText.toLowerCase().includes(nameLow.split(' ')[0])) {
        return { fetchFailed: false, found: false, serpText: serpText.substring(0, 2000), text: null };
      }
    }
    return { fetchFailed: false, found: false, text: null };
  } catch (e) {
    console.warn(`[slot-ai] Provider site-search fetch failed: ${e.message}`);
    return { fetchFailed: true, found: false, text: null };
  }
}

// ═══════════════════════════════════════════════
// GOOGLE-GROUNDED SEARCH — for brand-new slots Gemini doesn't know yet
// Searches Google for the slot, scrapes top results, feeds to Gemini for parsing.
// ═══════════════════════════════════════════════

async function googleSlotSearch(apiKey, slotName) {
  try {
    // 1. Search Google for the slot's RTP/stats page
    const queries = [
      `"${slotName}" slot RTP volatility max win provider`,
      `"${slotName}" slot review RTP`,
    ];

    let pageTexts = [];

    for (const query of queries) {
      if (pageTexts.length >= 2) break;
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      const googleRes = await fetch(googleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!googleRes.ok) continue;

      const html = await googleRes.text();

      // Extract URLs from Google results
      const urlRx = /href="\/url\?q=(https?:\/\/[^&"]+)/g;
      const urls = [];
      let m;
      while ((m = urlRx.exec(html)) !== null && urls.length < 3) {
        const u = decodeURIComponent(m[1]);
        // Skip Google, YouTube, and image-only sites
        if (!/google\.|youtube\.|imgur\.|reddit\./i.test(u)) urls.push(u);
      }

      // Also extract text snippets directly from Google SERP
      const snippetClean = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (snippetClean.length > 200) {
        // Take the most relevant chunk (around 3000 chars)
        pageTexts.push(`[Google SERP for "${query}"]:\n${snippetClean.substring(0, 3000)}`);
      }

      // Try to fetch the first 1-2 result pages for more detail
      for (const url of urls.slice(0, 2)) {
        if (pageTexts.length >= 3) break;
        try {
          const pageRes = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SlotBot/1.0)' },
            redirect: 'follow',
            signal: AbortSignal.timeout(5000),
          });
          if (!pageRes.ok) continue;
          const ct = pageRes.headers.get('content-type') || '';
          if (!ct.includes('text/html')) continue;

          const pageHtml = await pageRes.text();
          // Strip scripts/styles, get text
          const text = pageHtml
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          if (text.length > 100) {
            pageTexts.push(`[Page: ${url}]:\n${text.substring(0, 3000)}`);
          }
        } catch (_) { /* timeout or fetch error — skip */ }
      }
    }

    if (!pageTexts.length) {
      console.log(`[slot-ai] Google search returned no usable content for "${slotName}"`);
      return null;
    }

    // 2. Feed page content to Gemini for extraction
    const extractPrompt = `I found these web pages about the slot game "${slotName}". Extract the slot data from them.

${pageTexts.join('\n\n---\n\n')}

Based on the above text, return ONLY a raw JSON object (no markdown, no backticks):

{
  "name": "Official full name",
  "provider": "Provider/studio name",
  "rtp": 96.50,
  "volatility": "low" | "medium" | "high" | "very_high",
  "max_win_multiplier": 5000,
  "features": ["Free Spins", "Multiplier", ...],
  "theme": "Theme/genre",
  "release_year": 2024,
  "twitch_safe": true
}

RULES:
- Extract ONLY data that is clearly stated in the text above
- rtp as a number (e.g. 96.50)
- max_win_multiplier as a number in x (e.g. 5000 means 5000x)
- volatility exactly: "low", "medium", "high", or "very_high"
- If a value is not clearly stated, use null
- Return ONLY the JSON`;

    console.log(`[slot-ai] Feeding ${pageTexts.length} page(s) to Gemini for "${slotName}"`);
    const extracted = await askGemini(apiKey, extractPrompt);
    if (!extracted || !extracted.name) return null;

    // Mark that this came from Google so the handler knows
    extracted._google = true;
    return extracted;
  } catch (e) {
    console.error('[slot-ai] Google-grounded search error:', e);
    return null;
  }
}

function normalizeVolatility(v) {
  if (typeof v !== 'string') return null;
  const low = v.toLowerCase().replace(/[^a-z]/g, '');
  if (low === 'low') return 'low';
  if (low === 'medium' || low === 'mediumhigh' || low === 'med') return 'medium';
  if (low === 'veryhigh' || low === 'extreme') return 'very_high';
  if (low === 'high') return 'high';
  return null;
}

function sanitize(parsed) {
  return {
    name: typeof parsed.name === 'string' ? parsed.name : null,
    provider: typeof parsed.provider === 'string' ? parsed.provider : null,
    rtp: typeof parsed.rtp === 'number' ? parsed.rtp : (typeof parsed.rtp === 'string' ? parseFloat(parsed.rtp) || null : null),
    volatility: normalizeVolatility(parsed.volatility),
    max_win_multiplier: typeof parsed.max_win_multiplier === 'number'
      ? parsed.max_win_multiplier : (typeof parsed.max_win_multiplier === 'string' ? parseFloat(parsed.max_win_multiplier) || null : null),
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
    // ── Step 1: Query Supabase slots table (8000+ real slots) ──
    const dbSlot = await searchSlotsDB(name);
    if (dbSlot) {
      const missingRtp = dbSlot.rtp == null;
      const missingMaxWin = dbSlot.max_win_multiplier == null;
      const missingVolatility = dbSlot.volatility == null;

      // If slot exists but is missing RTP / max win / volatility → ask Gemini for just those
      if ((missingRtp || missingMaxWin || missingVolatility) && apiKey) {
        console.log(`[slot-ai] Supabase hit "${dbSlot.name}" but missing: ${[missingRtp && 'rtp', missingMaxWin && 'max_win', missingVolatility && 'volatility'].filter(Boolean).join(', ')} → enriching via Gemini`);

        const enrichPrompt = `You are a slot game data expert. I need the official data for the online slot "${dbSlot.name}" by ${dbSlot.provider || 'unknown provider'}.
Return ONLY a raw JSON object (no markdown, no backticks):
{
  ${missingRtp ? '"rtp": 96.50,' : ''}
  ${missingMaxWin ? '"max_win_multiplier": 5000,' : ''}
  ${missingVolatility ? '"volatility": "high",' : ''}
  "found": true
}
RULES:
- rtp = official default RTP as a number (e.g. 96.50)
- max_win_multiplier = official max win in x (e.g. 5000 means 5000x)
- volatility = exactly "low", "medium", "high", or "very_high"
- If unsure about a value, use null — DO NOT GUESS`;

        const enriched = await askGemini(apiKey, enrichPrompt);
        if (enriched) {
          const updates = {};
          if (missingRtp && enriched.rtp != null) {
            const rtp = typeof enriched.rtp === 'number' ? enriched.rtp : parseFloat(enriched.rtp);
            if (rtp && rtp > 0 && rtp <= 100) { dbSlot.rtp = rtp; updates.rtp = rtp; }
          }
          if (missingMaxWin && enriched.max_win_multiplier != null) {
            const mw = typeof enriched.max_win_multiplier === 'number' ? enriched.max_win_multiplier : parseFloat(enriched.max_win_multiplier);
            if (mw && mw > 0) { dbSlot.max_win_multiplier = mw; updates.max_win_multiplier = mw; }
          }
          if (missingVolatility && enriched.volatility) {
            const vol = normalizeVolatility(enriched.volatility);
            if (vol) { dbSlot.volatility = vol; updates.volatility = vol; }
          }

          // Persist enriched values back to the DB so next lookup is instant
          if (Object.keys(updates).length > 0 && dbSlot._dbId) {
            const supabase = getSupabase();
            if (supabase) {
              const { error } = await supabase
                .from('slots')
                .update(updates)
                .eq('id', dbSlot._dbId);
              if (error) console.error('[slot-ai] DB update failed:', error.message);
              else console.log(`[slot-ai] Updated "${dbSlot.name}" in DB:`, updates);
            }
          }
        }
      } else {
        console.log(`[slot-ai] Supabase hit: "${name}" → ${dbSlot.name} by ${dbSlot.provider} (complete)`);
      }

      // Strip internal _dbId before sending to client
      const { _dbId, ...clientSlot } = dbSlot;
      return res.status(200).json(clientSlot);
    }

    // ── Step 2: Check hardcoded verified database (instant fallback) ──
    const known = findKnownSlot(name);
    if (known) {
      console.log(`[slot-ai] Hardcoded DB hit: "${name}" → ${known.name}`);
      return res.status(200).json({ ...known, source: 'verified_database' });
    }

    // ── Step 3: Ask Gemini with strict accuracy prompt ──
    console.log(`[slot-ai] DB miss for "${name}", asking Gemini...`);
    const prompt = `You are a slot game data expert. I need VERIFIED, REAL data for the online slot game "${name}".

IMPORTANT CONTEXT: Online slot games often have edgy, provocative, or controversial names
(e.g. "Golden Shower" by Nolimit City, "Serial" by Nolimit City, "Mental" by Nolimit City,
"Hot Ross" by Hacksaw Gaming, "Chaos Crew" by Hacksaw Gaming). These are LEGITIMATE casino
slot games made by licensed providers. Do NOT refuse to answer because of the name — just
return the factual game data.

The game might also be known by a slightly different name — find the closest official match.

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
- twitch_safe: false ONLY if the slot’s artwork contains nudity or sexual imagery. true for everything else (dark themes, violence, controversial names are all fine)
- If you are NOT SURE about a value, use null — DO NOT GUESS
- Return ONLY the JSON, nothing else`;

    let parsed = await askGemini(apiKey, prompt);

    // ── Step 4: If Gemini doesn't know it, try official provider website ──
    if (!parsed) {
      // First ask Gemini who makes this slot (quick, low-token call)
      const providerGuess = await askGemini(apiKey, `What provider/studio made the online slot game "${name}"? Reply with ONLY the provider name, nothing else. If unsure, reply "unknown".`);
      const guessedProvider = typeof providerGuess === 'string' ? providerGuess
        : providerGuess?.provider || providerGuess?.name || null;

      let providerHit = null;
      const provName = resolveProvider(guessedProvider);

      if (provName && getProviderSite(provName)) {
        console.log(`[slot-ai] Gemini guessed provider "${provName}" for "${name}", checking their site...`);
        const siteResult = await searchProviderSite(provName, name);

        if (siteResult.found && siteResult.text) {
          // Found on official site! Extract data with Gemini.
          const extractPrompt = `I found this page on the official ${provName} website about the slot "${name}".

[Page: ${siteResult.url}]:
${siteResult.text}

Extract the slot data. Return ONLY a raw JSON object (no markdown, no backticks):
{
  "name": "Official full name",
  "provider": "${provName}",
  "rtp": 96.50,
  "volatility": "low" | "medium" | "high" | "very_high",
  "max_win_multiplier": 5000,
  "features": ["Free Spins", "Multiplier", ...],
  "theme": "Theme/genre",
  "release_year": 2024,
  "twitch_safe": true
}
RULES:
- Extract ONLY data clearly stated in the text above
- rtp as a number, max_win_multiplier as a number in x
- volatility exactly: "low", "medium", "high", or "very_high"
- If a value is not clearly stated, use null
- Return ONLY the JSON`;

          providerHit = await askGemini(apiKey, extractPrompt);
          if (providerHit) {
            providerHit._providerSite = true;
            parsed = providerHit;
            console.log(`[slot-ai] ✅ Extracted from provider site: ${siteResult.url}`);
          }
        } else if (siteResult.fetchFailed) {
          // Provider site blocked/timeout → fall back to Google
          console.log(`[slot-ai] Provider site fetch failed for "${name}", falling back to Google...`);
          const googleResult = await googleSlotSearch(apiKey, name);
          if (googleResult) {
            parsed = googleResult;
          }
        } else {
          // Slot NOT FOUND on provider site → don't Google, it's not a real slot
          console.log(`[slot-ai] "${name}" not found on ${provName} site — stopping search`);
        }
      } else {
        // Unknown provider → try Google as last resort
        console.log(`[slot-ai] Unknown provider for "${name}", trying Google-grounded search...`);
        const googleResult = await googleSlotSearch(apiKey, name);
        if (googleResult) {
          parsed = googleResult;
        }
      }

      if (!parsed) {
        return res.status(200).json({ error: null, name, source: 'not_found' });
      }
    }

    const result = sanitize(parsed);
    result.source = parsed._providerSite ? 'provider_site' : (parsed._google ? 'google_ai' : 'gemini_ai');

    // Override twitch_safe for known-safe providers
    const provSafe = isProviderSafe(result.provider);
    if (provSafe === true) result.twitch_safe = true;

    // ── Auto-add new slot to the database so next lookup is instant ──
    if (result.name && result.provider) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { error: insErr } = await supabase
            .from('slots')
            .insert({
              name: result.name,
              provider: result.provider,
              rtp: result.rtp || null,
              volatility: result.volatility || null,
              max_win_multiplier: result.max_win_multiplier || null,
              theme: result.theme || null,
              features: result.features?.length ? result.features : null,
              status: 'live',
            });
          if (insErr) {
            // Duplicate name? Just log, don't fail the response
            console.warn('[slot-ai] DB insert skipped:', insErr.message);
          } else {
            console.log(`[slot-ai] ✅ Added "${result.name}" by ${result.provider} to slots DB`);
            result.source = result.source === 'google_ai' ? 'google_ai_saved'
                         : result.source === 'provider_site' ? 'provider_saved'
                         : 'gemini_ai_saved';
          }
        } catch (e) {
          console.error('[slot-ai] DB insert error:', e);
        }
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[slot-ai] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
