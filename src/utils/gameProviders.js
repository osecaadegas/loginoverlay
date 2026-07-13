// Game Provider data and image mapping
// Images should be placed in /public/providers/ folder
import { PROVIDER_LOGO_FILES } from './providerLogoFiles';

const PROVIDER_LOGO_BASE = '/providers/';

export const GAME_PROVIDERS = [
  { id: 'pragmatic-play', name: 'Pragmatic Play', slug: 'pragmatic-play', image: '/providers/pragmaticplay.png' },
  { id: 'hacksaw', name: 'Hacksaw Gaming', slug: 'hacksaw', image: '/providers/hacksaw.png' },
  { id: 'evolution', name: 'Evolution', slug: 'evolution', image: '/providers/evolution.png' },
  { id: 'netent', name: 'NetEnt', slug: 'netent', image: '/providers/netent.png' },
  { id: 'quickspin', name: 'Quickspin', slug: 'quickspin', image: '/providers/quickspin.png' },
  { id: 'elk', name: 'ELK Studios', slug: 'elk', image: '/providers/elk.png' },
  { id: 'red-tiger', name: 'Red Tiger', slug: 'red-tiger', image: '/providers/red_tiger.png' },
  { id: 'playson', name: 'Playson', slug: 'playson', image: '/providers/playson.png' },
  { id: 'nolimit', name: 'Nolimit City', slug: 'nolimit', image: '/providers/nolimit.png' },
  { id: 'relax', name: 'Relax Gaming', slug: 'relax-gaming', image: '/providers/relax_gaming.png' },
  { id: 'push-gaming', name: 'Push Gaming', slug: 'push-gaming', image: '/providers/push_gaming.png' },
  { id: 'play-n-go', name: "Play'n GO", slug: 'play-n-go', image: '/providers/playngo.png' },
  { id: 'thunderkick', name: 'Thunderkick', slug: 'thunderkick', image: '/providers/thunderkick.png' },
  { id: 'big-time-gaming', name: 'Big Time Gaming', slug: 'big-time-gaming', image: '/providers/big_time_gaming.png' },
  { id: 'yggdrasil', name: 'Yggdrasil', slug: 'yggdrasil', image: '/providers/yggdrasil.png' },
  { id: 'betsoft', name: 'Betsoft', slug: 'betsoft', image: '/providers/betsoft.png' },
  { id: 'microgaming', name: 'Microgaming', slug: 'microgaming', image: '/providers/microgaming.png' },
  { id: 'isoftbet', name: 'iSoftBet', slug: 'isoftbet', image: '/providers/isoftbet.png' },
  { id: 'booongo', name: 'Booongo', slug: 'booongo', image: '/providers/booongo.png' },
  { id: 'bgaming', name: 'BGaming', slug: 'bgaming', image: '/providers/bgaming.png' },
  { id: '3oaks', name: '3 Oaks Gaming', slug: '3oaks', image: '/providers/3oaks.png' },
  { id: 'belatra', name: 'Belatra Games', slug: 'belatra', image: '/providers/belatra.png' },
  { id: 'pragmatic', name: 'Pragmatic', slug: 'pragmatic', image: '/providers/pragmatic.png' },
  { id: 'spinomenal', name: 'Spinomenal', slug: 'spinomenal', image: '/providers/spinomenal.png' },
  { id: 'wazdan', name: 'Wazdan', slug: 'wazdan', image: '/providers/wazdan.png' },
  { id: 'endorphina', name: 'Endorphina', slug: 'endorphina', image: '/providers/endorphina.png' },
  { id: 'habanero', name: 'Habanero', slug: 'habanero', image: '/providers/habanero.png' },
  { id: 'evoplay', name: 'Evoplay', slug: 'evoplay', image: '/providers/evoplay.png' },
  { id: 'ezugi', name: 'Ezugi', slug: 'ezugi', image: '/providers/ezugi.png' },
  { id: 'playtech', name: 'Playtech', slug: 'playtech', image: '/providers/playtech.png' },
  { id: 'novomatic', name: 'Novomatic', slug: 'novomatic', image: '/providers/novomatic.png' },
  { id: 'amatic', name: 'Amatic', slug: 'amatic', image: null },
  { id: 'blueprint', name: 'Blueprint Gaming', slug: 'blueprint', image: '/providers/blueprint.png' },
  { id: 'kalamba', name: 'Kalamba Games', slug: 'kalamba', image: '/providers/kalamba.png' },
  { id: 'gameart', name: 'GameArt', slug: 'gameart', image: '/providers/gameart.png' },
  { id: 'tom-horn', name: 'Tom Horn Gaming', slug: 'tom-horn', image: '/providers/tom_horn.png' },
  { id: 'fantasma', name: 'Fantasma Games', slug: 'fantasma', image: '/providers/fantasma.png' },
  { id: 'avatarux', name: 'AvatarUX', slug: 'avatarux', image: '/providers/avatarux.png' },
  { id: 'stakelogic', name: 'Stakelogic', slug: 'stakelogic', image: '/providers/stakelogic.png' },
  { id: 'pgsoft', name: 'PG Soft', slug: 'pgsoft', image: '/providers/pg_soft.png' },
];

// Common suffixes that DB normalization appends but logo files omit
const STRIP_SUFFIXES = /\s+(gaming|studios?|games?|game|interactive|industries|entertainment|group|slots?|casino|live|ltd|limited)\s*$/i;
const GENERIC_PROVIDER_TOKENS = new Set([
  'and',
  'casino',
  'entertainment',
  'game',
  'games',
  'gaming',
  'group',
  'industries',
  'interactive',
  'limited',
  'live',
  'ltd',
  'slot',
  'slots',
  'studio',
  'studios',
]);

const PROVIDER_ALIASES = {
  '3_oaks': '3oaks',
  'amigo': 'amigogaming',
  'amigo_gaming': 'amigogaming',
  'avatar_ux': 'avatarux',
  'atomic': 'atomic_slot_lab',
  'atomic_slot_lab': 'atomic_slot_lab',
  'bf': 'bf_games',
  'bf_gaming': 'bf_games',
  'blueprint_gaming': 'blueprint',
  'booming': 'booming_games',
  'booming_game': 'booming_games',
  'fantasma_games': 'fantasma',
  'gaming_corps': 'gamingcorps',
  'iron_dog_studio': 'iron_dog',
  'light_and_wonder': 'LIGHT_WONDER',
  'light_wonder': 'LIGHT_WONDER',
  'net_ent': 'netent',
  'nolimit_city': 'nolimit',
  'no_limit_city': 'nolimit',
  'play_n_go': 'playngo',
  'playn_go': 'playngo',
  'playngo': 'playngo',
  'pragmatic': 'pragmatic',
  'pragmatic_play': 'pragmaticplay',
  'red_rake': 'redrake',
  'red_rake_gaming': 'redrake',
  'ruby_play': 'rubyplay',
  'shady_lady': 'shadylady',
  'smart_soft': 'smartsoft',
  'stake_logic': 'stakelogic',
  'tom_horn': 'tom_horn',
  'tom_horn_gaming': 'tom_horn',
  'tomhorn': 'tom_horn',
  'wizard': 'wizard_games',
  'wizard_games': 'wizard_games',
};

const normalizeProviderSlug = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/&/g, ' and ')
  .replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const stripProviderSuffixes = (slug) => {
  let next = slug;
  let previous;
  do {
    previous = next;
    next = next.replace(/_(gaming|studios?|games?|game|interactive|industries|entertainment|group|slots?|casino|live|ltd|limited)$/i, '');
  } while (next !== previous);
  return next;
};

const providerTokens = (slug) => stripProviderSuffixes(slug)
  .split('_')
  .filter(token => token && !GENERIC_PROVIDER_TOKENS.has(token));

const includesAllTokens = (sourceTokens, targetTokens) => targetTokens.every(token => sourceTokens.includes(token));

const providerLogoBySlug = PROVIDER_LOGO_FILES.reduce((acc, file) => {
  const stem = file.replace(/\.[^.]+$/, '');
  const normalized = normalizeProviderSlug(stem);
  const stripped = stripProviderSuffixes(normalized);
  acc[normalized] = file;
  acc[normalized.replace(/_/g, '')] = file;
  if (!acc[stripped]) acc[stripped] = file;
  if (!acc[stripped.replace(/_/g, '')]) acc[stripped.replace(/_/g, '')] = file;
  return acc;
}, {});

const providerLogoEntries = PROVIDER_LOGO_FILES.map((file) => {
  const stem = file.replace(/\.[^.]+$/, '');
  const normalized = normalizeProviderSlug(stem);
  const stripped = stripProviderSuffixes(normalized);
  return {
    file,
    normalized,
    compact: normalized.replace(/_/g, ''),
    stripped,
    strippedCompact: stripped.replace(/_/g, ''),
    tokens: providerTokens(normalized),
  };
});

const normalizeAlias = (value) => value ? normalizeProviderSlug(value) : null;

const fuzzyProviderLogoFile = (candidates) => {
  const normalizedCandidates = candidates.map(normalizeProviderSlug).filter(Boolean);
  for (const candidate of normalizedCandidates) {
    const stripped = stripProviderSuffixes(candidate);
    const compact = candidate.replace(/_/g, '');
    const strippedCompact = stripped.replace(/_/g, '');
    const tokens = providerTokens(candidate);
    const match = providerLogoEntries.find(entry => {
      if (entry.normalized === candidate || entry.stripped === stripped || entry.compact === compact || entry.strippedCompact === strippedCompact) return true;
      if (!tokens.length || !entry.tokens.length) return false;
      if (tokens.length === 1 && entry.tokens.length === 1) return tokens[0] === entry.tokens[0];
      return includesAllTokens(tokens, entry.tokens) || includesAllTokens(entry.tokens, tokens);
    });
    if (match) return match.file;
  }
  return null;
};

const findProviderLogoFile = (value) => {
  const slug = normalizeProviderSlug(value);
  if (!slug) return null;
  const stripped = stripProviderSuffixes(slug);
  const compact = slug.replace(/_/g, '');
  const strippedCompact = stripped.replace(/_/g, '');
  const candidates = [
    slug,
    normalizeAlias(PROVIDER_ALIASES[slug]),
    compact,
    normalizeAlias(PROVIDER_ALIASES[compact]),
    stripped,
    normalizeAlias(PROVIDER_ALIASES[stripped]),
    strippedCompact,
    normalizeAlias(PROVIDER_ALIASES[strippedCompact]),
  ].filter(Boolean);
  const match = candidates.find(candidate => providerLogoBySlug[candidate]);
  return match ? providerLogoBySlug[match] : fuzzyProviderLogoFile(candidates);
};

const logoUrl = (file) => file ? `${PROVIDER_LOGO_BASE}${file}` : null;

// Get provider by ID or slug
export const getProvider = (idOrSlug) => {
  if (!idOrSlug) return null;
  const lower = idOrSlug.toLowerCase();
  const normalizedInput = normalizeProviderSlug(idOrSlug);
  // exact match on id, slug, or name
  const exact = GAME_PROVIDERS.find(p =>
    p.id === idOrSlug || p.slug === idOrSlug || p.name.toLowerCase() === lower ||
    normalizeProviderSlug(p.id) === normalizedInput ||
    normalizeProviderSlug(p.slug) === normalizedInput ||
    normalizeProviderSlug(p.name) === normalizedInput
  );
  if (exact) return exact;
  // try after stripping suffix (e.g. "Red Tiger Gaming" → "Red Tiger")
  const stripped = lower.replace(STRIP_SUFFIXES, '');
  if (stripped !== lower) {
    return GAME_PROVIDERS.find(p =>
      p.name.toLowerCase() === stripped ||
      p.id === stripped.replace(/\s+/g, '-') ||
      p.slug === stripped.replace(/\s+/g, '-')
    );
  }
  return null;
};

// Convert a provider name/slug to an existing logo URL from public/providers.
const toProviderFilename = (name) => logoUrl(findProviderLogoFile(name));

// Get provider image URL by ID, slug, or name
export const getProviderImage = (idOrSlug) => {
  if (!idOrSlug) return null;
  // 1) Check static list (with fuzzy suffix-stripping)
  const provider = getProvider(idOrSlug);
  const providerImage = toProviderFilename(provider?.name || provider?.slug || provider?.id) || provider?.image;
  if (providerImage) return providerImage;
  // 2) Generate path from name (matches scraped logos in public/providers/)
  //    Also try with common suffixes stripped
  const full = toProviderFilename(idOrSlug);
  const stripped = idOrSlug.replace(STRIP_SUFFIXES, '');
  if (stripped !== idOrSlug) {
    const short = toProviderFilename(stripped);
    if (short) return short;
  }
  return full;
};

// Get provider name by ID or slug
export const getProviderName = (idOrSlug) => {
  const provider = getProvider(idOrSlug);
  return provider?.name || idOrSlug;
};

// Get multiple providers with their data
export const getProviders = (providerIds) => {
  if (!providerIds || !Array.isArray(providerIds)) return [];
  return providerIds.map(id => {
    const provider = getProvider(id);
    return provider || { id, name: id, slug: id, image: getProviderImage(id) };
  });
};

// Get all providers (for selection dropdowns)
export const getAllProviders = () => GAME_PROVIDERS;

// Search providers by name
export const searchProviders = (query) => {
  if (!query) return GAME_PROVIDERS;
  const q = query.toLowerCase();
  return GAME_PROVIDERS.filter(p => 
    p.name.toLowerCase().includes(q) || 
    p.id.includes(q)
  );
};

export default GAME_PROVIDERS;
