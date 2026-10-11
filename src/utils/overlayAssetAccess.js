export function canonicalTheme(value) {
  const key = String(value || '').toLowerCase().replace(/^theme_/, '');
  return { ice: 'arctic', greek: 'old_rome', space: 'orbital' }[key] || key;
}

export function usesOverlayAsset(config, asset) {
  if (!config) return false;
  if (asset.kind !== 'theme') {
    const decode = text => {
      return text.replace(/(?:%[0-9a-f]{2})+/gi, chunk => { try { return decodeURIComponent(chunk); } catch { return chunk; } }).toLowerCase();
    };
    return decode(JSON.stringify(config)).includes(decode(String(asset.key)).split(/[?#]/)[0]);
  }
  if (typeof config !== 'object') return false;
  return Object.entries(config).some(([key, value]) => (
    ['colourTheme', 'colour', 'theme', 'betTheme'].includes(key)
      && typeof value === 'string' && canonicalTheme(value) === canonicalTheme(asset.key)
  ) || (value && typeof value === 'object' && usesOverlayAsset(value, asset)));
}

export function blockedOverlayAsset(config, assets) {
  return assets?.find(asset => !asset.allowed && usesOverlayAsset(config, asset));
}

export function canUseOverlayAsset(assets, kind, key) {
  if (!assets) return false;
  return !assets.some(asset => !asset.allowed && (kind === 'theme'
    ? asset.kind === kind && canonicalTheme(asset.key) === canonicalTheme(key)
    : asset.kind !== 'theme' && usesOverlayAsset(key, asset)));
}
