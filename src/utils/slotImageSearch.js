const clean = (value) => String(value || '').trim();

export function buildSlotImageSearchUrl({ name, provider, pretty = false, query } = {}) {
  const params = new URLSearchParams();
  const slotName = clean(name);
  const slotProvider = clean(provider);
  const fallbackQuery = clean(query) || [slotProvider, slotName, 'slot', pretty ? 'artwork' : 'cover'].filter(Boolean).join(' ');

  params.set('slot', '1');
  if (slotName) params.set('name', slotName);
  if (slotProvider) params.set('provider', slotProvider);
  if (fallbackQuery) params.set('q', fallbackQuery);
  if (pretty) params.set('pretty', '1');

  return `/api/image-search?${params.toString()}`;
}

export function buildGoogleSlotImageSearchUrl({ name, provider, pretty = false } = {}) {
  const slotName = clean(name);
  const slotProvider = clean(provider);
  const query = [
    slotName ? `"${slotName}"` : '',
    slotProvider ? `"${slotProvider}"` : '',
    'slot',
    pretty ? 'artwork' : 'cover',
  ].filter(Boolean).join(' ');

  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}
