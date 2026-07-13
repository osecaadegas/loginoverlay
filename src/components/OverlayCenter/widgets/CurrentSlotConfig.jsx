import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabaseClient';
import TabBar from './shared/TabBar';
import { makePerStyleSetters } from './shared/perStyleConfig';
import { CURRENT_SLOT_STYLE_KEYS } from './styleKeysRegistry';

export default function CurrentSlotConfig({ config, onChange, allWidgets, mode }) {
  const c = config || {};
  const currentStyle = c.displayStyle || 'v1';
  const { set, setMulti } = makePerStyleSetters(onChange, c, currentStyle, CURRENT_SLOT_STYLE_KEYS);
  const currency = c.currency || '€';

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const allTabs = [
    { id: 'content', label: '🎰 Slot' },
  ];
  const SIDEBAR_TABS = new Set(['content']);
  const WIDGET_TABS = new Set(['content']);
  const tabs = mode === 'sidebar' ? allTabs.filter(t => SIDEBAR_TABS.has(t.id))
    : mode === 'widget' ? allTabs.filter(t => WIDGET_TABS.has(t.id))
    : allTabs;

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'content');

  const searchSlots = useCallback(async (term) => {
    if (!term || term.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await supabase.from('slots').select('id, name, provider, image')
        .ilike('name', `%${term}%`).order('name').limit(20);
      setSearchResults(data || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchSlots(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchSlots]);

  const selectSlot = (slot) => {
    setMulti({ slotName: slot.name, provider: slot.provider || '', imageUrl: slot.image || '', slotId: slot.id });
    setSearchTerm(''); setSearchResults([]);
  };

  const styleLabels = {
    v1: 'Classic',
    v2: 'Neon',
    v3: 'Minimal',
    v4: 'Compact Bar',
  };
  const currentStyleLabel = styleLabels[currentStyle] || currentStyle;
  const slotReady = Boolean(c.slotName);
  const betSize = Number(c.betSize) || 0;
  const selectedMeta = [c.provider, c.rtp ? `${c.rtp}% RTP` : null].filter(Boolean).join(' • ');
  const heroInsight = slotReady
    ? 'The slot is ready for the overlay. Update the manual fields below if you need to override the imported metadata before going live.'
    : 'Pick a slot from the database or fill the fields manually so the overlay always shows the game you are currently playing.';
  const searchStatus = searching ? 'Searching' : searchResults.length ? `${searchResults.length} matches` : 'Type 2+ letters';

  return (
    <div className="nb-config cs-page">
      <div className="cs-page-hero">
        <div className="cs-page-hero-copy">
          <span className="cs-page-eyebrow">Live Slot Banner</span>
          <h3 className="cs-page-title">Current Slot control room</h3>
          <p className="cs-page-subtitle">
            Keep the active slot visible, polished, and ready to swap in seconds while you stream.
          </p>
          <p className="cs-page-note">{heroInsight}</p>
        </div>

        <div className="cs-page-hero-side">
          <div className="cs-slot-card">
            <div className="cs-slot-media">
              {c.imageUrl ? (
                <img className="cs-slot-image" src={c.imageUrl} alt="" />
              ) : (
                <div className="cs-slot-placeholder">🎰</div>
              )}
            </div>
            <div className="cs-slot-copy">
              <span className="cs-slot-label">Selected Slot</span>
              <strong className="cs-slot-name">{c.slotName || 'Choose a slot to begin'}</strong>
              <span className="cs-slot-meta">{selectedMeta || 'No provider or RTP assigned yet'}</span>
            </div>
          </div>

          <div className="cs-page-metrics">
            <div className="cs-page-metric-card">
              <span className="cs-page-metric-label">Status</span>
              <strong className="cs-page-metric-value">{slotReady ? 'Ready' : 'Idle'}</strong>
              <span className="cs-page-metric-meta">{slotReady ? 'Widget content is populated' : 'Waiting for a slot selection'}</span>
            </div>
            <div className="cs-page-metric-card">
              <span className="cs-page-metric-label">Style</span>
              <strong className="cs-page-metric-value">{currentStyleLabel}</strong>
              <span className="cs-page-metric-meta">Current display preset</span>
            </div>
            <div className="cs-page-metric-card">
              <span className="cs-page-metric-label">Bet Size</span>
              <strong className="cs-page-metric-value">{betSize > 0 ? `${currency}${betSize.toFixed(2)}` : 'Unset'}</strong>
              <span className="cs-page-metric-meta">Shown on supported overlay styles</span>
            </div>
            <div className="cs-page-metric-card">
              <span className="cs-page-metric-label">RTP</span>
              <strong className="cs-page-metric-value">{c.rtp ? `${c.rtp}%` : 'Unset'}</strong>
              <span className="cs-page-metric-meta">Manual override friendly</span>
            </div>
          </div>
        </div>
      </div>

      {tabs.length > 1 && (
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
      )}

      {activeTab === 'content' && (
        <div className="nb-section cs-section">
          <div className="cs-section-heading">
            <div>
              <span className="cs-section-eyebrow">Content Setup</span>
              <h3 className="cs-section-title">Choose the active slot and fine-tune what the overlay shows</h3>
            </div>
            <span className="cs-section-pill">{slotReady ? 'Slot selected' : 'Waiting for slot'}</span>
          </div>

          <div className="cs-content-grid">
            <div className="cs-card cs-card--search">
              <div className="cs-card-header">
                <h4 className="cs-card-title">Search slots database</h4>
                <span className="cs-card-chip">{searchStatus}</span>
              </div>

              <div className="cs-search-wrap">
                <input
                  className="cs-search-input"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search slot by name..."
                />
                {searching && <div className="cs-search-status">...</div>}
                {searchResults.length > 0 && (
                  <div className="cs-search-results">
                    {searchResults.map(slot => (
                      <button key={slot.id} type="button" onClick={() => selectSlot(slot)} className="cs-search-result">
                        {slot.image && <img src={slot.image} alt="" className="cs-search-result-image" />}
                        <div className="cs-search-result-copy">
                          <div className="cs-search-result-title">{slot.name}</div>
                          <div className="cs-search-result-meta">{slot.provider}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <p className="cs-card-copy">
                Pull slot art and provider metadata directly from the slots database, then adjust any field manually if the live banner needs a quick override.
              </p>

              {c.slotName && (
                <div className="cs-selected-slot">
                  {c.imageUrl ? <img src={c.imageUrl} alt="" className="cs-selected-slot-image" /> : <div className="cs-selected-slot-placeholder">🎰</div>}
                  <div className="cs-selected-slot-copy">
                    <div className="cs-selected-slot-name">{c.slotName}</div>
                    <div className="cs-selected-slot-meta">{selectedMeta || 'Provider metadata pending'}</div>
                  </div>
                  <button
                    type="button"
                    className="cs-clear-btn"
                    onClick={() => setMulti({ slotName: '', provider: '', imageUrl: '', slotId: null })}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="cs-card cs-card--manual">
              <div className="cs-card-header">
                <h4 className="cs-card-title">Manual override</h4>
                <span className="cs-card-chip">Editable fields</span>
              </div>

              <div className="cs-field-grid">
                <label className="cs-field">
                  <span className="cs-field-label">Slot Name</span>
                  <input value={c.slotName || ''} onChange={e => set('slotName', e.target.value)} placeholder="Sweet Bonanza" />
                </label>
                <label className="cs-field">
                  <span className="cs-field-label">Provider</span>
                  <input value={c.provider || ''} onChange={e => set('provider', e.target.value)} placeholder="Pragmatic Play" />
                </label>
                <label className="cs-field">
                  <span className="cs-field-label">Bet Size</span>
                  <input type="number" step="0.01" value={c.betSize || 0} onChange={e => set('betSize', +e.target.value)} />
                </label>
                <label className="cs-field">
                  <span className="cs-field-label">RTP (%)</span>
                  <input value={c.rtp || ''} onChange={e => set('rtp', e.target.value)} placeholder="96.50" />
                </label>
                <label className="cs-field cs-field--full">
                  <span className="cs-field-label">Image URL</span>
                  <input value={c.imageUrl || ''} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." />
                </label>
                <label className="cs-field cs-field--compact">
                  <span className="cs-field-label">Currency</span>
                  <input value={currency} onChange={e => set('currency', e.target.value)} placeholder="€" />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
