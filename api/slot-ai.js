// Vercel Serverless Function: /api/slot-ai
// Pipeline: Supabase DB (8000+) â†’ Gemini AI (with live Google Search grounding) â†’ Cross-match DB.
// New slots found by AI are auto-saved to the DB. Missing RTP/max_win are enriched via Gemini.
// Requires GEMINI_API_KEY + SUPABASE env vars in Vercel project settings.

import { createClient } from '@supabase/supabase-js';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PROVIDERS ALWAYS SAFE FOR TWITCH (controversial names, safe imagery)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const SAFE_PROVIDERS = [
  'nolimit city', 'nolimit', 'hacksaw gaming', 'hacksaw',
  'pragmatic play', 'pragmatic', 'push gaming',
  'big time gaming', 'btg', 'elk studios', 'elk',
  'thunderkick', 'relax gaming', 'red tiger gaming', 'red tiger',
  'blueprint gaming', 'quickspin', 'yggdrasil gaming', 'yggdrasil',
  'play\'n go', 'playngo', 'netent', 'evolution',
  'gamomat', 'kalamba games', 'avatarux', 'fantasma games',
  'print studios', '3 oaks gaming', '3 oaks', 'wazdan', 'spinomenal',
  'booming games', 'gameart', 'endorphina', 'habanero',
  'bgaming', 'playson', 'playtech', 'igt', 'microgaming',
  'evoplay entertainment', 'evoplay', 'stakelogic', 'swintt',
  'novomatic', 'betsoft gaming', 'betsoft', 'isoftbet', 'pg soft',
  'peter & sons', 'tom horn gaming', 'slotmill', 'gaming corps',
  'booongo', 'kalamba', 'spribe', 'spadegaming', 'foxium',
  'greentube', 'synot games', 'tada gaming', 'wizard games',
  'winfast games', 'reelplay', 'northern lights gaming',
  'skywind group', 'mancala gaming', 'mascot gaming',
  'platipus gaming', 'octoplay', 'golden hero',
  'high 5 games', 'rubyplay', 'belatra games',
];

function isProviderSafe(provider) {
  if (!provider) return null;
  const low = provider.toLowerCase().trim();
  return SAFE_PROVIDERS.some(p => low.includes(p) || p.includes(low)) ? true : null;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SUPABASE â€” query your 8000+ slots database
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
    _dbId: row.id,       // internal â€” used to update the row if we enrich missing data
    name: canonicalSlotName(row.name),
    provider: canonicalProvider(row.provider) || row.provider,
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HELPERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Call Gemini AI. If useGrounding = true, enables Google Search tool
 * so Gemini can look up real-time info (new slots, recent releases).
 */
async function askGemini(apiKey, prompt, { useGrounding = false, maxTokens = 600 } = {}) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.05, maxOutputTokens: maxTokens },
  };

  // Enable Google Search grounding for real-time web data
  if (useGrounding) {
    body.tools = [{ google_search: {} }];
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[slot-ai] Gemini error:', response.status, errText);
    return null;
  }

  const data = await response.json();

  // With grounding, the response may have multiple parts â€” find the text part
  const parts = data?.candidates?.[0]?.content?.parts || [];
  let raw = '';
  for (const part of parts) {
    if (part.text) { raw += part.text; }
  }
  raw = raw.trim();
  if (!raw) {
    console.error('[slot-ai] Gemini returned empty response');
    return null;
  }
  // Strip markdown code fences if present
  if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  // Sometimes the model wraps the JSON in some text â€” try to extract JSON block
  if (!raw.startsWith('{')) {
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      raw = raw.substring(jsonStart, jsonEnd + 1);
    }
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('[slot-ai] Gemini JSON parse failed:', e.message, 'Raw:', raw.substring(0, 300));
    return null;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PROVIDER OFFICIAL WEBSITES â€” maps to game catalog URLs
// Search here first for safety & accuracy before Google.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const PROVIDER_SITES = {
  // â”€â”€ Major Studios â”€â”€
  'pragmatic play':        { domain: 'pragmaticplay.com',         search: s => `https://www.pragmaticplay.com/en/games/?game=${encodeURIComponent(s)}`, direct: s => `https://www.pragmaticplay.com/en/games/${s}/` },
  'hacksaw gaming':        { domain: 'hacksawgaming.com',         search: s => `https://www.hacksawgaming.com/games`,                                   direct: s => `https://www.hacksawgaming.com/games/${s}` },
  'nolimit city':          { domain: 'nolimitcity.com',           search: s => `https://www.nolimitcity.com/games/`,                                    direct: s => `https://www.nolimitcity.com/games/${s}` },
  "play'n go":             { domain: 'playngo.com',               search: s => `https://www.playngo.com/games`,                                         direct: s => `https://www.playngo.com/games/${s}` },
  'push gaming':           { domain: 'pushgaming.com',            search: s => `https://www.pushgaming.com/games`,                                      direct: s => `https://www.pushgaming.com/games/${s}` },
  'big time gaming':       { domain: 'bigtimegaming.com',         search: s => `https://www.bigtimegaming.com/games/`,                                  direct: s => `https://www.bigtimegaming.com/games/${s}/` },
  'elk studios':           { domain: 'elk-studios.com',           search: s => `https://www.elk-studios.com/games/`,                                    direct: s => `https://www.elk-studios.com/game/${s}/` },
  'relax gaming':          { domain: 'relax-gaming.com',          search: s => `https://www.relax-gaming.com/games`,                                    direct: s => `https://www.relax-gaming.com/games/${s}` },
  'red tiger gaming':      { domain: 'redtigergaming.com',        search: s => `https://www.redtigergaming.com/games`,                                  direct: s => `https://www.redtigergaming.com/games/${s}` },
  'netent':                { domain: 'netent.com',                search: s => `https://www.netent.com/en/games/`,                                      direct: s => `https://www.netent.com/en/games/${s}/` },
  'thunderkick':           { domain: 'thunderkick.com',           search: s => `https://www.thunderkick.com/games`,                                     direct: s => `https://www.thunderkick.com/games/${s}` },
  'quickspin':             { domain: 'quickspin.com',             search: s => `https://www.quickspin.com/slots/`,                                      direct: s => `https://www.quickspin.com/slots/${s}/` },
  'yggdrasil gaming':      { domain: 'yggdrasilgaming.com',       search: s => `https://www.yggdrasilgaming.com/games`,                                 direct: s => `https://www.yggdrasilgaming.com/games/${s}` },
  'blueprint gaming':      { domain: 'blueprintgaming.com',       search: s => `https://www.blueprintgaming.com/game-catalogue`,                        direct: s => `https://www.blueprintgaming.com/game/${s}` },
  'evolution':             { domain: 'evolution.com',             search: s => `https://www.evolution.com/games`,                                       direct: s => `https://www.evolution.com/games/${s}` },
  'playtech':              { domain: 'playtech.com',              search: s => `https://www.playtech.com/games`,                                        direct: s => `https://www.playtech.com/games/${s}` },
  'igt':                   { domain: 'igt.com',                   search: s => `https://www.igt.com/games`,                                             direct: s => `https://www.igt.com/games/${s}` },
  'microgaming':           { domain: 'gamesglobal.com',           search: s => `https://www.gamesglobal.com/games`,                                     direct: s => `https://www.gamesglobal.com/games/${s}` },
  // â”€â”€ A â”€â”€
  '1x2gaming':             { domain: '1x2gaming.com',             search: s => `https://www.1x2gaming.com/slots`,                                      direct: s => `https://www.1x2gaming.com/slots/${s}` },
  '2by2 gaming':           { domain: '2by2gaming.com',            search: s => `https://www.2by2gaming.com/games`,                                      direct: s => `https://www.2by2gaming.com/games/${s}` },
  '4theplayer':            { domain: '4theplayer.com',            search: s => `https://www.4theplayer.com/games`,                                      direct: s => `https://www.4theplayer.com/games/${s}` },
  'alea':                  { domain: 'alea.com',                  search: s => `https://alea.com/games`,                                                direct: s => `https://alea.com/games/${s}` },
  'ainsworth':             { domain: 'ainsworth.com',             search: s => `https://www.ainsworth.com/games`,                                       direct: s => `https://www.ainsworth.com/games/${s}` },
  'all41 studios':         { domain: 'all41studios.com',          search: s => `https://all41studios.com/games`,                                        direct: s => `https://all41studios.com/games/${s}` },
  'allwayspin':            { domain: 'allwayspin.com',            search: s => `https://allwayspin.com/games`,                                          direct: s => `https://allwayspin.com/games/${s}` },
  'alchemy gaming':        { domain: 'alchemygaming.co',          search: s => `https://alchemygaming.co/games`,                                        direct: s => `https://alchemygaming.co/games/${s}` },
  'amatic industries':     { domain: 'amatic.com',               search: s => `https://www.amatic.com/games`,                                          direct: s => `https://www.amatic.com/games/${s}` },
  'amigo gaming':          { domain: 'amigo-gaming.com',          search: s => `https://www.amigo-gaming.com/games`,                                    direct: s => `https://www.amigo-gaming.com/games/${s}` },
  'amusnet':               { domain: 'amusnet.com',              search: s => `https://www.amusnet.com/games`,                                         direct: s => `https://www.amusnet.com/games/${s}` },
  'apparat gaming':        { domain: 'apparatgaming.com',         search: s => `https://apparatgaming.com/games`,                                       direct: s => `https://apparatgaming.com/games/${s}` },
  'arrows edge':           { domain: 'arrowsega.com',            search: s => `https://es.arrowsega.com/games`,                                        direct: s => `https://es.arrowsega.com/games/${s}` },
  'asia gaming':           { domain: 'asiagaming.com',            search: s => `https://www.asiagaming.com/games`,                                      direct: s => `https://www.asiagaming.com/games/${s}` },
  'authentic gaming':      { domain: 'authenticgaming.com',       search: s => `https://authenticgaming.com/games`,                                     direct: s => `https://authenticgaming.com/games/${s}` },
  'avatarux':              { domain: 'avatarux.com',              search: s => `https://avatarux.com/games/`,                                           direct: s => `https://avatarux.com/games/${s}/` },
  // â”€â”€ B â”€â”€
  "bally's interactive":   { domain: 'ballys.com',               search: s => `https://www.ballys.com/games`,                                          direct: s => `https://www.ballys.com/games/${s}` },
  'bang bang games':        { domain: 'bangbanggames.com',         search: s => `https://bangbanggames.com/games`,                                       direct: s => `https://bangbanggames.com/games/${s}` },
  'barcrest':              { domain: 'barcrestgames.com',         search: s => `https://www.barcrestgames.com/games`,                                   direct: s => `https://www.barcrestgames.com/games/${s}` },
  'besoft gaming':         { domain: 'besoftgaming.com',          search: s => `https://besoftgaming.com/games`,                                        direct: s => `https://besoftgaming.com/games/${s}` },
  'belatra games':         { domain: 'belatra.com',              search: s => `https://belatra.com/games`,                                             direct: s => `https://belatra.com/games/${s}` },
  'betgames':              { domain: 'betgames.tv',              search: s => `https://betgames.tv/games`,                                             direct: s => `https://betgames.tv/games/${s}` },
  'betixon':               { domain: 'betixon.com',              search: s => `https://betixon.com/games`,                                             direct: s => `https://betixon.com/games/${s}` },
  'betsoft gaming':        { domain: 'betsoft.com',              search: s => `https://www.betsoft.com/games`,                                          direct: s => `https://www.betsoft.com/game/${s}` },
  'bgaming':               { domain: 'bgaming.com',              search: s => `https://www.bgaming.com/games`,                                         direct: s => `https://www.bgaming.com/games/${s}` },
  'booming games':         { domain: 'booming-games.com',         search: s => `https://www.booming-games.com/games`,                                   direct: s => `https://www.booming-games.com/games/${s}` },
  'booongo':               { domain: 'booongo.com',              search: s => `https://booongo.com/games`,                                             direct: s => `https://booongo.com/games/${s}` },
  'bragg gaming group':    { domain: 'bragg.games',              search: s => `https://bragg.games/games`,                                             direct: s => `https://bragg.games/games/${s}` },
  // â”€â”€ C â”€â”€
  'caleta gaming':         { domain: 'caletagaming.com',          search: s => `https://caletagaming.com/games`,                                        direct: s => `https://caletagaming.com/games/${s}` },
  'ct gaming':             { domain: 'ct-gaming.com',             search: s => `https://www.ct-gaming.com/games`,                                       direct: s => `https://www.ct-gaming.com/games/${s}` },
  'cayetano gaming':       { domain: 'cayetanogaming.com',        search: s => `https://cayetanogaming.com/games`,                                      direct: s => `https://cayetanogaming.com/games/${s}` },
  'clawbuster':            { domain: 'clawbuster.com',           search: s => `https://clawbuster.com/games`,                                          direct: s => `https://clawbuster.com/games/${s}` },
  'croco gaming':          { domain: 'crocogaming.com',           search: s => `https://crocogaming.com/games`,                                         direct: s => `https://crocogaming.com/games/${s}` },
  // â”€â”€ D â”€â”€
  'design works gaming':   { domain: 'designworksgaming.com',     search: s => `https://www.designworksgaming.com/games`,                               direct: s => `https://www.designworksgaming.com/games/${s}` },
  'dragon soft':           { domain: 'dragoonsoft.com',           search: s => `https://dragoonsoft.com/games`,                                         direct: s => `https://dragoonsoft.com/games/${s}` },
  'dreamtech gaming':      { domain: 'dreamtechgaming.com',       search: s => `https://dreamtechgaming.com/games`,                                     direct: s => `https://dreamtechgaming.com/games/${s}` },
  // â”€â”€ E â”€â”€
  'endorphina':            { domain: 'endorphina.com',            search: s => `https://endorphina.com/games`,                                          direct: s => `https://endorphina.com/games/${s}` },
  'espresso games':        { domain: 'espressogames.it',          search: s => `https://espressogames.it/games`,                                        direct: s => `https://espressogames.it/games/${s}` },
  'evoplay entertainment': { domain: 'evoplay.games',             search: s => `https://evoplay.games/games`,                                           direct: s => `https://evoplay.games/games/${s}` },
  'ezugi':                 { domain: 'ezugi.com',                search: s => `https://ezugi.com/games`,                                               direct: s => `https://ezugi.com/games/${s}` },
  // â”€â”€ F â”€â”€
  'fantasma games':        { domain: 'fantasmagames.com',         search: s => `https://fantasmagames.com/games`,                                       direct: s => `https://fantasmagames.com/games/${s}` },
  'fazi interactive':      { domain: 'fazi.games',                search: s => `https://fazi.games/games`,                                              direct: s => `https://fazi.games/games/${s}` },
  'foxium':                { domain: 'foxium.com',               search: s => `https://foxium.com/games`,                                              direct: s => `https://foxium.com/games/${s}` },
  'fugaso':                { domain: 'fugaso.com',               search: s => `https://fugaso.com/games`,                                              direct: s => `https://fugaso.com/games/${s}` },
  // â”€â”€ G â”€â”€
  'gameart':               { domain: 'gameart.net',              search: s => `https://gameart.net/slot-games.html`,                                    direct: s => `https://gameart.net/slot-game/${s}.html` },
  'gaming corps':          { domain: 'gamingcorps.com',           search: s => `https://gamingcorps.com/games`,                                         direct: s => `https://gamingcorps.com/games/${s}` },
  'gamomat':               { domain: 'gamomat.com',              search: s => `https://www.gamomat.com/games`,                                         direct: s => `https://www.gamomat.com/games/${s}` },
  'givme games':           { domain: 'givmegames.com',           search: s => `https://givmegames.com/games`,                                          direct: s => `https://givmegames.com/games/${s}` },
  'golden hero':           { domain: 'goldenhero.io',            search: s => `https://goldenhero.io/games`,                                           direct: s => `https://goldenhero.io/games/${s}` },
  'greentube':             { domain: 'greentube.com',            search: s => `https://www.greentube.com/games`,                                       direct: s => `https://www.greentube.com/games/${s}` },
  // â”€â”€ H â”€â”€
  'habanero':              { domain: 'habanero.com',             search: s => `https://habanero.com/en/games`,                                         direct: s => `https://habanero.com/en/games/${s}` },
  'high 5 games':          { domain: 'high5games.com',            search: s => `https://www.high5games.com/games`,                                      direct: s => `https://www.high5games.com/games/${s}` },
  'hogaming':              { domain: 'hogaming.com',             search: s => `https://hogaming.com/games`,                                            direct: s => `https://hogaming.com/games/${s}` },
  // â”€â”€ I â”€â”€
  'imagine live':          { domain: 'imaginelive.com',           search: s => `https://imaginelive.com/games`,                                         direct: s => `https://imaginelive.com/games/${s}` },
  'inbet games':           { domain: 'inbetgames.com',           search: s => `https://inbetgames.com/games`,                                          direct: s => `https://inbetgames.com/games/${s}` },
  'isoftbet':              { domain: 'isoftbet.com',             search: s => `https://www.isoftbet.com/games`,                                        direct: s => `https://www.isoftbet.com/game/${s}` },
  // â”€â”€ K â”€â”€
  'kalamba games':         { domain: 'kalambagames.com',          search: s => `https://kalambagames.com/games`,                                        direct: s => `https://kalambagames.com/games/${s}` },
  'ka gaming':             { domain: 'kagaming.com',             search: s => `https://kagaming.com/games`,                                            direct: s => `https://kagaming.com/games/${s}` },
  // â”€â”€ L â”€â”€
  'leap gaming':           { domain: 'leap-gaming.com',           search: s => `https://leap-gaming.com/games`,                                         direct: s => `https://leap-gaming.com/games/${s}` },
  'leander games':         { domain: 'leandergames.com',          search: s => `https://leandergames.com/games`,                                        direct: s => `https://leandergames.com/games/${s}` },
  'lightning box games':   { domain: 'lightningboxgames.com',     search: s => `https://lightningboxgames.com/games`,                                   direct: s => `https://lightningboxgames.com/games/${s}` },
  'live88':                { domain: 'live88.io',                search: s => `https://live88.io/games`,                                               direct: s => `https://live88.io/games/${s}` },
  // â”€â”€ M â”€â”€
  'mancala gaming':        { domain: 'mancalagaming.com',         search: s => `https://mancalagaming.com/games`,                                       direct: s => `https://mancalagaming.com/games/${s}` },
  'mascot gaming':         { domain: 'mascot.games',             search: s => `https://mascot.games/games`,                                            direct: s => `https://mascot.games/games/${s}` },
  'mga games':             { domain: 'mgagames.com',             search: s => `https://mgagames.com/games`,                                            direct: s => `https://mgagames.com/games/${s}` },
  'mobilots':              { domain: 'mobilots.com',             search: s => `https://mobilots.com/games`,                                            direct: s => `https://mobilots.com/games/${s}` },
  // â”€â”€ N â”€â”€
  'netgame entertainment': { domain: 'netgame-entertainment.com', search: s => `https://netgame-entertainment.com/games`,                               direct: s => `https://netgame-entertainment.com/games/${s}` },
  'northern lights gaming':{ domain: 'northernlightsgaming.com',  search: s => `https://northernlightsgaming.com/games`,                                direct: s => `https://northernlightsgaming.com/games/${s}` },
  'novomatic':             { domain: 'novomatic.com',            search: s => `https://www.novomatic.com/games`,                                       direct: s => `https://www.novomatic.com/games/${s}` },
  // â”€â”€ O â”€â”€
  '3 oaks gaming':         { domain: '3oaksgaming.com',           search: s => `https://3oaksgaming.com/games/`,                                        direct: s => `https://3oaksgaming.com/games/${s}` },
  'octoplay':              { domain: 'octoplay.com',             search: s => `https://octoplay.com/games`,                                            direct: s => `https://octoplay.com/games/${s}` },
  'onlyplay':              { domain: 'onlyplay.io',              search: s => `https://onlyplay.io/games`,                                             direct: s => `https://onlyplay.io/games/${s}` },
  'oryx gaming':           { domain: 'oryxgaming.com',            search: s => `https://oryxgaming.com/games`,                                          direct: s => `https://oryxgaming.com/games/${s}` },
  // â”€â”€ P â”€â”€
  'peter & sons':          { domain: 'peterandsons.com',          search: s => `https://peterandsons.com/games`,                                        direct: s => `https://peterandsons.com/games/${s}` },
  'pg soft':               { domain: 'pocketgamessoft.com',       search: s => `https://www.pocketgamessoft.com/games`,                                 direct: s => `https://www.pocketgamessoft.com/games/${s}` },
  'platipus gaming':       { domain: 'platipusgaming.com',        search: s => `https://platipusgaming.com/games`,                                      direct: s => `https://platipusgaming.com/games/${s}` },
  'playson':               { domain: 'playson.com',              search: s => `https://playson.com/games`,                                             direct: s => `https://playson.com/games/${s}` },
  'print studios':         { domain: 'printstudios.com',          search: s => `https://www.printstudios.com/games`,                                    direct: s => `https://www.printstudios.com/games/${s}` },
  // â”€â”€ R â”€â”€
  'reelplay':              { domain: 'reelplay.com',             search: s => `https://reelplay.com/games`,                                            direct: s => `https://reelplay.com/games/${s}` },
  'reelnrg':               { domain: 'reelnrg.com',              search: s => `https://reelnrg.com/games`,                                             direct: s => `https://reelnrg.com/games/${s}` },
  'rubyplay':              { domain: 'rubyplay.com',             search: s => `https://www.rubyplay.com/games`,                                        direct: s => `https://www.rubyplay.com/games/${s}` },
  // â”€â”€ S â”€â”€
  'slotmill':              { domain: 'slotmill.com',             search: s => `https://www.slotmill.com/games`,                                        direct: s => `https://www.slotmill.com/games/${s}` },
  'spadegaming':           { domain: 'spadegaming.com',           search: s => `https://www.spadegaming.com/games`,                                     direct: s => `https://www.spadegaming.com/games/${s}` },
  'spinomenal':            { domain: 'spinomenal.com',            search: s => `https://www.spinomenal.com/games`,                                      direct: s => `https://www.spinomenal.com/games/${s}` },
  'spribe':                { domain: 'spribe.co',                search: s => `https://spribe.co/games`,                                               direct: s => `https://spribe.co/games/${s}` },
  'stakelogic':            { domain: 'stakelogic.com',            search: s => `https://stakelogic.com/games`,                                          direct: s => `https://stakelogic.com/games/${s}` },
  'stormcraft studios':    { domain: 'stormcraftstudios.com',     search: s => `https://stormcraftstudios.com/games`,                                   direct: s => `https://stormcraftstudios.com/games/${s}` },
  'swintt':                { domain: 'swintt.com',               search: s => `https://swintt.com/games`,                                              direct: s => `https://swintt.com/games/${s}` },
  'synot games':           { domain: 'synotgames.com',            search: s => `https://synotgames.com/games`,                                          direct: s => `https://synotgames.com/games/${s}` },
  'skywind group':         { domain: 'skywindgroup.com',          search: s => `https://skywindgroup.com/games`,                                        direct: s => `https://skywindgroup.com/games/${s}` },
  'sg digital':            { domain: 'sgdigital.com',            search: s => `https://www.sgdigital.com/games`,                                       direct: s => `https://www.sgdigital.com/games/${s}` },
  // â”€â”€ T â”€â”€
  'tom horn gaming':       { domain: 'tomhorngaming.com',         search: s => `https://www.tomhorngaming.com/games`,                                   direct: s => `https://www.tomhorngaming.com/games/${s}` },
  'tada gaming':           { domain: 'tadagaming.com',            search: s => `https://tadagaming.com/games`,                                          direct: s => `https://tadagaming.com/games/${s}` },
  // â”€â”€ U / V â”€â”€
  'upgaming':              { domain: 'upgaming.com',             search: s => `https://upgaming.com/games`,                                            direct: s => `https://upgaming.com/games/${s}` },
  'vela gaming':           { domain: 'velagaming.io',            search: s => `https://velagaming.io/games`,                                           direct: s => `https://velagaming.io/games/${s}` },
  // â”€â”€ W â”€â”€
  'wazdan':                { domain: 'wazdan.com',               search: s => `https://wazdan.com/en/games`,                                           direct: s => `https://wazdan.com/en/games/${s}` },
  'winfast games':         { domain: 'winfast.games',            search: s => `https://winfast.games/games`,                                           direct: s => `https://winfast.games/games/${s}` },
  'wizard games':          { domain: 'wizardgamesglobal.com',     search: s => `https://wizardgamesglobal.com/games`,                                   direct: s => `https://wizardgamesglobal.com/games/${s}` },
  // â”€â”€ Y / Z â”€â”€
  'zillion games':         { domain: 'zilliongames.io',          search: s => `https://zilliongames.io/games`,                                         direct: s => `https://zilliongames.io/games/${s}` },
  'zitro digital':         { domain: 'zitrogames.com',           search: s => `https://zitrogames.com/games`,                                          direct: s => `https://zitrogames.com/games/${s}` },
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CANONICAL PROVIDER NAMES â€” for consistent Title Case everywhere
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const CANONICAL_PROVIDERS = {
  '1spin4win':            '1spin4win',
  '1x2gaming':            '1X2gaming',
  '1x2 gaming':           '1X2gaming',
  '18peaches':            '18Peaches',
  '2by2 gaming':          '2by2 Gaming',
  '3 oaks gaming':        '3 Oaks Gaming',
  '3 oaks':               '3 Oaks Gaming',
  '3oaks':                '3 Oaks Gaming',
  '4theplayer':           '4ThePlayer',
  'alea':                 'Alea',
  'ainsworth':            'Ainsworth',
  'aiwin games':          'Aiwin Games',
  'all41 studios':        'All41 Studios',
  'allwayspin':           'AllWaySpin',
  'alchemy gaming':       'Alchemy Gaming',
  'amatic industries':    'Amatic Industries',
  'amatic':               'Amatic Industries',
  'amigo gaming':         'Amigo Gaming',
  'amusnet':              'Amusnet',
  'egt':                  'Amusnet',
  'apollo games':         'Apollo Games',
  'apparat gaming':       'Apparat Gaming',
  'arcade studio':        'Arcade Studio',
  'arrows edge':          'Arrows Edge',
  'armadillo studios':    'Armadillo Studios',
  'asia gaming':          'Asia Gaming',
  'asiasoft':             'AsiaSoft',
  'authentic gaming':     'Authentic Gaming',
  'avatarux':             'AvatarUX',
  'azur gaming':          'AZUR Gaming',
  'backseat gaming':      'Backseat Gaming',
  "bally's interactive":  "Bally's Interactive",
  'ballys':               "Bally's Interactive",
  'bang bang games':       'Bang Bang Games',
  'barcrest':             'Barcrest',
  'besoft gaming':        'BeSoft Gaming',
  'belatra games':        'Belatra Games',
  'belatra':              'Belatra Games',
  'betgames':             'BetGames',
  'betixon':              'Betixon',
  'betsoft gaming':       'Betsoft Gaming',
  'betsoft':              'Betsoft Gaming',
  'bgaming':              'BGaming',
  'big time gaming':      'Big Time Gaming',
  'btg':                  'Big Time Gaming',
  'black cat games':      'Black Cat Games',
  'blitz gaming':         'Blitz Gaming',
  'blueprint gaming':     'Blueprint Gaming',
  'blueprint':            'Blueprint Gaming',
  'boom master':          'Boom Master',
  'boom pot':             'Boom Pot',
  'booming games':        'Booming Games',
  'booming':              'Booming Games',
  'booongo':              'Booongo',
  'bragg gaming group':   'Bragg Gaming Group',
  'bragg':                'Bragg Gaming Group',
  'bullshark games':      'Bullshark Games',
  'caleta gaming':        'Caleta Gaming',
  'capecod':              'Capecod',
  'casino technology':    'CT Gaming',
  'ct gaming':            'CT Gaming',
  'cayetano gaming':      'Cayetano Gaming',
  'clawbuster':           'Clawbuster',
  'connective games':     'Connective Games',
  'crazy tooth studio':   'Crazy Tooth Studio',
  'croco gaming':         'Croco Gaming',
  'design works gaming':  'Design Works Gaming',
  'digiwheel':            'DigiWheel',
  'dragon gaming':        'Dragon Gaming',
  'dragon soft':          'Dragon Soft',
  'dragoonsoft':          'Dragon Soft',
  'dreamtech gaming':     'Dreamtech Gaming',
  'elk studios':          'ELK Studios',
  'elk':                  'ELK Studios',
  'endorphina':           'Endorphina',
  'espresso games':       'Espresso Games',
  'evolution':            'Evolution',
  'evoplay entertainment':'Evoplay Entertainment',
  'evoplay':              'Evoplay Entertainment',
  'ezugi':                'Ezugi',
  'fa chai':              'Fa Chai',
  'fantasma games':       'Fantasma Games',
  'fantasma':             'Fantasma Games',
  'fazi interactive':     'Fazi Interactive',
  'fazi':                 'Fazi Interactive',
  'four leaf gaming':     'Four Leaf Gaming',
  'foxium':               'Foxium',
  'freespin games':       'FreeSpin Games',
  'fugaso':               'Fugaso',
  'gameart':              'GameArt',
  'gaming corps':         'Gaming Corps',
  'gamomat':              'Gamomat',
  'givme games':          'Givme Games',
  'golden hero':          'Golden Hero',
  'greentube':            'Greentube',
  'habanero':             'Habanero',
  'hacksaw gaming':       'Hacksaw Gaming',
  'hacksaw':              'Hacksaw Gaming',
  'high 5 games':         'High 5 Games',
  'hogaming':             'HoGaming',
  'igt':                  'IGT',
  'igaming tech':         'IGaming Tech',
  'imagine live':         'Imagine Live',
  'inbet games':          'inBET Games',
  'iplay77':              'iPlay77',
  'isoftbet':             'iSoftBet',
  'jaywalk gaming':       'Jaywalk Gaming',
  'ka gaming':            'KA Gaming',
  'kalamba games':        'Kalamba Games',
  'kalamba':              'Kalamba Games',
  'kit studios':          'KIT Studios',
  'kitsune studios':      'KIT Studios',
  'leap gaming':          'Leap Gaming',
  'leander games':        'Leander Games',
  'lightning box games':  'Lightning Box Games',
  'lightning box':        'Lightning Box Games',
  'live88':               'Live88',
  'light & wonder':       'Light & Wonder',
  'nextgen gaming':       'Light & Wonder',
  'mancala gaming':       'Mancala Gaming',
  'mascot gaming':        'Mascot Gaming',
  'mga games':            'MGA Games',
  'microgaming':          'Microgaming',
  'quickfire':            'Microgaming',
  'games global':         'Microgaming',
  'mobilots':             'Mobilots',
  'netent':               'NetEnt',
  'net entertainment':    'NetEnt',
  'netgame entertainment':'NetGame Entertainment',
  'netgame':              'NetGame Entertainment',
  'nolimit city':         'Nolimit City',
  'nolimit':              'Nolimit City',
  'nolimitcity':          'Nolimit City',
  'northern lights gaming':'Northern Lights Gaming',
  'novomatic':            'Novomatic',
  'octoplay':             'Octoplay',
  'onlyplay':             'Onlyplay',
  'oryx gaming':          'Oryx Gaming',
  'peter & sons':         'Peter & Sons',
  'peter and sons':       'Peter & Sons',
  'pg soft':              'PG Soft',
  'pgsoft':               'PG Soft',
  'pocketgames':          'PG Soft',
  'pocket games soft':    'PG Soft',
  'platipus gaming':      'Platipus Gaming',
  'platipus':             'Platipus Gaming',
  "play'n go":            "Play'n GO",
  'playngo':              "Play'n GO",
  'playson':              'Playson',
  'playtech':             'Playtech',
  'pragmatic play':       'Pragmatic Play',
  'pragmatic':            'Pragmatic Play',
  'ppgames':              'Pragmatic Play',
  'print studios':        'Print Studios',
  'push gaming':          'Push Gaming',
  'quickspin':            'Quickspin',
  'red tiger gaming':     'Red Tiger Gaming',
  'red tiger':            'Red Tiger Gaming',
  'reelplay':             'ReelPlay',
  'reelnrg':              'ReelNRG',
  'relax gaming':         'Relax Gaming',
  'relax':                'Relax Gaming',
  'rlx':                  'Relax Gaming',
  'rubyplay':             'RubyPlay',
  'sg digital':           'SG Digital',
  'scientific games':     'SG Digital',
  'slotmill':             'Slotmill',
  'spadegaming':          'Spadegaming',
  'spinomenal':           'Spinomenal',
  'spribe':               'Spribe',
  'stakelogic':           'Stakelogic',
  'stormcraft studios':   'Stormcraft Studios',
  'swintt':               'Swintt',
  'synot games':          'SYNOT Games',
  'skywind group':        'Skywind Group',
  'skywind':              'Skywind Group',
  'tada gaming':          'TaDa Gaming',
  'thunderkick':          'Thunderkick',
  'tom horn gaming':      'Tom Horn Gaming',
  'tom horn':             'Tom Horn Gaming',
  'upgaming':             'Upgaming',
  'vela gaming':          'Vela Gaming',
  'wazdan':               'Wazdan',
  'winfast games':        'WinFast Games',
  'winfast':              'WinFast Games',
  'wizard games':         'Wizard Games',
  'yggdrasil gaming':     'Yggdrasil Gaming',
  'yggdrasil':            'Yggdrasil Gaming',
  'zeusplay':             'ZeusPlay',
  'zillion games':        'Zillion Games',
  'zitro digital':        'Zitro Digital',
};

/**
 * Get the canonical (properly capitalized) provider name.
 * Falls back to Title Case if not in the map.
 */
function canonicalProvider(provider) {
  if (!provider) return null;
  const low = provider.toLowerCase().trim();
  if (CANONICAL_PROVIDERS[low]) return CANONICAL_PROVIDERS[low];
  // Fallback: Title Case each word
  return low.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Properly capitalize a slot name.
 * Keeps roman numerals uppercase, handles common patterns like "xWays", "xBomb" etc.
 */
function canonicalSlotName(name) {
  if (!name || typeof name !== 'string') return name;
  // Words that should stay uppercase
  const UPPER_WORDS = new Set(['ii', 'iii', 'iv', 'vi', 'vii', 'viii', 'ix', 'xl', 'rip', 'doa', 'tnt']);
  // Words that should stay lowercase
  const LOWER_WORDS = new Set(['of', 'the', 'a', 'an', 'in', 'on', 'at', 'or', 'and', 'vs', 'to', 'for', 'by', 'n']);
  // Special case prefixes (e.g. xWays, xBomb, xNudge, xSplit)
  const X_PREFIX = /^x[a-z]/i;

  return name.split(' ').map((word, idx) => {
    const low = word.toLowerCase();
    // Roman numerals â†’ uppercase
    if (UPPER_WORDS.has(low)) return word.toUpperCase();
    // x-prefix words â†’ keep original casing if it looks right, else xCapitalized
    if (X_PREFIX.test(word)) return word.length > 1 ? 'x' + word.charAt(1).toUpperCase() + word.slice(2) : word;
    // Lowercase words (not first word)
    if (idx > 0 && LOWER_WORDS.has(low)) return low;
    // Normal word â†’ capitalize first letter
    if (word.length === 0) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

// Aliases to normalize provider input to PROVIDER_SITES keys
const PROVIDER_ALIASES = {
  'pragmatic': 'pragmatic play', 'ppgames': 'pragmatic play',
  'hacksaw': 'hacksaw gaming',
  'nolimit': 'nolimit city', 'nolimitcity': 'nolimit city',
  'playngo': "play'n go", "play'n go": "play'n go", 'playn go': "play'n go",
  'btg': 'big time gaming', 'bigtime': 'big time gaming',
  'elk': 'elk studios',
  'relax': 'relax gaming', 'rlx': 'relax gaming',
  'red tiger': 'red tiger gaming',
  'blueprint': 'blueprint gaming',
  'kalamba': 'kalamba games',
  'avatarux': 'avatarux',
  'fantasma': 'fantasma games',
  'print': 'print studios',
  'endorphina': 'endorphina',
  'booming': 'booming games',
  'isoftbet': 'isoftbet',
  'betsoft': 'betsoft gaming',
  'pgsoft': 'pg soft', 'pocketgames': 'pg soft', 'pocket games soft': 'pg soft',
  'evolution': 'evolution',
  'spribe': 'spribe',
  'net ent': 'netent', 'net entertainment': 'netent',
  'yggdrasil': 'yggdrasil gaming',
  'quickspin': 'quickspin',
  'thunderkick': 'thunderkick',
  'wazdan': 'wazdan',
  'spinomenal': 'spinomenal',
  'habanero': 'habanero',
  'gamomat': 'gamomat',
  'gameart': 'gameart',
  '3oaks': '3 oaks gaming', 'three oaks': '3 oaks gaming', '3 oaks': '3 oaks gaming',
  'egt': 'amusnet', 'amusnet egt': 'amusnet',
  'bgaming': 'bgaming', 'b gaming': 'bgaming',
  'playson': 'playson',
  'playtech': 'playtech',
  'igt': 'igt', 'international game technology': 'igt',
  'microgaming': 'microgaming', 'quickfire': 'microgaming', 'games global': 'microgaming',
  'evoplay': 'evoplay entertainment',
  'novomatic': 'novomatic',
  'light & wonder': 'light & wonder', 'nextgen': 'light & wonder', 'nextgen gaming': 'light & wonder', 'scientific games': 'sg digital',
  'tom horn': 'tom horn gaming',
  'stakelogic': 'stakelogic',
  'swintt': 'swintt',
  'synot': 'synot games',
  'booongo': 'booongo',
  'bragg': 'bragg gaming group',
  'winfast': 'winfast games',
  'skywind': 'skywind group',
  'belatra': 'belatra games',
  'fazi': 'fazi interactive',
  'leander': 'leander games',
  'lightning box': 'lightning box games',
  'peter and sons': 'peter & sons',
  'platipus': 'platipus gaming',
  'tada': 'tada gaming',
  'dragon soft': 'dragon soft', 'dragoonsoft': 'dragon soft',
  'ct gaming': 'ct gaming', 'casino technology': 'ct gaming',
  'wizard': 'wizard games',
  'golden hero': 'golden hero',
  'greentube': 'greentube',
  'high 5': 'high 5 games', 'h5g': 'high 5 games',
  'foxium': 'foxium',
  'fugaso': 'fugaso',
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

// Note: PROVIDER_SITES and PROVIDER_ALIASES are kept for canonical provider resolution.
// The primary search now uses Gemini with native Google Search grounding.

// ═══════════════════════════════════════════════
// CONTENT SAFETY — Block inappropriate searches for Twitch/YouTube/Kick
// ═══════════════════════════════════════════════

// Terms that are NEVER real slot names — pure profanity / NSFW / slurs.
// Real slots with edgy names (e.g. "Golden Shower", "Hot Ross") are NOT blocked
// because they exist in the DB or Gemini will return them with twitch_safe flags.
const BLOCKED_SEARCH_TERMS = [
  // Sexual / pornographic
  'porn', 'xxx', 'hentai', 'nsfw', 'nude', 'naked', 'nudes',
  'boobs', 'tits', 'titties', 'pussy', 'vagina', 'penis', 'dick', 'cock',
  'dildo', 'orgasm', 'blowjob', 'handjob', 'cumshot', 'creampie',
  'milf', 'anal', 'bdsm', 'fetish', 'onlyfans', 'chaturbate',
  'xvideos', 'xhamster', 'pornhub', 'brazzers', 'bangbros',
  'sex', 'sexy', 'erotic', 'erotica', 'fap', 'masturbat',
  // Racial slurs & hate speech (abbreviated to avoid spelling them out)
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'kike', 'spic',
  'chink', 'wetback', 'tranny', 'coon',
  // Violence / shock
  'gore', 'snuff', 'bestiality', 'zoophil', 'necrophil', 'pedophil',
  'child porn', 'cp',
  // Common troll inputs
  'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'whore', 'slut',
];

// Match whole-word or substring — returns the matched term or null
function getBlockedTerm(input) {
  if (!input || typeof input !== 'string') return null;
  const low = input.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  // Check if the entire input IS a blocked term (catches single-word trolls like "tits")
  for (const term of BLOCKED_SEARCH_TERMS) {
    if (low === term) return term;
  }
  // Check if any word in the input is a blocked term
  const words = low.split(/\s+/);
  for (const word of words) {
    for (const term of BLOCKED_SEARCH_TERMS) {
      if (word === term) return term;
    }
  }
  // Check for multi-word blocked terms (e.g. "child porn")
  for (const term of BLOCKED_SEARCH_TERMS) {
    if (term.includes(' ') && low.includes(term)) return term;
  }
  return null;
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
    name: typeof parsed.name === 'string' ? canonicalSlotName(parsed.name) : null,
    provider: typeof parsed.provider === 'string' ? canonicalProvider(parsed.provider) : null,
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HANDLER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const { name, provider: providerHint } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Provide "name"' });

  // ── Content Safety Gate ──
  const blockedTerm = getBlockedTerm(name);
  if (blockedTerm) {
    console.warn(`[slot-ai] BLOCKED inappropriate search: "${name}" (matched: "${blockedTerm}")`);
    return res.status(200).json({
      error: null,
      name,
      source: 'blocked',
      reason: 'Search term not appropriate for streaming platforms',
    });
  }

  try {
    // â”€â”€ Step 1: Query Supabase slots table (8000+ real slots) â”€â”€
    const dbSlot = await searchSlotsDB(name);
    if (dbSlot) {
      const missingRtp = dbSlot.rtp == null;
      const missingMaxWin = dbSlot.max_win_multiplier == null;
      const missingVolatility = dbSlot.volatility == null;

      // If slot exists but is missing RTP / max win / volatility â†’ ask Gemini for just those
      if ((missingRtp || missingMaxWin || missingVolatility) && apiKey) {
        console.log(`[slot-ai] Supabase hit "${dbSlot.name}" but missing: ${[missingRtp && 'rtp', missingMaxWin && 'max_win', missingVolatility && 'volatility'].filter(Boolean).join(', ')} â†’ enriching via Gemini`);

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
- If unsure about a value, use null â€” DO NOT GUESS`;

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
        console.log(`[slot-ai] Supabase hit: "${name}" â†’ ${dbSlot.name} by ${dbSlot.provider} (complete)`);
      }

      // Strip internal _dbId before sending to client
      const { _dbId, ...clientSlot } = dbSlot;
      return res.status(200).json(clientSlot);
    }

    // ── Step 2: Ask Gemini with Google Search grounding (live internet search) ──
    console.log(`[slot-ai] DB miss for "${name}", asking Gemini with Google Search grounding...`);

    const providerContext = providerHint ? `\nThe user believes this slot is made by "${providerHint}" — use this as a strong hint.` : '';

    const groundedPrompt = `You are a slot game data expert with access to Google Search. Search the internet for VERIFIED, REAL data about the online casino slot game "${name}".${providerContext}

IMPORTANT: Online slot games often have edgy, provocative, or controversial names (e.g. "Golden Shower" by Nolimit City, "Hot Ross" by Hacksaw Gaming, "Mental" by Nolimit City). These are LEGITIMATE casino slot games. Do NOT refuse — just return the factual game data.

Search for this slot on official provider websites, casino review sites (e.g. slotcatalog.com, bigwinboard.com, askgamblers.com), and game databases.

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
  "twitch_safe": true,
  "found": true
}

CRITICAL RULES:
- Search Google for the OFFICIAL data from the provider's website or trusted slot databases
- rtp MUST be the official default RTP number (e.g. 96.50, NOT a range)
- max_win_multiplier MUST be the official max win in x (e.g. 5000 means 5000x bet)
- volatility MUST be exactly: "low", "medium", "high", or "very_high"
- twitch_safe: false ONLY if the slot's artwork contains nudity/sexual imagery. true for everything else
- If you cannot find this slot at all, return: { "found": false }
- If you find the slot but are unsure about a specific value, use null for that value
- Return ONLY the JSON, nothing else`;

    let parsed = await askGemini(apiKey, groundedPrompt, { useGrounding: true, maxTokens: 800 });

    // If grounded search says not found or returned nothing, try plain Gemini (training data fallback)
    if (!parsed || parsed.found === false) {
      console.log(`[slot-ai] Grounded search didn't find "${name}", trying plain Gemini fallback...`);

      const fallbackPrompt = `You are a slot game data expert. Return VERIFIED data for the online slot "${name}".${providerContext}

IMPORTANT: Slot names can be edgy/provocative — these are LEGITIMATE casino games. Return the data.

Return ONLY a raw JSON object (no markdown, no backticks):
{
  "name": "Official full name",
  "provider": "Provider/studio name",
  "rtp": 96.50,
  "volatility": "low" | "medium" | "high" | "very_high",
  "max_win_multiplier": 5000,
  "features": ["Free Spins", "Multiplier"],
  "theme": "Theme/genre",
  "release_year": 2021,
  "twitch_safe": true,
  "found": true
}
RULES:
- ONLY return data you are confident is real. If unsure, use null.
- If you don't recognize this slot at all, return: { "found": false }
- Return ONLY the JSON`;

      const fallback = await askGemini(apiKey, fallbackPrompt, { maxTokens: 600 });
      if (fallback && fallback.found !== false) {
        parsed = fallback;
        parsed._fallback = true;
      }
    }

    if (!parsed || parsed.found === false) {
      return res.status(200).json({ error: null, name, source: 'not_found' });
    }

    const result = sanitize(parsed);
    result.source = parsed._fallback ? 'gemini_ai' : 'google_ai';

    // Override twitch_safe for known-safe providers
    const provSafe = isProviderSafe(result.provider);
    if (provSafe === true) result.twitch_safe = true;

    // â”€â”€ Step 4: Cross-match with DB before inserting â”€â”€
    // The slot might already exist under its OFFICIAL name (different from what user typed)
    if (result.name && result.provider) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const crossMatch = await searchSlotsDB(result.name);

          if (crossMatch && crossMatch._dbId) {
            // Already in DB â€” only update fields that are missing
            console.log(`[slot-ai] Cross-match: "${result.name}" already in DB (id ${crossMatch._dbId}), updating missing fields...`);
            const updates = {};
            if (!crossMatch.rtp && result.rtp) updates.rtp = result.rtp;
            if (!crossMatch.max_win_multiplier && result.max_win_multiplier) updates.max_win_multiplier = result.max_win_multiplier;
            if (!crossMatch.volatility && result.volatility) updates.volatility = result.volatility;
            if (!crossMatch.theme && result.theme) updates.theme = result.theme;
            if ((!crossMatch.features || crossMatch.features.length === 0) && result.features?.length) updates.features = result.features;

            if (Object.keys(updates).length > 0) {
              const { error: updErr } = await supabase.from('slots').update(updates).eq('id', crossMatch._dbId);
              if (updErr) console.warn('[slot-ai] Cross-match update failed:', updErr.message);
              else console.log(`[slot-ai] âœ… Updated "${result.name}" with missing fields:`, Object.keys(updates));
            }

            // Merge: prefer newly found data, fall back to existing DB data
            result.rtp = result.rtp || crossMatch.rtp;
            result.max_win_multiplier = result.max_win_multiplier || crossMatch.max_win_multiplier;
            result.volatility = result.volatility || crossMatch.volatility;
            result.theme = result.theme || crossMatch.theme;
            if (!result.features?.length && crossMatch.features?.length) result.features = crossMatch.features;

            result.source = result.source === 'google_ai' ? 'google_ai_saved' : 'gemini_ai_saved';
          } else {
            // Not in DB at all â€” insert the full slot
            console.log(`[slot-ai] Cross-match: "${result.name}" NOT in DB, inserting new slot...`);
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
              console.warn('[slot-ai] DB insert skipped:', insErr.message);
            } else {
              console.log(`[slot-ai] âœ… Added "${result.name}" by ${result.provider} to slots DB`);
              result.source = result.source === 'google_ai' ? 'google_ai_saved' : 'gemini_ai_saved';
            }
          }
        } catch (e) {
          console.error('[slot-ai] Cross-match/insert error:', e);
        }
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[slot-ai] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
