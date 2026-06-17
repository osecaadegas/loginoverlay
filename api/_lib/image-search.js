/**
 * Image search proxy for slot artwork.
 *
 * The endpoint still supports a plain q= query, but slot tools should pass
 * slot=1 plus name/provider so the proxy can search and rank like a human:
 * exact slot name, exact provider, slot/casino keywords, and junk filtering.
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const TRUSTED_SLOT_DOMAINS = [
  'slotcatalog.com',
  'bigwinboard.com',
  'demoslot.com',
  'slotslaunch.com',
  'slottracker.com',
  'slotjava.com',
  'casinoguru.com',
  'askgamblers.com',
  'vegasslotsonline.com',
  'peterandsons.com',
  'pragmaticplay.com',
  'hacksawgaming.com',
  'nolimitcity.com',
  'relax-gaming.com',
  'pushgaming.com',
  'playngo.com',
  'bgaming.com',
];

const SHOPPING_NOISE_TERMS = [
  'father', 'fathers', 'gift', 'gifts', 'gift-guide', 'gift guide',
  'dad', 'mothers', 'birthday', 'christmas', 'holiday', 'thanksgiving',
  'shirt', 't-shirt', 'tee', 'hoodie', 'mug', 'cup', 'poster',
  'amazon', 'etsy', 'walmart', 'ebay', 'shop', 'shopping', 'coupon',
  'sale', 'merch', 'merchandise', 'apparel', 'printable', 'template',
];

const HARD_BLOCKED_DOMAINS = [
  'amazon.', 'etsy.', 'walmart.', 'ebay.', 'redbubble.',
  'teepublic.', 'zazzle.', 'target.', 'pinterest.',
];

const SLOT_CONTEXT_TERMS = [
  'slot', 'slots', 'casino', 'game', 'demo', 'review', 'rtp',
  'volatility', 'max win', 'bonus buy', 'provider', 'reels',
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = (req.query.q || '').trim();
  const name = (req.query.name || '').trim();
  const provider = (req.query.provider || '').trim();
  const slotMode = req.query.slot === '1' || !!name || !!provider;
  const pretty = req.query.pretty === '1';

  const searchSeed = slotMode ? buildSlotSearchSeed({ query, name, provider, pretty }) : query;
  if (!searchSeed) {
    return res.status(400).json({ error: 'Missing query parameter "q" or slot name.' });
  }

  const googleUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchSeed)}`;
  const bingUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(searchSeed)}&form=HDRSC2&first=1`;

  try {
    const queries = slotMode
      ? buildSlotQueries({ query, name, provider, pretty })
      : [query];

    const collected = [];
    const seen = new Set();

    for (const q of queries) {
      const batch = await fetchBingImages(q);
      for (const img of batch) {
        const key = normalizeUrl(img.url);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        collected.push({
          ...img,
          score: slotMode ? scoreSlotImage(img, { name, provider, query }) : 0,
          query: q,
        });
      }

      if (slotMode && collected.filter(img => img.score >= 6).length >= 12) break;
      if (!slotMode && collected.length >= 30) break;
    }

    const images = slotMode
      ? collected
          .filter(img => img.score >= 4)
          .sort((a, b) => b.score - a.score)
          .slice(0, 30)
      : collected.slice(0, 30);

    return res.status(200).json({
      images,
      totalResults: images.length,
      startIndex: 1,
      query: searchSeed,
      googleUrl,
      bingUrl,
      slotMode,
    });
  } catch (err) {
    console.error('[image-search] fetch error:', err);
    return res.status(500).json({ error: 'Failed to search images.', googleUrl, bingUrl });
  }
}

function buildSlotSearchSeed({ query, name, provider, pretty }) {
  const n = name || stripSlotWords(query);
  const p = provider || '';
  const exactName = n ? `"${n}"` : '';
  const exactProvider = p ? `"${p}"` : '';
  return [exactName, exactProvider, 'slot', pretty ? 'artwork' : 'cover'].filter(Boolean).join(' ');
}

function buildSlotQueries({ query, name, provider, pretty }) {
  const n = name || stripSlotWords(query);
  const p = provider || '';
  const quotedName = n ? `"${n}"` : '';
  const quotedProvider = p ? `"${p}"` : '';
  const artTerm = pretty ? 'slot artwork' : 'slot cover';

  return [
    [quotedName, quotedProvider, artTerm].filter(Boolean).join(' '),
    [quotedName, quotedProvider, 'casino slot game'].filter(Boolean).join(' '),
    [quotedName, quotedProvider, 'slot review'].filter(Boolean).join(' '),
    quotedName ? `site:slotcatalog.com ${quotedName} ${quotedProvider}`.trim() : '',
    quotedName ? `site:bigwinboard.com ${quotedName} ${quotedProvider}`.trim() : '',
    query,
  ].filter(Boolean);
}

async function fetchBingImages(query) {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1&adlt=strict`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    console.error('[image-search] Bing returned status:', response.status);
    return [];
  }

  const html = await response.text();
  const images = [];
  const mRegex = /class="iusc"[^>]*m="([^"]+)"/g;
  let match;

  while ((match = mRegex.exec(html)) !== null && images.length < 30) {
    try {
      const data = JSON.parse(decodeHtml(match[1]));
      if (data.murl) {
        images.push({
          url: data.murl,
          thumb: data.turl || data.murl,
          title: data.t || '',
          sourceUrl: data.purl || '',
          width: data.mw || null,
          height: data.mh || null,
        });
      }
    } catch {
      // skip malformed tiles
    }
  }

  if (images.length === 0) {
    const imgRegex = /mediaurl=([^&"]+)/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null && images.length < 30) {
      try {
        const imgUrl = decodeURIComponent(imgMatch[1]);
        if (imgUrl.startsWith('http')) {
          images.push({ url: imgUrl, thumb: imgUrl, title: '', sourceUrl: '', width: null, height: null });
        }
      } catch {
        // skip malformed URLs
      }
    }
  }

  return images;
}

function scoreSlotImage(image, context) {
  const title = normalizeText(image.title);
  const url = normalizeText(image.url);
  const sourceUrl = normalizeText(image.sourceUrl);
  const haystack = `${title} ${url} ${sourceUrl}`;
  const sourceDomain = getDomain(image.sourceUrl || image.url);
  const slotName = normalizeText(context.name || stripSlotWords(context.query));
  const nameTokens = tokenize(slotName);
  const providerTokens = tokenize(context.provider);
  const hasShoppingNoise = SHOPPING_NOISE_TERMS.some(term => haystack.includes(term) && !slotName.includes(term));

  if (HARD_BLOCKED_DOMAINS.some(domain => sourceDomain.includes(domain))) return -100;
  if (hasShoppingNoise) return -40;

  let score = 0;
  const matchedNameTokens = nameTokens.filter(token => haystack.includes(token)).length;
  const matchedProviderTokens = providerTokens.filter(token => haystack.includes(token)).length;

  if (nameTokens.length && matchedNameTokens === nameTokens.length) score += 10;
  else score += matchedNameTokens * 2;

  if (providerTokens.length && matchedProviderTokens === providerTokens.length) score += 5;
  else score += matchedProviderTokens;

  if (SLOT_CONTEXT_TERMS.some(term => haystack.includes(term))) score += 4;
  if (TRUSTED_SLOT_DOMAINS.some(domain => sourceDomain.endsWith(domain) || sourceDomain.includes(domain))) score += 4;
  if (/\.(webp|png|jpe?g)(\?|$)/i.test(image.url)) score += 1;
  if (Number(image.height) > Number(image.width)) score += 1;

  return score;
}

function decodeHtml(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'");
}

function stripSlotWords(text = '') {
  return String(text)
    .replace(/\b(slot|slots|casino|game|cover|artwork|review|demo|rtp|stake)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text = '') {
  return normalizeText(text)
    .split(/\s+/)
    .filter(token => token.length > 1 && !['and', 'the', 'for', 'with'].includes(token));
}

function normalizeText(text = '') {
  return String(text).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeUrl(url = '') {
  return String(url).trim().replace(/[?#].*$/, '');
}

function getDomain(rawUrl = '') {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}
