import React, { useState } from 'react';

export default function GiveawayConfig({ config, onChange }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const [activeTab, setActiveTab] = useState('content');

  const TABS = [
    { id: 'content', label: '🎁 Content' },
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
          <h4 className="nb-subtitle">Giveaway Setup</h4>
          <label className="nb-field">
            <span>Title</span>
            <input value={c.title || ''} onChange={e => set('title', e.target.value)} placeholder="Giveaway Title" />
          </label>
          <label className="nb-field">
            <span>Prize</span>
            <input value={c.prize || ''} onChange={e => set('prize', e.target.value)} placeholder="€500 Bonus" />
          </label>
          <label className="nb-field">
            <span>Chat Keyword</span>
            <input value={c.keyword || ''} onChange={e => set('keyword', e.target.value)} placeholder="giveaway" />
          </label>
          <label className="nb-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Active</span>
            <input type="checkbox" checked={!!c.isActive} onChange={e => set('isActive', e.target.checked)} />
          </label>
          <label className="nb-field">
            <span>Winner</span>
            <input value={c.winner || ''} onChange={e => set('winner', e.target.value)} placeholder="Leave empty until drawn" />
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
