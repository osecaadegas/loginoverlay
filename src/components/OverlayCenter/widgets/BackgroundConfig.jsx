import React, { useState } from 'react';

/* ─── Texture options ─── */
const TEXTURE_OPTIONS = [
  { value: 'gradient',   label: '🌈 Gradient',   desc: 'Smooth color blend' },
  { value: 'metallic',   label: '⚙️ Metallic',   desc: 'Brushed metal look' },
  { value: 'pearl',      label: '✨ Pearl',       desc: 'Soft iridescent sheen' },
  { value: 'gloss',      label: '💎 Gloss',       desc: 'Shiny highlight band' },
  { value: 'chameleon',  label: '🦎 Chameleon',   desc: 'Animated color shift' },
  { value: 'radial',     label: '🔵 Radial',      desc: 'Center-out glow' },
  { value: 'conic',      label: '🌀 Conic',       desc: 'Rotating sweep' },
  { value: 'vignette',   label: '🎬 Vignette',    desc: 'Dark edges, bright center' },
  { value: 'dots',       label: '⬤ Dots',        desc: 'Polka dot pattern' },
  { value: 'grid',       label: '🔲 Grid',        desc: 'Grid lines overlay' },
  { value: 'diagonal',   label: '⧸ Diagonal',     desc: 'Striped lines' },
  { value: 'noise',      label: '📺 Noise',       desc: 'Film grain texture' },
  { value: 'carbon',     label: '🏁 Carbon',      desc: 'Carbon fiber weave' },
  { value: 'scanlines',  label: '📡 Scanlines',   desc: 'Retro CRT lines' },
  { value: 'none',       label: '🚫 None',        desc: 'Solid color only' },
];

const FIT_OPTIONS = [
  { value: 'cover', label: 'Cover (fill)' },
  { value: 'contain', label: 'Contain (fit)' },
  { value: 'fill', label: 'Stretch' },
  { value: 'none', label: 'Original size' },
];

const POSITION_OPTIONS = [
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'top left', label: 'Top Left' },
  { value: 'top right', label: 'Top Right' },
  { value: 'bottom left', label: 'Bottom Left' },
  { value: 'bottom right', label: 'Bottom Right' },
];

/* ─── Helpers ─── */
function ColorPicker({ label, value, onChange }) {
  return (
    <label className="nb-color-item">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} />
      <span>{label}</span>
    </label>
  );
}

function SliderField({ label, value, onChange, min = 0, max = 100, step = 1, suffix = '' }) {
  return (
    <label className="nb-slider-field">
      <span>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
        <span className="nb-slider-val">{value}{suffix}</span>
      </div>
    </label>
  );
}

export default function BackgroundConfig({ config, onChange, allWidgets }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [activeTab, setActiveTab] = useState('source');

  /* ─── Navbar sync ─── */
  const navbarConfig = (allWidgets || []).find(w => w.widget_type === 'navbar')?.config || null;
  const syncFromNavbar = () => {
    if (!navbarConfig) return;
    setMulti({
      color1: navbarConfig.bgColor || '#0f172a',
      color2: navbarConfig.accentColor || '#1e3a5f',
    });
  };

  /* ─── Preset system ─── */
  const [presetName, setPresetName] = useState('');
  const PRESET_KEYS = [
    'bgMode', 'textureType', 'color1', 'color2', 'color3',
    'gradientAngle', 'patternSize', 'animSpeed',
    'imageUrl', 'videoUrl', 'imageFit', 'imagePosition',
    'opacity', 'borderRadius',
    'brightness', 'contrast', 'saturation', 'blur', 'hueRotate', 'grayscale', 'sepia',
    'overlayColor', 'overlayOpacity',
    'fxParticles', 'fxParticleColor', 'fxParticleCount', 'fxParticleSpeed', 'fxParticleSize',
    'fxFog', 'fxFogColor',
    'fxGlimpse', 'fxGlimpseColor', 'fxGlimpseSpeed',
  ];

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const snapshot = {};
    PRESET_KEYS.forEach(k => { if (c[k] !== undefined) snapshot[k] = c[k]; });
    const existing = c.bgPresets || [];
    const idx = existing.findIndex(p => p.name === name);
    const updated = idx >= 0
      ? existing.map((p, i) => i === idx ? { name, values: snapshot, savedAt: Date.now() } : p)
      : [...existing, { name, values: snapshot, savedAt: Date.now() }];
    set('bgPresets', updated);
    setPresetName('');
  };
  const loadPreset = (preset) => setMulti(preset.values);
  const deletePreset = (name) => set('bgPresets', (c.bgPresets || []).filter(p => p.name !== name));

  /* ─── Built-in quick-start presets ─── */
  const quickPresets = [
    { name: 'Dark Gradient', values: { bgMode: 'texture', textureType: 'gradient', color1: '#0f172a', color2: '#1e293b', color3: '#0f172a', gradientAngle: 135 } },
    { name: 'Purple Haze', values: { bgMode: 'texture', textureType: 'gradient', color1: '#1a0533', color2: '#6366f1', color3: '#1a0533', gradientAngle: 135 } },
    { name: 'Neon Chameleon', values: { bgMode: 'texture', textureType: 'chameleon', color1: '#6366f1', color2: '#06b6d4', color3: '#a855f7', animSpeed: 8 } },
    { name: 'Metallic Dark', values: { bgMode: 'texture', textureType: 'metallic', color1: '#111111', color2: '#333333' } },
    { name: 'Pearl White', values: { bgMode: 'texture', textureType: 'pearl', color1: '#e8e0f0', color2: '#f5f0ff', color3: '#e0e8ff' } },
    { name: 'Glossy Blue', values: { bgMode: 'texture', textureType: 'gloss', color1: '#0a0f1e', color2: '#1e3a8a' } },
    { name: 'Carbon Fiber', values: { bgMode: 'texture', textureType: 'carbon', color1: '#111111', color2: 'rgba(255,255,255,0.04)' } },
    { name: 'CRT Retro', values: { bgMode: 'texture', textureType: 'scanlines', color1: '#0a0a1a', color2: 'rgba(0,0,0,0.2)' } },
    { name: 'Cinema Vignette', values: { bgMode: 'texture', textureType: 'vignette', color1: '#000000', color2: '#1a1a2e' } },
  ];

  /* ─── Effects quick presets ─── */
  const fxQuickPresets = [
    { name: '❄️ Snowfall', values: { fxParticles: 'snow', fxParticleColor: '#ffffff', fxParticleCount: 40, fxParticleSpeed: 40, fxParticleSize: 50 } },
    { name: '🌧️ Rain', values: { fxParticles: 'rain', fxParticleColor: '#94a3b8', fxParticleCount: 50, fxParticleSpeed: 70, fxParticleSize: 30 } },
    { name: '✨ Fireflies', values: { fxParticles: 'fireflies', fxParticleColor: '#fbbf24', fxParticleCount: 15, fxParticleSpeed: 30, fxParticleSize: 40 } },
    { name: '🔮 Orbs', values: { fxParticles: 'orbs', fxParticleColor: '#a855f7', fxParticleCount: 20, fxParticleSpeed: 35, fxParticleSize: 50 } },
    { name: '💫 Bokeh', values: { fxParticles: 'bokeh', fxParticleColor: '#f59e0b', fxParticleCount: 12, fxParticleSpeed: 25, fxParticleSize: 60 } },
    { name: '🌫️ Light Fog', values: { fxFog: 'light', fxFogColor: '#1e293b' } },
    { name: '💨 Heavy Smoke', values: { fxFog: 'heavy', fxFogColor: '#000000' } },
    { name: '🔦 Sweep', values: { fxGlimpse: 'sweep', fxGlimpseColor: '#ffffff', fxGlimpseSpeed: 50 } },
    { name: '💜 Pulse Glow', values: { fxGlimpse: 'pulse', fxGlimpseColor: '#a855f7', fxGlimpseSpeed: 40 } },
    { name: '⚡ Flicker', values: { fxGlimpse: 'flicker', fxGlimpseColor: '#fbbf24', fxGlimpseSpeed: 70 } },
  ];

  const tabs = [
    { id: 'source', label: '🖼️ Source' },
    { id: 'texture', label: '🎨 Texture' },
    { id: 'colors', label: '🌈 Colors' },
    { id: 'effects', label: '🌀 Effects' },
    { id: 'filters', label: '✨ Filters' },
    { id: 'presets', label: '💾 Presets' },
  ];

  return (
    <div className="bh-config">

      {/* Tab nav */}
      <div className="nb-tabs" style={{ marginTop: 4 }}>
        {tabs.map(t => (
          <button key={t.id}
            className={`nb-tab ${activeTab === t.id ? 'nb-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ SOURCE TAB ═══════ */}
      {activeTab === 'source' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Background Source</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>
            Choose a texture, image or video as your overlay background.
          </p>

          <div className="oc-bg-mode-grid">
            {[
              { id: 'texture', icon: '🎨', label: 'Texture' },
              { id: 'image', icon: '🖼️', label: 'Image URL' },
              { id: 'video', icon: '🎬', label: 'Video URL' },
            ].map(m => (
              <button key={m.id}
                className={`oc-bg-mode-btn ${(c.bgMode || 'texture') === m.id ? 'oc-bg-mode-btn--active' : ''}`}
                onClick={() => set('bgMode', m.id)}>
                <span style={{ fontSize: 20 }}>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Image URL input */}
          {(c.bgMode || 'texture') === 'image' && (
            <div style={{ marginTop: 10 }}>
              <label className="nb-field">
                <span>Image URL</span>
                <input value={c.imageUrl || ''} onChange={e => set('imageUrl', e.target.value)}
                  placeholder="https://example.com/my-background.jpg" />
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <label className="nb-field" style={{ flex: 1 }}>
                  <span>Fit</span>
                  <select value={c.imageFit || 'cover'} onChange={e => set('imageFit', e.target.value)}>
                    {FIT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </label>
                <label className="nb-field" style={{ flex: 1 }}>
                  <span>Position</span>
                  <select value={c.imagePosition || 'center'} onChange={e => set('imagePosition', e.target.value)}>
                    {POSITION_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </label>
              </div>
              {c.imageUrl && (
                <div style={{ marginTop: 8, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={c.imageUrl} alt="preview" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                </div>
              )}
            </div>
          )}

          {/* Video URL input */}
          {(c.bgMode || 'texture') === 'video' && (
            <div style={{ marginTop: 10 }}>
              <label className="nb-field">
                <span>Video URL</span>
                <input value={c.videoUrl || ''} onChange={e => set('videoUrl', e.target.value)}
                  placeholder="https://example.com/my-background.mp4" />
              </label>
              <p className="oc-config-hint" style={{ fontSize: 11 }}>
                Direct .mp4/.webm link. Video will autoplay, loop, and be muted.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <label className="nb-field" style={{ flex: 1 }}>
                  <span>Fit</span>
                  <select value={c.imageFit || 'cover'} onChange={e => set('imageFit', e.target.value)}>
                    {FIT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </label>
                <label className="nb-field" style={{ flex: 1 }}>
                  <span>Position</span>
                  <select value={c.imagePosition || 'center'} onChange={e => set('imagePosition', e.target.value)}>
                    {POSITION_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* Global opacity & radius */}
          <div style={{ marginTop: 12 }}>
            <SliderField label="Opacity" value={c.opacity ?? 100} onChange={v => set('opacity', v)} min={0} max={100} suffix="%" />
            <SliderField label="Border Radius" value={c.borderRadius ?? 0} onChange={v => set('borderRadius', v)} min={0} max={48} suffix="px" />
          </div>
        </div>
      )}

      {/* ═══════ TEXTURE TAB ═══════ */}
      {activeTab === 'texture' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Texture Style</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>
            Pick a texture. Colors are set in the Colors tab.
          </p>

          <div className="oc-bg-texture-grid">
            {TEXTURE_OPTIONS.map(t => (
              <button key={t.value}
                className={`oc-bg-texture-btn ${(c.textureType || 'gradient') === t.value ? 'oc-bg-texture-btn--active' : ''}`}
                onClick={() => set('textureType', t.value)}>
                <span className="oc-bg-texture-icon">{t.label.split(' ')[0]}</span>
                <span className="oc-bg-texture-name">{t.label.split(' ').slice(1).join(' ')}</span>
                <span className="oc-bg-texture-desc">{t.desc}</span>
              </button>
            ))}
          </div>

          {/* Extra controls for specific textures */}
          {['gradient', 'metallic', 'pearl', 'gloss', 'diagonal', 'conic'].includes(c.textureType || 'gradient') && (
            <SliderField label="Angle" value={c.gradientAngle ?? 135} onChange={v => set('gradientAngle', v)} min={0} max={360} suffix="°" />
          )}

          {['dots', 'grid', 'diagonal'].includes(c.textureType) && (
            <SliderField label="Pattern Size" value={c.patternSize ?? 20} onChange={v => set('patternSize', v)} min={4} max={80} suffix="px" />
          )}

          {c.textureType === 'chameleon' && (
            <SliderField label="Animation Speed" value={c.animSpeed ?? 8} onChange={v => set('animSpeed', v)} min={2} max={30} suffix="s" />
          )}
        </div>
      )}

      {/* ═══════ COLORS TAB ═══════ */}
      {activeTab === 'colors' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Colors</h4>

          {navbarConfig && (
            <button className="nb-preset-load-btn" onClick={syncFromNavbar} style={{ marginBottom: 10, width: '100%' }}>
              🔗 Sync Colors from Navbar
            </button>
          )}

          <div className="nb-color-grid">
            <ColorPicker label="Color 1" value={c.color1 || '#0f172a'} onChange={v => set('color1', v)} />
            <ColorPicker label="Color 2" value={c.color2 || '#1e293b'} onChange={v => set('color2', v)} />
            <ColorPicker label="Color 3" value={c.color3 || '#0f172a'} onChange={v => set('color3', v)} />
          </div>

          <h5 style={{ color: '#94a3b8', fontSize: 11, marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Color Overlay</h5>
          <p className="oc-config-hint" style={{ marginBottom: 6, fontSize: 11 }}>
            Tint the entire background with a semi-transparent color overlay.
          </p>
          <div className="nb-color-grid">
            <ColorPicker label="Overlay Color" value={c.overlayColor || '#000000'} onChange={v => set('overlayColor', v)} />
          </div>
          <SliderField label="Overlay Opacity" value={c.overlayOpacity ?? 0} onChange={v => set('overlayOpacity', v)} min={0} max={100} suffix="%" />

          <h4 className="nb-subtitle" style={{ marginTop: 18 }}>Custom CSS</h4>
          <p className="oc-config-hint" style={{ marginBottom: 6, fontSize: 11 }}>Override styles for this widget in OBS.</p>
          <textarea
            className="oc-widget-css-input"
            value={c.custom_css || ''}
            onChange={e => set('custom_css', e.target.value)}
            rows={4}
            placeholder={`/* custom CSS for this widget */`}
            spellCheck={false}
          />
        </div>
      )}

      {/* ═══════ EFFECTS TAB ═══════ */}
      {activeTab === 'effects' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Quick Effects</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>
            Apply animated overlays on top of your background.
          </p>
          <div className="oc-bg-quick-grid">
            {fxQuickPresets.map(p => (
              <button key={p.name} className="oc-bg-quick-btn" onClick={() => setMulti(p.values)}>
                {p.name}
              </button>
            ))}
          </div>
          <button className="nb-preset-load-btn" style={{ marginTop: 8, width: '100%', fontSize: 11 }}
            onClick={() => setMulti({ fxParticles: 'none', fxFog: 'none', fxGlimpse: 'none' })}>
            🚫 Clear All Effects
          </button>

          {/* ── Particles ── */}
          <h4 className="nb-subtitle" style={{ marginTop: 16 }}>Particles</h4>
          <label className="nb-field">
            <span>Type</span>
            <select value={c.fxParticles || 'none'} onChange={e => set('fxParticles', e.target.value)}>
              <option value="none">None</option>
              <option value="orbs">🔮 Floating Orbs</option>
              <option value="fireflies">✨ Fireflies</option>
              <option value="bokeh">💫 Bokeh Blur</option>
              <option value="snow">❄️ Snow</option>
              <option value="rain">🌧️ Rain</option>
            </select>
          </label>
          {(c.fxParticles && c.fxParticles !== 'none') && (
            <>
              <div className="nb-color-grid" style={{ marginTop: 4 }}>
                <ColorPicker label="Color" value={c.fxParticleColor || '#ffffff'} onChange={v => set('fxParticleColor', v)} />
              </div>
              <SliderField label="Count" value={c.fxParticleCount ?? 25} onChange={v => set('fxParticleCount', v)} min={5} max={80} />
              <SliderField label="Speed" value={c.fxParticleSpeed ?? 50} onChange={v => set('fxParticleSpeed', v)} min={0} max={100} suffix="%" />
              <SliderField label="Size" value={c.fxParticleSize ?? 50} onChange={v => set('fxParticleSize', v)} min={10} max={100} suffix="%" />
            </>
          )}

          {/* ── Fog / Smoke ── */}
          <h4 className="nb-subtitle" style={{ marginTop: 16 }}>Fog / Smoke</h4>
          <label className="nb-field">
            <span>Intensity</span>
            <select value={c.fxFog || 'none'} onChange={e => set('fxFog', e.target.value)}>
              <option value="none">None</option>
              <option value="light">🌫️ Light</option>
              <option value="medium">💨 Medium</option>
              <option value="heavy">🌑 Heavy</option>
            </select>
          </label>
          {(c.fxFog && c.fxFog !== 'none') && (
            <div className="nb-color-grid" style={{ marginTop: 4 }}>
              <ColorPicker label="Fog Color" value={c.fxFogColor || '#000000'} onChange={v => set('fxFogColor', v)} />
            </div>
          )}

          {/* ── Light Glimpse ── */}
          <h4 className="nb-subtitle" style={{ marginTop: 16 }}>Light Effects</h4>
          <label className="nb-field">
            <span>Type</span>
            <select value={c.fxGlimpse || 'none'} onChange={e => set('fxGlimpse', e.target.value)}>
              <option value="none">None</option>
              <option value="sweep">🔦 Light Sweep</option>
              <option value="pulse">💜 Pulse Glow</option>
              <option value="flicker">⚡ Flicker</option>
            </select>
          </label>
          {(c.fxGlimpse && c.fxGlimpse !== 'none') && (
            <>
              <div className="nb-color-grid" style={{ marginTop: 4 }}>
                <ColorPicker label="Light Color" value={c.fxGlimpseColor || '#ffffff'} onChange={v => set('fxGlimpseColor', v)} />
              </div>
              <SliderField label="Speed" value={c.fxGlimpseSpeed ?? 50} onChange={v => set('fxGlimpseSpeed', v)} min={0} max={100} suffix="%" />
            </>
          )}
        </div>
      )}

      {/* ═══════ FILTERS TAB ═══════ */}
      {activeTab === 'filters' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Image & Video Filters</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>
            Apply CSS filters. Works on textures, images and videos.
          </p>

          <SliderField label="Brightness" value={c.brightness ?? 100} onChange={v => set('brightness', v)} min={0} max={200} suffix="%" />
          <SliderField label="Contrast" value={c.contrast ?? 100} onChange={v => set('contrast', v)} min={0} max={200} suffix="%" />
          <SliderField label="Saturation" value={c.saturation ?? 100} onChange={v => set('saturation', v)} min={0} max={200} suffix="%" />
          <SliderField label="Blur" value={c.blur ?? 0} onChange={v => set('blur', v)} min={0} max={20} suffix="px" />
          <SliderField label="Hue Rotate" value={c.hueRotate ?? 0} onChange={v => set('hueRotate', v)} min={0} max={360} suffix="°" />
          <SliderField label="Grayscale" value={c.grayscale ?? 0} onChange={v => set('grayscale', v)} min={0} max={100} suffix="%" />
          <SliderField label="Sepia" value={c.sepia ?? 0} onChange={v => set('sepia', v)} min={0} max={100} suffix="%" />

          <button className="nb-preset-load-btn" style={{ marginTop: 10 }}
            onClick={() => setMulti({ brightness: 100, contrast: 100, saturation: 100, blur: 0, hueRotate: 0, grayscale: 0, sepia: 0 })}>
            Reset All Filters
          </button>
        </div>
      )}

      {/* ═══════ PRESETS TAB ═══════ */}
      {activeTab === 'presets' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Quick Start</h4>
          <div className="oc-bg-quick-grid">
            {quickPresets.map(p => (
              <button key={p.name} className="oc-bg-quick-btn" onClick={() => setMulti(p.values)}>
                {p.name}
              </button>
            ))}
          </div>

          <h4 className="nb-subtitle" style={{ marginTop: 16 }}>Saved Presets</h4>
          <div className="nb-preset-save-row">
            <input className="nb-preset-input"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder="Preset name…"
              maxLength={30}
              onKeyDown={e => e.key === 'Enter' && savePreset()} />
            <button className="nb-preset-save-btn" onClick={savePreset} disabled={!presetName.trim()}>💾 Save</button>
          </div>

          {(c.bgPresets || []).length === 0 ? (
            <p className="oc-config-hint" style={{ marginTop: 8, opacity: 0.6 }}>No saved presets yet.</p>
          ) : (
            <div className="nb-preset-list" style={{ marginTop: 8 }}>
              {(c.bgPresets || []).map(p => (
                <div key={p.name} className="nb-preset-pill">
                  <div className="nb-preset-pill__info">
                    <span className="nb-preset-pill__name">{p.name}</span>
                    <span className="nb-preset-pill__date">{new Date(p.savedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="nb-preset-pill__actions">
                    <button className="nb-preset-pill__load" onClick={() => loadPreset(p)}>Load</button>
                    <button className="nb-preset-pill__delete" onClick={() => deletePreset(p.name)} title="Delete preset">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
