// Game Provider data and image mapping
// Images should be placed in /public/providers/ folder

export const GAME_PROVIDERS = [
  { id: 'pragmatic-play', name: 'Pragmatic Play', slug: 'pragmatic-play', image: '/providers/pragmaticplay.png' },
  { id: 'hacksaw', name: 'Hacksaw Gaming', slug: 'hacksaw', image: '/providers/hacksaw.png' },
  { id: 'evolution', name: 'Evolution', slug: 'evolution', image: '/providers/evolution.png' },
  { id: 'netent', name: 'NetEnt', slug: 'netent', image: '/providers/netent.png' },
  { id: 'quickspin', name: 'Quickspin', slug: 'quickspin', image: '/providers/quickspin.png' },
  { id: 'elk', name: 'ELK Studios', slug: 'elk', image: '/providers/elk.png' },
  { id: 'red-tiger', name: 'Red Tiger', slug: 'red-tiger', image: '/providers/redtiger.png' },
  { id: 'playson', name: 'Playson', slug: 'playson', image: '/providers/playson.png' },
  { id: 'nolimit', name: 'Nolimit City', slug: 'nolimit', image: '/providers/nolimit.png' },
  { id: 'relax', name: 'Relax Gaming', slug: 'relax', image: '/providers/relax.png' },
  { id: 'push-gaming', name: 'Push Gaming', slug: 'push-gaming', image: '/providers/pushgaming.png' },
  { id: 'play-n-go', name: "Play'n GO", slug: 'play-n-go', image: '/providers/playngo.png' },
  { id: 'thunderkick', name: 'Thunderkick', slug: 'thunderkick', image: '/providers/thunderkick.png' },
  { id: 'big-time-gaming', name: 'Big Time Gaming', slug: 'big-time-gaming', image: '/providers/bigtimegaming.png' },
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
  { id: 'amatic', name: 'Amatic', slug: 'amatic', image: '/providers/amatic.png' },
  { id: 'blueprint', name: 'Blueprint Gaming', slug: 'blueprint', image: '/providers/blueprint.png' },
  { id: 'kalamba', name: 'Kalamba Games', slug: 'kalamba', image: '/providers/kalamba.png' },
  { id: 'gameart', name: 'GameArt', slug: 'gameart', image: '/providers/gameart.png' },
  { id: 'tom-horn', name: 'Tom Horn Gaming', slug: 'tom-horn', image: '/providers/tomhorn.png' },
  { id: 'fantasma', name: 'Fantasma Games', slug: 'fantasma', image: '/providers/fantasma.png' },
  { id: 'avatarux', name: 'AvatarUX', slug: 'avatarux', image: '/providers/avatarux.png' },
  { id: 'stakelogic', name: 'Stakelogic', slug: 'stakelogic', image: '/providers/stakelogic.png' },
  { id: 'pgsoft', name: 'PG Soft', slug: 'pgsoft', image: '/providers/pgsoft.png' },
];

// Get provider by ID or slug
export const getProvider = (idOrSlug) => {
  return GAME_PROVIDERS.find(p => 
    p.id === idOrSlug || 
    p.slug === idOrSlug || 
    p.name.toLowerCase() === idOrSlug?.toLowerCase()
  );
};

// Get provider image URL by ID or slug
export const getProviderImage = (idOrSlug) => {
  const provider = getProvider(idOrSlug);
  return provider?.image || '/providers/default.png';
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
    return provider || { id, name: id, slug: id, image: '/providers/default.png' };
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
