// Vercel Serverless Function: /api/fetch-slot-info
// Fetches slot game information from multiple public sources
// Uses SlotsCalendar / BigWinBoard style data aggregation

const SLOT_DATA_SOURCES = [
  // SlotCatalog API
  {
    name: 'slotcatalog',
    search: (name) => `https://slotcatalog.com/api/v2/searchGame?q=${encodeURIComponent(name)}`,
  }
];

// Known slot features for matching
const KNOWN_FEATURES = [
  'Free Spins', 'Multiplier', 'Buy Bonus', 'Cascading Reels', 'Expanding Wilds',
  'Sticky Wilds', 'Scatter', 'Bonus Game', 'Megaways', 'Hold and Spin',
  'Respins', 'Jackpot', 'Gamble Feature', 'Random Wilds', 'Cluster Pays',
  'Progressive', 'Pick and Click', 'Tumble', 'Wild Symbols', 'Stacked Wilds',
  'Colossal Symbols', 'Mystery Symbols', 'Split Symbols', 'Walking Wilds'
];

// Well-known slot database (fallback for popular slots)
const KNOWN_SLOTS = {
  'sweet bonanza': {
    provider: 'Pragmatic Play',
    rtp: 96.48,
    volatility: 'high',
    max_win_multiplier: 21175,
    reels: '6x5',
    paylines: 'Cluster',
    min_bet: 0.20,
    max_bet: 125.00,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus', 'Scatter'],
    theme: 'Candy',
    release_date: '2019-06-27',
    image: 'https://www.imgworlds.com/wp-content/uploads/2024/05/sweet-bonanza-1.webp'
  },
  'gates of olympus': {
    provider: 'Pragmatic Play',
    rtp: 96.50,
    volatility: 'high',
    max_win_multiplier: 5000,
    reels: '6x5',
    paylines: 'Cluster',
    min_bet: 0.20,
    max_bet: 125.00,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus'],
    theme: 'Greek Mythology',
    release_date: '2021-02-12',
  },
  'wanted dead or a wild': {
    provider: 'Hacksaw Gaming',
    rtp: 96.38,
    volatility: 'very_high',
    max_win_multiplier: 12500,
    reels: '5x5',
    paylines: 'Cluster',
    min_bet: 0.20,
    max_bet: 100.00,
    features: ['Free Spins', 'Multiplier', 'Expanding Wilds', 'Buy Bonus', 'Duel Feature'],
    theme: 'Western',
    release_date: '2021-09-01',
  },
  'dog house megaways': {
    provider: 'Pragmatic Play',
    rtp: 96.55,
    volatility: 'high',
    max_win_multiplier: 12305,
    reels: '6x2-7',
    paylines: 'Megaways',
    min_bet: 0.20,
    max_bet: 100.00,
    features: ['Free Spins', 'Multiplier', 'Sticky Wilds', 'Megaways', 'Buy Bonus'],
    theme: 'Animals',
    release_date: '2021-04-21',
  },
  'big bass bonanza': {
    provider: 'Pragmatic Play',
    rtp: 96.71,
    volatility: 'high',
    max_win_multiplier: 2100,
    reels: '5x3',
    paylines: '10',
    min_bet: 0.10,
    max_bet: 250.00,
    features: ['Free Spins', 'Multiplier', 'Scatter', 'Wild Symbols'],
    theme: 'Fishing',
    release_date: '2020-12-03',
  },
  'sugar rush': {
    provider: 'Pragmatic Play',
    rtp: 96.50,
    volatility: 'high',
    max_win_multiplier: 5000,
    reels: '7x7',
    paylines: 'Cluster',
    min_bet: 0.20,
    max_bet: 100.00,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus'],
    theme: 'Candy',
    release_date: '2022-07-28',
  },
  'starlight princess': {
    provider: 'Pragmatic Play',
    rtp: 96.50,
    volatility: 'high',
    max_win_multiplier: 5000,
    reels: '6x5',
    paylines: 'Cluster',
    min_bet: 0.20,
    max_bet: 125.00,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus'],
    theme: 'Anime',
    release_date: '2022-01-20',
  },
  'mental': {
    provider: 'Nolimit City',
    rtp: 96.08,
    volatility: 'very_high',
    max_win_multiplier: 66666,
    reels: '5x3-5',
    paylines: '108-3888',
    min_bet: 0.20,
    max_bet: 100.00,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus', 'xWays', 'xSplit'],
    theme: 'Horror',
    release_date: '2022-04-11',
  },
  'san quentin': {
    provider: 'Nolimit City',
    rtp: 96.03,
    volatility: 'very_high',
    max_win_multiplier: 150000,
    reels: '5x3-5',
    paylines: '243-2400',
    min_bet: 0.20,
    max_bet: 100.00,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus', 'xWays', 'Lockdown Spins'],
    theme: 'Prison',
    release_date: '2021-02-01',
  },
  'fire in the hole': {
    provider: 'Nolimit City',
    rtp: 96.06,
    volatility: 'very_high',
    max_win_multiplier: 60000,
    reels: '6x3-6',
    paylines: 'xWays',
    min_bet: 0.20,
    max_bet: 100.00,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus', 'Cascading Reels', 'xWays'],
    theme: 'Mining',
    release_date: '2021-08-30',
  },
  'tombstone rip': {
    provider: 'Nolimit City',
    rtp: 96.08,
    volatility: 'very_high',
    max_win_multiplier: 300000,
    reels: '5x3-5',
    paylines: '108-3888',
    min_bet: 0.20,
    max_bet: 100.00,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus', 'xWays', 'Shoot Out'],
    theme: 'Western',
    release_date: '2022-08-22',
  },
  'razor shark': {
    provider: 'Push Gaming',
    rtp: 96.70,
    volatility: 'high',
    max_win_multiplier: 50000,
    reels: '5x4',
    paylines: '20',
    min_bet: 0.10,
    max_bet: 100.00,
    features: ['Free Spins', 'Multiplier', 'Mystery Symbols', 'Nudge Feature'],
    theme: 'Ocean',
    release_date: '2019-09-05',
  },
  'book of dead': {
    provider: "Play'n GO",
    rtp: 96.21,
    volatility: 'high',
    max_win_multiplier: 5000,
    reels: '5x3',
    paylines: '10',
    min_bet: 0.01,
    max_bet: 100.00,
    features: ['Free Spins', 'Expanding Wilds', 'Scatter', 'Gamble Feature'],
    theme: 'Egyptian',
    release_date: '2016-01-26',
  },
  'reactoonz': {
    provider: "Play'n GO",
    rtp: 96.51,
    volatility: 'high',
    max_win_multiplier: 4570,
    reels: '7x7',
    paylines: 'Cluster',
    min_bet: 0.20,
    max_bet: 100.00,
    features: ['Cascading Reels', 'Multiplier', 'Random Wilds', 'Cluster Pays'],
    theme: 'Aliens',
    release_date: '2017-10-24',
  },
  'fruit party': {
    provider: 'Pragmatic Play',
    rtp: 96.47,
    volatility: 'high',
    max_win_multiplier: 5000,
    reels: '7x7',
    paylines: 'Cluster',
    min_bet: 0.20,
    max_bet: 100.00,
    features: ['Free Spins', 'Multiplier', 'Tumble', 'Buy Bonus', 'Random Multipliers'],
    theme: 'Fruits',
    release_date: '2020-07-16',
  },
  'wild west gold': {
    provider: 'Pragmatic Play',
    rtp: 96.51,
    volatility: 'high',
    max_win_multiplier: 10000,
    reels: '5x4',
    paylines: '40',
    min_bet: 0.20,
    max_bet: 100.00,
    features: ['Free Spins', 'Multiplier', 'Sticky Wilds', 'Scatter'],
    theme: 'Western',
    release_date: '2020-03-19',
  },
  'dead or alive 2': {
    provider: 'NetEnt',
    rtp: 96.80,
    volatility: 'very_high',
    max_win_multiplier: 111111,
    reels: '5x3',
    paylines: '9',
    min_bet: 0.09,
    max_bet: 18.00,
    features: ['Free Spins', 'Sticky Wilds', 'Multiplier', 'Scatter'],
    theme: 'Western',
    release_date: '2019-04-24',
  },
  'gonzo\'s quest': {
    provider: 'NetEnt',
    rtp: 95.97,
    volatility: 'medium',
    max_win_multiplier: 2500,
    reels: '5x3',
    paylines: '20',
    min_bet: 0.20,
    max_bet: 50.00,
    features: ['Free Spins', 'Multiplier', 'Cascading Reels'],
    theme: 'Adventure',
    release_date: '2013-01-01',
  },
  'chaos crew': {
    provider: 'Hacksaw Gaming',
    rtp: 96.35,
    volatility: 'very_high',
    max_win_multiplier: 10000,
    reels: '5x5',
    paylines: 'Cluster',
    min_bet: 0.10,
    max_bet: 100.00,
    features: ['Free Spins', 'Multiplier', 'Buy Bonus', 'Expanding Wilds'],
    theme: 'Urban',
    release_date: '2021-04-22',
  },
  'money train 3': {
    provider: 'Relax Gaming',
    rtp: 96.00,
    volatility: 'very_high',
    max_win_multiplier: 100000,
    reels: '5x4',
    paylines: '40',
    min_bet: 0.10,
    max_bet: 100.00,
    features: ['Free Spins', 'Multiplier', 'Respins', 'Buy Bonus', 'Persistent Symbols'],
    theme: 'Sci-Fi Western',
    release_date: '2022-08-22',
  }
};

// Try to find slot info from our known database (fuzzy match)
function findKnownSlot(name) {
  const normalized = name.toLowerCase().trim();
  
  // Exact match
  if (KNOWN_SLOTS[normalized]) {
    return { ...KNOWN_SLOTS[normalized], source: 'known_database', confidence: 'high' };
  }
  
  // Partial match
  for (const [key, data] of Object.entries(KNOWN_SLOTS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { ...data, source: 'known_database', confidence: 'medium' };
    }
  }
  
  return null;
}

// Try Google Custom Search for slot image
async function searchSlotImage(name, provider) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;
  
  if (!apiKey || !cx) return null;
  
  try {
    const query = `${name} ${provider || ''} slot game logo`;
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${cx}&searchType=image&imgSize=medium&num=3`;
    
    const res = await fetch(url);
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      return data.items[0].link;
    }
  } catch (e) {
    console.error('Image search error:', e);
  }
  return null;
}

// Try SerpAPI for quick web scraping
async function searchSlotInfo(name) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return null;
  
  try {
    const query = `${name} slot RTP max win volatility`;
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=5`;
    
    const res = await fetch(url);
    if (!res.ok) return null;
    
    const data = await res.json();
    
    // Extract info from featured snippets or organic results
    const result = {};
    const text = (data.answer_box?.answer || '') + ' ' + 
                 (data.answer_box?.snippet || '') + ' ' +
                 (data.organic_results || []).map(r => r.snippet || '').join(' ');
    
    // Extract RTP
    const rtpMatch = text.match(/RTP[:\s]+(\d{2,3}\.?\d{0,2})%?/i) || text.match(/(\d{2}\.\d{1,2})%\s*RTP/i);
    if (rtpMatch) result.rtp = parseFloat(rtpMatch[1]);
    
    // Extract max win
    const maxWinMatch = text.match(/max\s*win[:\s]+(\d[,\d]*\.?\d*)x/i) || text.match(/(\d[,\d]*\.?\d*)x\s*max/i);
    if (maxWinMatch) result.max_win_multiplier = parseFloat(maxWinMatch[1].replace(/,/g, ''));
    
    // Extract volatility
    const volMatch = text.match(/volatility[:\s]+(low|medium|high|very\s*high|extreme)/i);
    if (volMatch) {
      const vol = volMatch[1].toLowerCase().replace(/\s+/g, '_');
      result.volatility = vol === 'extreme' ? 'very_high' : vol;
    }
    
    // Extract provider
    const providerMatch = text.match(/(?:by|from|provider|developer)[:\s]+([\w\s']+?)(?:\.|,|\s-|\s\|)/i);
    if (providerMatch) result.provider = providerMatch[1].trim();
    
    if (Object.keys(result).length > 0) {
      result.source = 'web_search';
      result.confidence = 'low';
      return result;
    }
  } catch (e) {
    console.error('SerpAPI error:', e);
  }
  return null;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, provider } = req.body || {};
  
  if (!name) {
    return res.status(400).json({ error: 'Slot name is required' });
  }

  try {
    // 1. Try known database first (instant, high confidence)
    const knownData = findKnownSlot(name);
    if (knownData && knownData.confidence === 'high') {
      return res.status(200).json({
        success: true,
        data: knownData,
        source: 'known_database',
        confidence: 'high'
      });
    }

    // 2. Try web search for additional data
    const webData = await searchSlotInfo(name);
    
    // 3. Try image search
    const imageUrl = await searchSlotImage(name, provider || knownData?.provider);

    // Merge all sources (known data takes priority)
    const mergedData = {
      ...(webData || {}),
      ...(knownData || {}),
      ...(imageUrl ? { image: imageUrl } : {}),
    };

    // Clean up source/confidence
    if (knownData && webData) {
      mergedData.source = 'known_database+web_search';
      mergedData.confidence = 'medium';
    } else if (!knownData && !webData) {
      // No data found at all
      return res.status(200).json({
        success: false,
        data: null,
        message: 'No data found for this slot. Try entering a more specific name.',
        source: 'none',
        confidence: 'none'
      });
    }

    return res.status(200).json({
      success: true,
      data: mergedData,
      source: mergedData.source || 'mixed',
      confidence: mergedData.confidence || 'low'
    });
  } catch (error) {
    console.error('Fetch slot info error:', error);
    return res.status(500).json({
      error: 'Failed to fetch slot info',
      message: error.message
    });
  }
}
