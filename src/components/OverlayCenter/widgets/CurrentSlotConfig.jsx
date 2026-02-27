import React, { useState } from 'react';

export default function CurrentSlotConfig({ config, onChange }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const [activeTab, setActiveTab] = useState('content');

  const TABS = [
    { id: 'content', label: '🎰 Content' },
    { id: 'style',   label: '🎨 Style' },
  ];

  return (
    <div className="nb-config">
      <div className="nb-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`nb-tab${activeTab === t.id ? ' nb-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'content' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Slot Details</h4>
          <label className="nb-field">
            <span>Slot Name</span>
            <input value={c.slotName || ''} onChange={e => set('slotName', e.target.value)} placeholder="e.g. Sweet Bonanza" />
          </label>
          <label className="nb-field">
            <span>Provider</span>
            <input value={c.provider || ''} onChange={e => set('provider', e.target.value)} placeholder="e.g. Pragmatic Play" />
          </label>
          <label className="nb-field">
            <span>Bet Size</span>
            <input type="number" step="0.01" value={c.betSize || 0} onChange={e => set('betSize', +e.target.value)} />
          </label>
          <label className="nb-field">
            <span>RTP (%)</span>
            <input value={c.rtp || ''} onChange={e => set('rtp', e.target.value)} placeholder="96.50" />
          </label>
          <label className="nb-field">
            <span>Image URL</span>
            <input value={c.imageUrl || ''} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." />
          </label>
        </div>
      )}

      {activeTab === 'style' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Custom CSS</h4>
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
    </div>
  );
}
