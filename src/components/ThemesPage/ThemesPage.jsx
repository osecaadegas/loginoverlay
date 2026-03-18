import { useState } from 'react';
import { themeList, metallicPresets } from '../../data/appThemes';
import { useTheme } from '../../context/ThemeContext';
import './ThemesPage.css';

/* ── Theme descriptions for the cards ── */
const DESC = {
  classic:     'Clean modern look with subtle glass surfaces and neutral tones.',
  metallic:    'Brushed-metal surfaces with a sweeping sheen highlight.',
  carbon:      'Carbon-fibre weave texture, matte dark panels, sharp accent lines.',
  retro:       'Pixel-art inspired with warm CRT glow and scan-line overlays.',
  futuristic:  'Holographic glows, neon edges, translucent panels with blur.',
};

/* ── Material icons (emoji) ── */
const ICON = {
  classic:    '🎯',
  metallic:   '⚙️',
  carbon:     '🏎️',
  retro:      '🕹️',
  futuristic: '🚀',
};

export default function ThemesPage({ onApply }) {
  const { currentTheme, setTheme, metalColor, setMetalColor } = useTheme();
  const [hoveredTheme, setHoveredTheme] = useState(null);

  const handleSelect = (themeId) => {
    setTheme(themeId);
    localStorage.setItem('overlayTheme', themeId);
    if (onApply) onApply(themeId);
  };

  const handleMetalPick = (presetId) => {
    setMetalColor(presetId);
  };

  return (
    <div className="themes-page">
      <div className="themes-header">
        <h1>Themes</h1>
        <p>Choose a visual style — applies to all overlay widgets</p>
      </div>

      {/* ── Theme cards ── */}
      <div className="themes-grid">
        {themeList.map(t => {
          const isActive = t.id === currentTheme;
          const c = t.colors;
          return (
            <div
              key={t.id}
              className={`theme-card${isActive ? ' theme-card--active' : ''}`}
              onClick={() => handleSelect(t.id)}
              onMouseEnter={() => setHoveredTheme(t.id)}
              onMouseLeave={() => setHoveredTheme(null)}
              style={{ '--card-primary': c.primary, '--card-surface': c.surface, '--card-border': c.border, '--card-bg': c.background }}
            >
              {isActive && <div className="theme-card__check">&#10003;</div>}

              {/* Surface preview swatch */}
              <div className="theme-card__swatch" data-theme={t.id}>
                <div className="theme-card__swatch-bg" style={{ background: c.background }} />
                <div className="theme-card__mockup" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
                  <div className="theme-card__mockup-bar" style={{ background: c.primary }} />
                  <div className="theme-card__mockup-bar theme-card__mockup-bar--sm" style={{ background: c.accent }} />
                  <div className="theme-card__mockup-dots">
                    <span style={{ background: c.primary }} />
                    <span style={{ background: c.accent }} />
                    <span style={{ background: c.muted }} />
                  </div>
                </div>
              </div>

              <div className="theme-card__info">
                <div className="theme-card__icon">{ICON[t.id]}</div>
                <div className="theme-card__name">{t.name}</div>
                <div className="theme-card__desc">{DESC[t.id]}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Metallic colour picker (shown only when metallic theme is active) ── */}
      {currentTheme === 'metallic' && (
        <div className="metal-picker">
          <h3 className="metal-picker__title">Metal Colour</h3>
          <p className="metal-picker__hint">Pick the metallic tint for your widgets</p>
          <div className="metal-picker__grid">
            {Object.entries(metallicPresets).map(([id, preset]) => (
              <button
                key={id}
                className={`metal-swatch${metalColor === id ? ' metal-swatch--active' : ''}`}
                onClick={() => handleMetalPick(id)}
                style={{ '--swatch-bg': preset.gradient }}
                title={preset.label}
              >
                <span className="metal-swatch__label">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
