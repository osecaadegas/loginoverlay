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

export default function ImageSlideshowConfig({ config, onChange }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const images = c.images || [];
  const [newUrl, setNewUrl] = useState('');
  const [expandedSection, setExpandedSection] = useState('images');

  const toggle = (section) => setExpandedSection(expandedSection === section ? '' : section);

  const addImage = () => {
    const url = newUrl.trim();
    if (!url) return;
    set('images', [...images, url]);
    setNewUrl('');
  };

  const removeImage = (idx) => {
    set('images', images.filter((_, i) => i !== idx));
  };

  const moveImage = (idx, dir) => {
    const arr = [...images];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    set('images', arr);
  };

  const Section = ({ id, icon, title, children }) => (
    <div className="ov-chat-cfg-section">
      <button className="ov-chat-cfg-section-toggle" onClick={() => toggle(id)}>
        <span>{icon} {title}</span>
        <span>{expandedSection === id ? '▾' : '▸'}</span>
      </button>
      {expandedSection === id && <div className="ov-chat-cfg-section-body">{children}</div>}
    </div>
  );

  return (
    <div className="ov-chat-cfg">
      {/* ─── Images ─── */}
      <Section id="images" icon="🖼️" title={`Images (${images.length})`}>
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
      </Section>

      {/* ─── Timing ─── */}
      <Section id="timing" icon="⏱️" title="Timing">
        <label className="oc-config-field">
          <span>Interval (sec)</span>
          <input type="number" min={1} max={60} value={c.interval || 5} onChange={e => set('interval', parseInt(e.target.value) || 5)} />
        </label>
        <label className="oc-config-field">
          <span>Fade (sec)</span>
          <input type="number" min={0.2} max={5} step={0.1} value={c.fadeDuration || 1} onChange={e => set('fadeDuration', parseFloat(e.target.value) || 1)} />
        </label>
        <label className="oc-config-field">
          <span>Pause on Hover</span>
          <input type="checkbox" checked={!!c.pauseOnHover} onChange={e => set('pauseOnHover', e.target.checked)} />
        </label>
      </Section>

      {/* ─── Size ─── */}
      <Section id="sizing" icon="📐" title="Size & Layout">
        <label className="oc-config-field">
          <span>Width (px)</span>
          <input type="number" min={100} max={1920} value={c.width || 400} onChange={e => set('width', parseInt(e.target.value) || 400)} />
        </label>
        <label className="oc-config-field">
          <span>Height (px)</span>
          <input type="number" min={50} max={1080} value={c.height || 225} onChange={e => set('height', parseInt(e.target.value) || 225)} />
        </label>
        <label className="oc-config-field">
          <span>Border Radius</span>
          <input type="number" min={0} max={50} value={c.borderRadius || 12} onChange={e => set('borderRadius', parseInt(e.target.value) || 12)} />
        </label>
        <label className="oc-config-field">
          <span>Border Width</span>
          <input type="number" min={0} max={8} value={c.borderWidth || 1} onChange={e => set('borderWidth', parseInt(e.target.value) || 1)} />
        </label>
        <label className="oc-config-field">
          <span>Fit Mode</span>
          <select value={c.objectFit || 'cover'} onChange={e => set('objectFit', e.target.value)}>
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
          </select>
        </label>
      </Section>

      {/* ─── Appearance ─── */}
      <Section id="appearance" icon="🎨" title="Colors & Style">
        <label className="oc-config-field">
          <span>Border Color</span>
          <input type="color" value={c.borderColor || '#334155'} onChange={e => set('borderColor', e.target.value)} />
        </label>
        <label className="oc-config-field">
          <span>Show Gradient</span>
          <input type="checkbox" checked={c.showGradient !== false} onChange={e => set('showGradient', e.target.checked)} />
        </label>
        <label className="oc-config-field">
          <span>Gradient Color</span>
          <input type="color" value={c.gradientColor || '#0f172a'} onChange={e => set('gradientColor', e.target.value)} />
        </label>
        <label className="oc-config-field">
          <span>Show Dots</span>
          <input type="checkbox" checked={!!c.showDots} onChange={e => set('showDots', e.target.checked)} />
        </label>
      </Section>

      {/* ─── Caption ─── */}
      <Section id="caption" icon="💬" title="Caption">
        <label className="oc-config-field">
          <span>Show Caption</span>
          <input type="checkbox" checked={!!c.showCaption} onChange={e => set('showCaption', e.target.checked)} />
        </label>
        {c.showCaption && (
          <>
            <label className="oc-config-field">
              <span>Text</span>
              <input value={c.caption || ''} onChange={e => set('caption', e.target.value)} placeholder="Caption text..." />
            </label>
            <label className="oc-config-field">
              <span>Color</span>
              <input type="color" value={c.captionColor || '#e2e8f0'} onChange={e => set('captionColor', e.target.value)} />
            </label>
            <label className="oc-config-field">
              <span>Font Size</span>
              <input type="number" min={8} max={36} value={c.captionSize || 14} onChange={e => set('captionSize', parseInt(e.target.value) || 14)} />
            </label>
            <label className="oc-config-field">
              <span>Font</span>
              <select value={c.captionFont || "'Inter', sans-serif"} onChange={e => set('captionFont', e.target.value)}>
                {FONT_OPTIONS.map(f => <option key={f} value={f}>{f.split("'")[1] || f}</option>)}
              </select>
            </label>
          </>
        )}
      </Section>
    </div>
  );
}
