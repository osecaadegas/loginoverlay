import { getLocalProviderNames, getProviderIdentityKey, getProviderImage } from './gameProviders';

export const normalizeProviderName = value => String(value || '').trim().replace(/\s+/g, ' ');
const nameKey = value => normalizeProviderName(value).toLowerCase();
const identityKey = value => getProviderIdentityKey(value) || nameKey(value);

export function findCatalogProvider(entries, name) {
  const key = nameKey(name);
  if (!key) return null;
  const exact = entries.filter(entry => [entry.name, ...(entry.aliases || [])].some(alias => nameKey(alias) === key));
  if (exact.length) return exact.find(entry => entry.is_active !== false) || exact[0];
  const identity = identityKey(name);
  const matches = entries.filter(entry => [entry.name, ...(entry.aliases || [])].some(alias => identityKey(alias) === identity));
  return matches.length === 1 ? matches[0] : null;
}

export function buildSlotProviderCatalog(managed = [], counts = [], localNames = getLocalProviderNames()) {
  const entries = managed.map(row => ({
    ...row, name: normalizeProviderName(row.name), aliases: [...new Set([row.name, ...(row.aliases || [])])], slot_count: 0,
  }));
  for (const name of [...localNames, ...counts.map(row => row.provider)]) {
    if (!normalizeProviderName(name)) continue;
    let entry = findCatalogProvider(entries, name);
    if (!entry) {
      entry = { name: normalizeProviderName(name), aliases: [], logo_url: null, website_url: '', is_active: true, slot_count: 0 };
      entries.push(entry);
    }
    if (!entry.aliases.includes(name)) entry.aliases.push(name);
  }
  for (const row of counts) {
    const entry = findCatalogProvider(entries, row.provider);
    if (entry) entry.slot_count += Number(row.slot_count) || 0;
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveCatalogProviderLogo(entries, name) {
  const provider = findCatalogProvider(entries, name);
  if (provider?.is_active === false) return null;
  // An empty managed URL explicitly removes the logo; null keeps the local fallback.
  if (provider?.logo_url != null) return provider.logo_url || null;
  return getProviderImage(provider?.name || name);
}
