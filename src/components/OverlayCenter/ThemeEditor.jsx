/**
 * ThemeEditor.jsx — Full customization engine.
 * All updates persist to DB & reflect in OBS overlay via realtime.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MetricCard, PreviewPanel, SectionHeader, StatusBadge } from './ui';

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

  const activePreset = draft.style_preset || 'custom';
  const canvasLabel = `${draft.canvas_width || 1920}x${draft.canvas_height || 1080}`;

  return (
    <div className="oc-theme-panel oc-theme-panel--modern">
      <SectionHeader
        eyebrow="Fine Tune"
        title="Advanced theme controls"
        description="Shape the overlay system without changing the product palette. Colors stay available for expert overrides, but layout, type, motion, and canvas come first."
        pill={<StatusBadge tone="active">Palette preserved</StatusBadge>}
      />

      <div className="oc-theme-summary-grid">
        <MetricCard label="Preset" value={activePreset} meta="Current surface treatment" />
        <MetricCard label="Canvas" value={canvasLabel} meta="OBS browser-source size" />
        <MetricCard label="Motion" value={`${draft.animation_speed ?? 1}x`} meta="Global animation speed" />
      </div>

      <PreviewPanel title="Theme preview" subtitle="Quick surface check before the changes hit OBS.">
        <div className="oc-theme-preview-card" style={{
          '--preview-bg': draft.secondary_color || draft.primary_color || 'var(--oc-bg-card)',
          '--preview-accent': draft.accent_color || 'var(--oc-accent-light)',
          '--preview-text': draft.text_color || 'var(--oc-text-primary)',
          '--preview-radius': `${draft.border_radius ?? 14}px`,
          '--preview-opacity': draft.opacity ?? 0.85,
        }}>
          <div className="oc-theme-preview-card__bar" />
          <div className="oc-theme-preview-card__body">
            <strong>Overlay card</strong>
            <span>Typography, radius, blur, shadow, and motion apply across widgets.</span>
          </div>
        </div>
      </PreviewPanel>

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

      {/* Sliders */}
      <section className="oc-theme-section">
        <h3 className="oc-theme-section-title">Surface, Motion & Shape</h3>
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
        <h3 className="oc-theme-section-title">Background Texture</h3>
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

      <details className="oc-theme-section oc-theme-advanced">
        <summary className="oc-theme-advanced__summary">
          <span>Advanced color controls</span>
          <em>Expert overrides only</em>
        </summary>
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
      </details>

      {/* Canvas Resolution */}
      <section className="oc-theme-section">
        <h3 className="oc-theme-section-title">Canvas Resolution</h3>
        <p className="oc-config-hint" style={{ marginBottom: 8, fontSize: 11, color: '#94a3b8' }}>
          Match this to your OBS Browser Source size.
        </p>
        <div className="oc-texture-row">
          {[
            { w: 1920, h: 1080, label: '1920×1080' },
            { w: 2560, h: 1440, label: '2560×1440' },
          ].map(r => (
            <button
              key={r.label}
              className={`oc-texture-btn ${(draft.canvas_width || 1920) === r.w ? 'oc-texture-btn--active' : ''}`}
              onClick={() => { update('canvas_width', r.w); update('canvas_height', r.h); }}
            >{r.label}</button>
          ))}
        </div>
      </section>

      {/* Custom CSS */}
      <details className="oc-theme-section oc-theme-advanced">
        <summary className="oc-theme-advanced__summary">
          <span>Custom CSS</span>
          <em>Advanced overrides</em>
        </summary>
        <textarea
          className="oc-custom-css"
          rows={5}
          value={draft.custom_css || ''}
          onChange={e => update('custom_css', e.target.value)}
          placeholder=".oc-widget-inner { /* your overrides */ }"
        />
      </details>
    </div>
  );
}
