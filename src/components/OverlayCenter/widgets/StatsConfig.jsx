import React, { useState } from 'react';

export default function StatsConfig({ config, onChange }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const [activeTab, setActiveTab] = useState('content');

  const TABS = [
    { id: 'content', label: '📊 Content' },
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
          <h4 className="nb-subtitle">Stats Values</h4>
          <label className="nb-field">
            <span>Currency Symbol</span>
            <input value={c.currency || '€'} onChange={e => set('currency', e.target.value)} />
          </label>
          <label className="nb-field">
            <span>Total Bet</span>
            <input type="number" value={c.totalBet || 0} onChange={e => set('totalBet', +e.target.value)} />
          </label>
          <label className="nb-field">
            <span>Total Win</span>
            <input type="number" value={c.totalWin || 0} onChange={e => set('totalWin', +e.target.value)} />
          </label>
          <label className="nb-field">
            <span>Highest Win</span>
            <input type="number" value={c.highestWin || 0} onChange={e => set('highestWin', +e.target.value)} />
          </label>
          <label className="nb-field">
            <span>Highest Multiplier</span>
            <input type="number" step="0.1" value={c.highestMulti || 0} onChange={e => set('highestMulti', +e.target.value)} />
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
