import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { themeMap, metallicPresets } from '../data/appThemes';
import { useAuth } from './AuthContext';
import { supabase } from '../config/supabaseClient';

const ThemeContext = createContext(null);

/** Convert hex to r,g,b string */
function hexToRGB(hex) {
  if (!hex) return null;
  const m = hex.match(/^#([0-9a-f]{3,8})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  const n = parseInt(h.substring(0, 6), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** Apply the selected theme to <html> via data-theme + CSS vars */
function applyThemeToDOM(themeId, theme, metalColor) {
  if (!theme) return;
  const root = document.documentElement;

  // data-theme attribute drives all theme-system.css selectors
  root.setAttribute('data-theme', themeId);

  // Set --t-* variables (mirrors the CSS but allows per-user overrides)
  const c = theme.colors;
  root.style.setProperty('--t-primary', c.primary);
  root.style.setProperty('--t-secondary', c.secondary);
  root.style.setProperty('--t-accent', c.accent);
  root.style.setProperty('--t-bg', c.background);
  root.style.setProperty('--t-surface', c.surface);
  root.style.setProperty('--t-text', c.text);
  root.style.setProperty('--t-muted', c.muted);
  root.style.setProperty('--t-border', c.border);
  root.style.setProperty('--t-font', theme.font);

  // RGB splits
  const pRGB = hexToRGB(c.primary);
  const aRGB = hexToRGB(c.accent);
  const tRGB = hexToRGB(c.text);
  if (pRGB) root.style.setProperty('--t-primary-rgb', pRGB);
  if (aRGB) root.style.setProperty('--t-accent-rgb', aRGB);
  if (tRGB) root.style.setProperty('--t-text-rgb', tRGB);

  // Backward-compat --theme-* aliases used by dashboard pages
  root.style.setProperty('--theme-primary', c.primary);
  root.style.setProperty('--theme-secondary', c.secondary);
  root.style.setProperty('--theme-accent', c.accent);
  root.style.setProperty('--theme-background', c.background);
  root.style.setProperty('--theme-text', c.text);
  root.style.setProperty('--theme-panel-bg', c.surface);
  root.style.setProperty('--theme-border', c.border);
  root.style.setProperty('--theme-font', theme.font);
  if (pRGB) root.style.setProperty('--theme-primary-rgb', pRGB);
  if (tRGB) root.style.setProperty('--theme-text-rgb', tRGB);

  // Metallic tint
  if (themeId === 'metallic' && metalColor) {
    const preset = metallicPresets[metalColor];
    if (preset) {
      root.style.setProperty('--t-metal-hex', preset.hex);
      root.style.setProperty('--t-metal-gradient', preset.gradient);
      root.style.setProperty('--t-primary', preset.hex);
      const mRGB = hexToRGB(preset.hex);
      if (mRGB) root.style.setProperty('--t-primary-rgb', mRGB);
    }
  }

  // Remove old FX class
  document.body.classList.remove('fx-theme-active');
  document.body.style.background = c.background;
}

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('selectedTheme');
    return (saved && themeMap[saved]) ? saved : 'classic';
  });

  const [metalColor, setMetalColorState] = useState(() => {
    return localStorage.getItem('metallicColor') || 'chrome';
  });

  const [dbLoaded, setDbLoaded] = useState(false);
  const savePending = useRef(false);

  // ── Load theme from DB when user is authenticated ──
  useEffect(() => {
    if (!user) { setDbLoaded(false); return; }
    let cancelled = false;

    supabase
      .from('overlay_themes')
      .select('style_preset, metal_color')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const themeId = data.style_preset;
        if (themeId && themeMap[themeId]) {
          setCurrentTheme(themeId);
          localStorage.setItem('selectedTheme', themeId);
        }
        if (data.metal_color && metallicPresets[data.metal_color]) {
          setMetalColorState(data.metal_color);
          localStorage.setItem('metallicColor', data.metal_color);
        }
        setDbLoaded(true);
      })
      .catch(() => { setDbLoaded(true); });

    return () => { cancelled = true; };
  }, [user]);

  // ── Save theme to DB (debounced) ──
  const saveToDb = useCallback((themeId, metalPreset) => {
    if (!user) return;
    // Avoid writing during initial DB load
    if (!dbLoaded) return;
    if (savePending.current) return;
    savePending.current = true;

    const patch = {
      user_id: user.id,
      style_preset: themeId,
      metal_color: metalPreset,
      updated_at: new Date().toISOString(),
    };

    supabase
      .from('overlay_themes')
      .upsert(patch, { onConflict: 'user_id' })
      .then(() => { savePending.current = false; })
      .catch(() => { savePending.current = false; });
  }, [user, dbLoaded]);

  useEffect(() => {
    const theme = themeMap[currentTheme];
    if (theme) applyThemeToDOM(currentTheme, theme, metalColor);
    window.THEME_DEFINITIONS = themeMap;
  }, [currentTheme, metalColor]);

  // Cross-tab sync
  useEffect(() => {
    const handler = (e) => {
      const id = e.detail?.theme;
      if (id && themeMap[id]) {
        setCurrentTheme(id);
        localStorage.setItem('selectedTheme', id);
      }
      if (e.detail?.metalColor) {
        setMetalColorState(e.detail.metalColor);
        localStorage.setItem('metallicColor', e.detail.metalColor);
      }
    };
    window.addEventListener('themeChanged', handler);
    return () => window.removeEventListener('themeChanged', handler);
  }, []);

  const setTheme = useCallback((themeId) => {
    if (!themeMap[themeId]) return;
    setCurrentTheme(themeId);
    localStorage.setItem('selectedTheme', themeId);
    saveToDb(themeId, metalColor);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: themeId } }));
  }, [metalColor, saveToDb]);

  const setMetalColor = useCallback((color) => {
    setMetalColorState(color);
    localStorage.setItem('metallicColor', color);
    saveToDb(currentTheme, color);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: currentTheme, metalColor: color } }));
  }, [currentTheme, saveToDb]);

  const value = { currentTheme, setTheme, metalColor, setMetalColor, themes: themeMap };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
