import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { themeMap } from '../data/appThemes';

const ThemeContext = createContext(null);

/** Determine FX animation name from theme id */
function getFxAnimation(themeId) {
  if (!themeId || !themeId.startsWith('fx-')) return 'none';
  if (themeId.includes('pulse')) return 'rgb-pulse';
  if (themeId.includes('neon')) return 'neon-pulse';
  if (themeId.includes('fire') || themeId.includes('inferno') || themeId.includes('magma')) return 'fire-pulse';
  if (themeId.includes('rainbow') || themeId.includes('disco') || themeId.includes('holographic') || themeId.includes('prism')) return 'rainbow-flash';
  if (themeId.includes('glitch') || themeId.includes('corrupted')) return 'glitch-scroll';
  if (themeId.includes('lightning') || themeId.includes('thunder')) return 'lightning-flash';
  if (themeId.includes('stripe') || themeId.includes('retro') || themeId.includes('danger') || themeId.includes('electric')) return 'stripe-scroll';
  return 'rgb-pulse';
}

/** Apply a theme's CSS variables to the document root */
function applyThemeToDOM(themeId, theme) {
  if (!theme) return;
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', theme.colors.primary);
  root.style.setProperty('--theme-secondary', theme.colors.secondary);
  root.style.setProperty('--theme-accent', theme.colors.accent);
  root.style.setProperty('--theme-background', theme.colors.background);
  root.style.setProperty('--theme-text', theme.colors.text);
  root.style.setProperty('--theme-panel-bg', theme.colors.panelBg);
  root.style.setProperty('--theme-border', theme.colors.border);
  root.style.setProperty('--theme-font', theme.font);

  // FX border animation
  const animation = getFxAnimation(themeId);
  root.style.setProperty('--theme-border-animation', animation);
  if (themeId && themeId.startsWith('fx-')) {
    document.body.classList.add('fx-theme-active');
  } else {
    document.body.classList.remove('fx-theme-active');
  }

  // Apply background to body
  document.body.style.background = theme.colors.background;
}

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('selectedTheme') || 'default';
  });

  // Apply theme on mount and when it changes
  useEffect(() => {
    const theme = themeMap[currentTheme];
    if (theme) {
      applyThemeToDOM(currentTheme, theme);
    }
    // Also keep the window.THEME_DEFINITIONS reference for backward compatibility
    window.THEME_DEFINITIONS = themeMap;
  }, [currentTheme]);

  // Listen for external themeChanged events (overlay system, customization panel)
  useEffect(() => {
    const handleExternalThemeChange = (e) => {
      const themeId = e.detail?.theme;
      if (themeId && themeMap[themeId]) {
        setCurrentTheme(themeId);
        localStorage.setItem('selectedTheme', themeId);
      }
    };
    window.addEventListener('themeChanged', handleExternalThemeChange);
    return () => window.removeEventListener('themeChanged', handleExternalThemeChange);
  }, []);

  const setTheme = useCallback((themeId) => {
    if (!themeMap[themeId]) return;
    setCurrentTheme(themeId);
    localStorage.setItem('selectedTheme', themeId);
    // Dispatch event for backward compatibility with overlay system
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: themeId } }));
  }, []);

  const value = { currentTheme, setTheme, themes: themeMap };

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
