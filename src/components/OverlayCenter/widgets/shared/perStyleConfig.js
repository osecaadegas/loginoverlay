/**
 * perStyleConfig.js — Generic per-style config save/load/swap.
 *
 * Each widget passes its own list of visual keys. The helper stores
 * snapshots inside `config.styleConfigs[styleId]` and restores them
 * when the user cycles to another style.
 */

/** Save visual keys into styleConfigs[styleId] */
export function saveStyleConfig(config, styleId, keys) {
  const snapshot = {};
  keys.forEach(k => { if (config[k] !== undefined) snapshot[k] = config[k]; });
  return {
    ...config,
    styleConfigs: { ...(config.styleConfigs || {}), [styleId]: snapshot },
  };
}

/** Load visual keys from styleConfigs[styleId] back to top-level */
export function loadStyleConfig(config, styleId) {
  const saved = config.styleConfigs?.[styleId];
  if (!saved) return config;
  return { ...config, ...saved };
}

/**
 * Full swap: snapshot oldStyle → restore newStyle → set styleKey.
 * @param {object} config      current widget config
 * @param {string} oldStyle    style id being left
 * @param {string} newStyle    style id being entered
 * @param {string[]} keys      visual keys to save/restore
 * @param {string} styleKey    config key that holds the style id (default: 'displayStyle')
 */
export function swapStyleConfig(config, oldStyle, newStyle, keys, styleKey = 'displayStyle') {
  let next = saveStyleConfig(config, oldStyle, keys);
  next = loadStyleConfig(next, newStyle);
  next[styleKey] = newStyle;
  return next;
}

/**
 * Wraps a plain `set(key, val)` so it also persists to styleConfigs[currentStyle].
 * Call once in the config component and use the returned `set` / `setMulti`.
 */
export function makePerStyleSetters(onChange, config, currentStyle, perStyleKeys) {
  const set = (key, val) => {
    const updated = { ...config, [key]: val };
    if (perStyleKeys.includes(key)) {
      const sc = { ...(updated.styleConfigs || {}) };
      sc[currentStyle] = { ...(sc[currentStyle] || {}), [key]: val };
      updated.styleConfigs = sc;
    }
    onChange(updated);
  };

  const setMulti = (obj) => {
    const updated = { ...config, ...obj };
    const styleUpdates = {};
    Object.keys(obj).forEach(k => {
      if (perStyleKeys.includes(k)) styleUpdates[k] = obj[k];
    });
    if (Object.keys(styleUpdates).length > 0) {
      const sc = { ...(updated.styleConfigs || {}) };
      sc[currentStyle] = { ...(sc[currentStyle] || {}), ...styleUpdates };
      updated.styleConfigs = sc;
    }
    onChange(updated);
  };

  return { set, setMulti };
}
