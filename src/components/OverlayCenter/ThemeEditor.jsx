/**
 * ThemeEditor.jsx — Full customization engine.
 * All updates persist to DB & reflect in OBS overlay via realtime.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';

const PRESETS = {
  glass: { opacity: 0.85, blur_intensity: 14, shadow_strength: 0.4, glow_intensity: 0.3, bg_texture: 'none', border_radius: 14 },
  matte: { opacity: 1, blur_intensity: 0, shadow_strength: 0.6, glow_intensity: 0, bg_texture: 'none', border_radius: 8 },
  neon:  { opacity: 0.7, blur_intensity: 10, shadow_strength: 0.3, glow_intensity: 0.9, bg_texture: 'none', border_radius: 16 },
};

const FONTS = ['Inter', 'Poppins', 'Roboto', 'Montserrat', 'Oswald', 'Rajdhani', 'Orbitron', 'Play', 'Bebas Neue'];

export default function ThemeEditor({ theme, onSave }) {
  const [draft, setDraft] = useState(theme || {});
  const debounceRef = useRef(null);

  useEffect(() => { if (theme) setDraft(theme); }, [theme]);

  const update = useCallback((key, value) => {
    setDraft(prev => {
      const next = { ...prev, [key]: value };

      // Debounce save
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSave({ [key]: value });
      }, 400);

      return next;
    });
  }, [onSave]);

  const applyPreset = useCallback((name) => {
    const p = PRESETS[name];
    if (!p) return;
    setDraft(prev => ({ ...prev, ...p, style_preset: name }));
    onSave({ ...p, style_preset: name });
  }, [onSave]);

  return (
    <div className="oc-theme-panel">
      <div className="oc-panel-header">
        <h2 className="oc-panel-title">🎨 Theme & Customization</h2>
      </div>

      {/* Presets */}
      <section className="oc-theme-section">
        <h3 className="oc-theme-section-title">Style Presets</h3>
        <div className="oc-preset-row">
          {Object.keys(PRESETS).map(name => (
            <button
              key={name}
              className={`oc-preset-btn ${draft.style_preset === name ? 'oc-preset-btn--active' : ''}`}
              onClick={() => applyPreset(name)}
            >
              {name === 'glass' && '🔮'} {name === 'matte' && '🖤'} {name === 'neon' && '⚡'} {name}
            </button>
          ))}
        </div>
      </section>

      {/* Colors */}
      <section className="oc-theme-section">
        <h3 className="oc-theme-section-title">Colors</h3>
        <div className="oc-color-grid">
          {[
            { key: 'primary_color', label: 'Primary' },
            { key: 'secondary_color', label: 'Secondary' },
            { key: 'accent_color', label: 'Accent' },
            { key: 'text_color', label: 'Text' },
          ].map(c => (
            <label key={c.key} className="oc-color-field">
              <input type="color" value={draft[c.key] || '#ffffff'} onChange={e => update(c.key, e.target.value)} />
              <span>{c.label}</span>
              <code>{draft[c.key]}</code>
            </label>
          ))}
        </div>
      </section>

      {/* Sliders */}
      <section className="oc-theme-section">
        <h3 className="oc-theme-section-title">Visual Effects</h3>
        <div className="oc-slider-grid">
          {[
            { key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.05 },
            { key: 'blur_intensity', label: 'Blur', min: 0, max: 30, step: 1 },
            { key: 'shadow_strength', label: 'Shadow', min: 0, max: 1, step: 0.05 },
            { key: 'glow_intensity', label: 'Glow', min: 0, max: 1, step: 0.05 },
            { key: 'border_radius', label: 'Radius', min: 0, max: 32, step: 1 },
            { key: 'animation_speed', label: 'Anim Speed', min: 0.2, max: 3, step: 0.1 },
          ].map(s => (
            <label key={s.key} className="oc-slider-field">
              <span className="oc-slider-label">{s.label}</span>
              <input
                type="range"
                min={s.min} max={s.max} step={s.step}
                value={draft[s.key] ?? s.min}
                onChange={e => update(s.key, +e.target.value)}
              />
              <span className="oc-slider-value">{draft[s.key] ?? s.min}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Font */}
      <section className="oc-theme-section">
        <h3 className="oc-theme-section-title">Typography</h3>
        <div className="oc-font-row">
          <select value={draft.font_family || 'Inter'} onChange={e => update('font_family', e.target.value)} className="oc-select">
            {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={draft.font_weight || 500} onChange={e => update('font_weight', +e.target.value)} className="oc-select">
            {[300, 400, 500, 600, 700, 800, 900].map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </section>

      {/* Texture */}
      <section className="oc-theme-section">
        <h3 className="oc-theme-section-title">Background</h3>
        <div className="oc-texture-row">
          {['none', 'dots', 'grid', 'noise', 'diagonal'].map(t => (
            <button
              key={t}
              className={`oc-texture-btn ${draft.bg_texture === t ? 'oc-texture-btn--active' : ''}`}
              onClick={() => update('bg_texture', t)}
            >{t}
            </button>
          ))}
        </div>
      </section>

      {/* Custom CSS */}
      <section className="oc-theme-section">
        <h3 className="oc-theme-section-title">Custom CSS</h3>
        <textarea
          className="oc-custom-css"
          rows={5}
          value={draft.custom_css || ''}
          onChange={e => update('custom_css', e.target.value)}
          placeholder=".oc-widget-inner { /* your overrides */ }"
        />
      </section>
    </div>
  );
}
