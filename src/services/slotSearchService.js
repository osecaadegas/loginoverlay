/**
 * slotSearchService.js — Slot image search & URL analysis engine.
 * Ported from BONUS HUNT PRO geminiService.ts for web usage.
 *
 * Features:
 *  • analyzeSlotUrl(url)        – regex-based slot name + provider extraction from casino URLs
 *  • scrapeSlotMetadata(url)    – OG-tag scraping via CORS proxy
 *  • findSlotImage(name, prov)  – Google Images scrape via CORS proxy
 */

// ─── CORS Proxies ───
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const CORS_PROXY_BACKUP = 'https://corsproxy.io/?';

// ─── Provider keyword → display name map ───
const PROVIDER_KEYWORDS = {
  pragmatic: 'Pragmatic Play',
  ppgames: 'Pragmatic Play',
  gs2c: 'Pragmatic Play',
  hacksaw: 'Hacksaw Gaming',
  nolimit: 'NoLimit City',
  playngo: "Play'n GO",
  png: "Play'n GO",
  pushgaming: 'Push Gaming',
  relax: 'Relax Gaming',
  rlx: 'Relax Gaming',
  elk: 'ELK Studios',
  thunderkick: 'Thunderkick',
  stake: 'Stake Original',
  evolution: 'Evolution',
  netent: 'NetEnt',
  redtiger: 'Red Tiger',
  pgsoft: 'PG Soft',
  pocketgames: 'PG Soft',
  blueprint: 'Blueprint Gaming',
  bigtime: 'Big Time Gaming',
  btg: 'Big Time Gaming',
  gamomat: 'Gamomat',
  quickspin: 'Quickspin',
  yggdrasil: 'Yggdrasil',
  avatarux: 'AvatarUX',
  spribe: 'Spribe',
  smartsoft: 'SmartSoft',
  onlyplay: 'Onlyplay',
  print: 'Print Studios',
  fantasma: 'Fantasma Games',
  kalamba: 'Kalamba Games',
  '3oaks': '3 Oaks',
  booongo: 'Booongo',
  plural: 'Plural',
  playtech: 'Playtech',
  isoftbet: 'iSoftBet',
  wazdan: 'Wazdan',
  habanero: 'Habanero',
  spinomenal: 'Spinomenal',
  endorphina: 'Endorphina',
  booming: 'Booming Games',
  mascot: 'Mascot Gaming',
  gameart: 'GameArt',
  betsoft: 'Betsoft',
  bgaming: 'BGaming',
  platipus: 'Platipus',
  belatra: 'Belatra',
  amatic: 'Amatic',
  merkur: 'Merkur',
  novomatic: 'Novomatic',
  greentube: 'Greentube',
  synot: 'Synot Games',
  swintt: 'Swintt',
  tomhorn: 'Tom Horn',
  '1x2': '1x2 Gaming',
  irondog: 'Iron Dog Studio',
  slotmill: 'Slotmill',
  octoplay: 'Octoplay',
  popiplay: 'Popiplay',
  backseat: 'Backseat Gaming',
  bullshark: 'Bullshark Games',
  massive: 'Massive Studios',
  raw: 'Raw iGaming',
  reelkingdom: 'Reel Kingdom',
};

// ─── Famous slots → provider look-up ───
const FAMOUS_SLOTS = {
  'gates-of-olympus': 'Pragmatic Play',
  'sweet-bonanza': 'Pragmatic Play',
  'sugar-rush': 'Pragmatic Play',
  'big-bass': 'Pragmatic Play',
  'fruit-party': 'Pragmatic Play',
  'dog-house': 'Pragmatic Play',
  'starlight-princess': 'Pragmatic Play',
  'madame-destiny': 'Pragmatic Play',
  'gems-bonanza': 'Pragmatic Play',
  'wild-west-gold': 'Pragmatic Play',
  'zeus-vs-hades': 'Pragmatic Play',
  'wisdom-of-athena': 'Pragmatic Play',
  'wanted-dead-or-a-wild': 'Hacksaw Gaming',
  'chaos-crew': 'Hacksaw Gaming',
  'stack-em': 'Hacksaw Gaming',
  'hand-of-anubis': 'Hacksaw Gaming',
  'rip-city': 'Hacksaw Gaming',
  'le-bandit': 'Hacksaw Gaming',
  'dork-unit': 'Hacksaw Gaming',
  'gladiator-legends': 'Hacksaw Gaming',
  rotten: 'Hacksaw Gaming',
  'beam-boys': 'Hacksaw Gaming',
  'divine-drop': 'Hacksaw Gaming',
  'san-quentin': 'NoLimit City',
  mental: 'NoLimit City',
  'fire-in-the-hole': 'NoLimit City',
  'tombstone-rip': 'NoLimit City',
  'dead-canary': 'NoLimit City',
  'das-xboot': 'NoLimit City',
  'nine-to-five': 'NoLimit City',
  'book-of-dead': "Play'n GO",
  'legacy-of-dead': "Play'n GO",
  reactoonz: "Play'n GO",
  'moon-princess': "Play'n GO",
  'rise-of-olympus': "Play'n GO",
  'tome-of-madness': "Play'n GO",
  'jammin-jars': 'Push Gaming',
  'razor-shark': 'Push Gaming',
  'fat-rabbit': 'Push Gaming',
  'big-bamboo': 'Push Gaming',
  'retro-tapes': 'Push Gaming',
};

// ────────────────────────────────────────────────
// Internal: robust fetch through CORS proxies
// ────────────────────────────────────────────────
async function fetchUrlContent(url) {
  // Primary proxy
  try {
    const res = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
    if (res.ok) return await res.text();
  } catch (_) {
    /* fall through */
  }

  // Backup proxy
  try {
    const res = await fetch(`${CORS_PROXY_BACKUP}${encodeURIComponent(url)}`);
    if (res.ok) return await res.text();
  } catch (_) {
    /* all proxies failed */
  }

  return null;
}

// ────────────────────────────────────────────────
// analyzeSlotUrl — Extract name + provider from a casino URL using regex
// ────────────────────────────────────────────────
export async function analyzeSlotUrl(url) {
  let name = '';
  let provider = '';
  let imageUrl = '';

  try {
    const cleanUrl = url.toLowerCase();
    const urlObj = new URL(url);

    // 1. Identify provider from URL keywords
    for (const [key, value] of Object.entries(PROVIDER_KEYWORDS)) {
      if (cleanUrl.includes(key)) {
        provider = value;
        break;
      }
    }

    // 2. Extract game slug
    const paramsToCheck = [
      'game', 'gameId', 'gameName', 'gameSymbol',
      'game_id', 'title', 'name', 'gameCode', 'slug',
    ];
    const urlParams = new URLSearchParams(urlObj.search);
    let foundSlug = '';

    // A) Check query params
    for (const param of paramsToCheck) {
      const val = urlParams.get(param);
      if (val) { foundSlug = val; break; }
    }

    // B) Fallback: last meaningful path segment
    if (!foundSlug) {
      const segments = urlObj.pathname.split('/').filter(
        (s) => s.length > 2 &&
               !['play', 'game', 'launch', 'casino', 'slots', 'en', 'pt', 'br', 'games'].includes(s.toLowerCase()),
      );
      if (segments.length) foundSlug = segments[segments.length - 1];
    }

    // 3. Process slug
    if (foundSlug) {
      let slug = foundSlug.toLowerCase().split('.')[0]; // strip .html etc
      slug = slug.replace(/^(game-|slot-|play-|casino-|provider-)/i, '');

      // Provider from famous slot names
      if (!provider) {
        for (const [key, value] of Object.entries(FAMOUS_SLOTS)) {
          if (slug.includes(key)) { provider = value; break; }
        }
      }

      // Clean up slug → human name
      let raw = slug;
      if (raw.startsWith('vs') && /\d/.test(raw)) raw = raw.replace(/^vs\d+/, '');
      raw = raw.replace(/[-_]/g, ' ');
      raw = raw.replace(/([a-z])([A-Z])/g, '$1 $2');
      raw = raw.replace(/([a-zA-Z])(\d)/g, '$1 $2');
      raw = raw.replace(/(\d)([a-zA-Z])/g, '$1 $2');
      name = raw.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
    }
  } catch (e) {
    console.warn('[slotSearch] analyzeSlotUrl error:', e);
  }

  return { name: name.trim(), provider, imageUrl };
}

// ────────────────────────────────────────────────
// scrapeSlotMetadata — Fetch OG tags from a slot page
// ────────────────────────────────────────────────
export async function scrapeSlotMetadata(url) {
  try {
    if (!url.startsWith('http')) return {};
    const html = await fetchUrlContent(url);
    if (!html) return {};

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
    const twitterTitle = doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
    const twitterImage = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
    const titleTag = doc.querySelector('title')?.textContent;

    let name = ogTitle || twitterTitle || titleTag || '';
    const imageUrl = ogImage || twitterImage || '';

    // Clean common casino suffixes from title
    const separators = ['|', '-', '–', '—', '•', ':', '«'];
    for (const sep of separators) {
      if (name.includes(sep)) {
        const parts = name.split(sep);
        const p1 = parts[0].trim();
        const p2 = parts[1] ? parts[1].trim() : '';
        if (/^(play|jogue|casino|slot|bet)/i.test(p1) && p2.length > 3) {
          name = p2;
        } else {
          name = p1;
        }
        break;
      }
    }
    name = name.replace(/\s+(Slot|Review|Demo|Play|Online|Casino|Free|Grátis|Real Money)\s*$/i, '').trim();

    return { name: name || undefined, imageUrl: imageUrl || undefined };
  } catch (e) {
    console.error('[slotSearch] scrapeSlotMetadata error:', e);
    return {};
  }
}

// ────────────────────────────────────────────────
// findSlotImage — Google Image scrape for slot cover art
// ────────────────────────────────────────────────
export async function findSlotImage(name, provider = '') {
  try {
    const query = `${name} ${provider} slot cover`.trim();
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`;

    const html = await fetchUrlContent(googleUrl);
    if (!html) return null;

    // Strategy 1: JSON-like array pattern  "https://…jpg",height,width
    const rxStandard = /"(https?:\/\/[^"]+?\.(?:jpg|png|jpeg|webp))",\d+,\d+/g;
    // Strategy 2: generic image URL in quotes
    const rxGeneric = /"(https?:\/\/[^"]+?\.(?:jpg|png|jpeg|webp))"/g;

    const candidates = [];
    let m;

    while ((m = rxStandard.exec(html)) !== null && candidates.length < 10) candidates.push(m[1]);

    if (!candidates.length) {
      while ((m = rxGeneric.exec(html)) !== null && candidates.length < 10) candidates.push(m[1]);
    }

    const valid = candidates.filter((src) => {
      const l = src.toLowerCase();
      return (
        !l.includes('favicon') && !l.includes('logo') &&
        !l.includes('icon') && !l.includes('gstatic.com') &&
        (l.includes('jpg') || l.includes('png') || l.includes('webp'))
      );
    });

    if (valid.length) return valid[0];

    // Fallback: <img> tags
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    for (const img of doc.querySelectorAll('img')) {
      const src = img.src;
      if (src.startsWith('http') && !src.includes('google') && !src.includes('gif')) return src;
    }

    return null;
  } catch (e) {
    console.error('[slotSearch] findSlotImage error:', e);
    return null;
  }
}
