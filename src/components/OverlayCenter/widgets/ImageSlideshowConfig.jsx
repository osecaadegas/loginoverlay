import React, { useState } from 'react';

const FONT_OPTIONS = [
  "'Inter', sans-serif",
  "'Roboto', sans-serif",
  "'Poppins', sans-serif",
  "'Montserrat', sans-serif",
  "'Fira Code', monospace",
  "'Arial', sans-serif",
  "'Georgia', serif",
];

const ANIM_OPTIONS = [
  { value: 'fade',  icon: '🌫️', label: 'Fade' },
  { value: 'slide', icon: '➡️', label: 'Slide' },
  { value: 'zoom',  icon: '🔍', label: 'Zoom' },
];

/* ─── Helpers ─── */
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

export default function ImageSlideshowConfig({ config, onChange, allWidgets }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const images = c.images || [];
  const [newUrl, setNewUrl] = useState('');
  const [activeTab, setActiveTab] = useState('images');

  /* ─── Navbar sync ─── */
  const navbarConfig = (allWidgets || []).find(w => w.widget_type === 'navbar')?.config || null;
  const syncFromNavbar = () => {
    if (!navbarConfig) return;
    setMulti({
      borderColor: navbarConfig.accentColor || 'rgba(51,65,85,0.5)',
      gradientColor: navbarConfig.bgColor || 'rgba(15,23,42,0.8)',
      captionColor: navbarConfig.textColor || '#e2e8f0',
    });
  };

  /* ─── Image CRUD ─── */
  const addImage = () => {
    const url = newUrl.trim();
    if (!url) return;
    set('images', [...images, url]);
    setNewUrl('');
  };
  const removeImage = (idx) => set('images', images.filter((_, i) => i !== idx));
  const moveImage = (idx, dir) => {
    const arr = [...images];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    set('images', arr);
  };

  const tabs = [
    { id: 'images',  label: '🖼️ Images' },
    { id: 'timing',  label: '⏱️ Timing' },
    { id: 'style',   label: '🎨 Style' },
    { id: 'caption', label: '💬 Caption' },
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

      {/* ═══════ IMAGES TAB ═══════ */}
      {activeTab === 'images' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Images ({images.length})</h4>
          <p className="oc-config-hint" style={{ marginBottom: 6 }}>
            Add image URLs. Images will always fill the widget area (cover mode).
          </p>

          <div className="ov-slide-cfg-images">
            {images.map((url, i) => (
              <div key={i} className="ov-slide-cfg-image-row">
                <img src={url} alt={`Slide ${i + 1}`} className="ov-slide-cfg-thumb" onError={e => { e.target.style.display = 'none'; }} />
                <span className="ov-slide-cfg-url" title={url}>{url.length > 40 ? url.slice(0, 40) + '...' : url}</span>
                <div className="ov-slide-cfg-image-actions">
                  <button onClick={() => moveImage(i, -1)} disabled={i === 0} title="Move up">↑</button>
                  <button onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} title="Move down">↓</button>
                  <button onClick={() => removeImage(i)} className="ov-slide-cfg-remove" title="Remove">✕</button>
                </div>
              </div>
            ))}

            <div className="ov-slide-cfg-add-row">
              <input
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addImage(); }}
                placeholder="Paste image URL..."
                className="ov-slide-cfg-add-input"
              />
              <button onClick={addImage} className="ov-slide-cfg-add-btn" disabled={!newUrl.trim()}>
                + Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ TIMING TAB ═══════ */}
      {activeTab === 'timing' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Slide Timing</h4>

          <SliderField label="Interval" value={c.interval || 5} onChange={v => set('interval', v)} min={1} max={60} suffix="s" />
          <SliderField label="Transition Speed" value={c.fadeDuration || 1} onChange={v => set('fadeDuration', v)} min={0.2} max={5} step={0.1} suffix="s" />

          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Animation Type</h4>
          <div className="oc-bg-mode-grid">
            {ANIM_OPTIONS.map(a => (
              <button key={a.value}
                className={`oc-bg-mode-btn ${(c.animationType || 'fade') === a.value ? 'oc-bg-mode-btn--active' : ''}`}
                onClick={() => set('animationType', a.value)}>
                <span style={{ fontSize: 20 }}>{a.icon}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>

          <label className="nb-field" style={{ marginTop: 12 }}>
            <span>Pause on Hover</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={!!c.pauseOnHover} onChange={e => set('pauseOnHover', e.target.checked)} />
              <span style={{ color: '#94a3b8', fontSize: 11 }}>Pauses slideshow when hovered</span>
            </div>
          </label>
        </div>
      )}

      {/* ═══════ STYLE TAB ═══════ */}
      {activeTab === 'style' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Appearance</h4>

          {navbarConfig && (
            <button className="nb-preset-load-btn" onClick={syncFromNavbar} style={{ marginBottom: 10, width: '100%' }}>
              🔗 Sync Style from Navbar
            </button>
          )}

          <SliderField label="Border Radius" value={c.borderRadius ?? 12} onChange={v => set('borderRadius', v)} min={0} max={50} suffix="px" />
          <SliderField label="Border Width" value={c.borderWidth ?? 1} onChange={v => set('borderWidth', v)} min={0} max={8} suffix="px" />

          <label className="nb-color-item" style={{ marginTop: 8 }}>
            <input type="color" value={c.borderColor || '#334155'} onChange={e => set('borderColor', e.target.value)} />
            <span>Border Color</span>
          </label>

          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Gradient Overlay</h4>
          <label className="nb-field">
            <span>Show Gradient</span>
            <input type="checkbox" checked={c.showGradient !== false} onChange={e => set('showGradient', e.target.checked)} />
          </label>
          {c.showGradient !== false && (
            <label className="nb-color-item">
              <input type="color" value={c.gradientColor || '#0f172a'} onChange={e => set('gradientColor', e.target.value)} />
              <span>Gradient Color</span>
            </label>
          )}

          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>Navigation</h4>
          <label className="nb-field">
            <span>Show Dots</span>
            <input type="checkbox" checked={!!c.showDots} onChange={e => set('showDots', e.target.checked)} />
          </label>
        </div>
      )}

      {/* ═══════ CAPTION TAB ═══════ */}
      {activeTab === 'caption' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Caption</h4>
          <label className="nb-field">
            <span>Show Caption</span>
            <input type="checkbox" checked={!!c.showCaption} onChange={e => set('showCaption', e.target.checked)} />
          </label>

          {c.showCaption && (
            <>
              <label className="nb-field">
                <span>Text</span>
                <input value={c.caption || ''} onChange={e => set('caption', e.target.value)} placeholder="Caption text..." />
              </label>

              <label className="nb-color-item">
                <input type="color" value={c.captionColor || '#e2e8f0'} onChange={e => set('captionColor', e.target.value)} />
                <span>Caption Color</span>
              </label>

              <SliderField label="Font Size" value={c.captionSize || 14} onChange={v => set('captionSize', v)} min={8} max={36} suffix="px" />

              <label className="nb-field">
                <span>Font</span>
                <select value={c.captionFont || "'Inter', sans-serif"} onChange={e => set('captionFont', e.target.value)}>
                  {FONT_OPTIONS.map(f => <option key={f} value={f}>{f.split("'")[1] || f}</option>)}
                </select>
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
}
