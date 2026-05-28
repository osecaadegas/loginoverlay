import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { updateSlotRecordsFromHunt } from '../../../services/slotRecordService';
import { makePerStyleSetters } from './shared/perStyleConfig';
import { BONUS_BUYS_STYLE_KEYS } from './styleKeysRegistry';

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
];

export default function BonusBuysConfig({ config, onChange, allWidgets, mode }) {
  const { user } = useAuth();
  const c = config || {};
  const currentStyle = c.displayStyle || 'v1';
  const { set, setMulti } = makePerStyleSetters(onChange, c, currentStyle, BONUS_BUYS_STYLE_KEYS);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [winInput, setWinInput] = useState('');
  const [message, setMessage] = useState('');

  const allTabs = [
    { id: 'slot', label: '🎰 Setup' },
    { id: 'bonuses', label: '🛒 Bonuses' },
    { id: 'style', label: '🎨 Style' },
  ];

  const SIDEBAR_TABS = new Set(['slot', 'bonuses']);
  const WIDGET_TABS = new Set(['style']);
  const tabs = mode === 'sidebar' ? allTabs.filter(t => SIDEBAR_TABS.has(t.id))
    : mode === 'widget' ? allTabs.filter(t => WIDGET_TABS.has(t.id))
    : allTabs;

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'slot');

  // Search slots from DB
  const searchSlots = useCallback(async (term) => {
    if (!term || term.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await supabase.from('slots').select('id, name, provider, image, rtp')
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
    setMulti({
      slotName: slot.name,
      provider: slot.provider || '',
      imageUrl: slot.image || '',
      slotId: slot.id,
      rtp: slot.rtp || '',
    });
    setSearchTerm('');
    setSearchResults([]);
  };

  // Sync colors from navbar
  const nb = (allWidgets || []).find(w => w.widget_type === 'navbar')?.config || null;
  const syncFromNavbar = () => {
    if (!nb) return;
    setMulti({
      bgColor: nb.bgColor || '#0a0e1a',
      accentColor: nb.accentColor || '#3b82f6',
      textColor: nb.textColor || '#ffffff',
      mutedColor: nb.mutedColor || '#64748b',
      fontFamily: nb.fontFamily || "'Inter', sans-serif",
    });
  };

  const currency = c.currency || '$';
  const betCost = Number(c.bonusCost) || Number(c.betCost) || 0;
  const betValue = Number(c.betValue) || 0;
  const bonuses = c.bonuses || [];
  const plannedBonuses = Number(c.plannedBonuses) || 5;

  // Computed stats
  const filledBonuses = bonuses.filter(b => b && b.win !== undefined && b.win !== null && b.win !== '');
  const totalCost = filledBonuses.length * betCost;
  const totalWin = filledBonuses.reduce((sum, b) => sum + (Number(b.win) || 0), 0);
  const profitLoss = totalWin - totalCost;
  const avgMulti = filledBonuses.length > 0
    ? filledBonuses.reduce((sum, b) => sum + (betValue > 0 ? (Number(b.win) || 0) / betValue : 0), 0) / filledBonuses.length
    : 0;
  const startMoney = Number(c.startMoney) || 0;
  const completionPercent = plannedBonuses > 0 ? Math.min(100, (filledBonuses.length / plannedBonuses) * 100) : 0;
  const bestWin = filledBonuses.reduce((max, b) => Math.max(max, Number(b.win) || 0), 0);
  const bestMulti = betValue > 0 ? bestWin / betValue : 0;
  const currentBankroll = startMoney + profitLoss;
  const sessionStateLabel = !c.slotName
    ? 'Pick a slot'
    : filledBonuses.length >= plannedBonuses
      ? 'Session complete'
      : filledBonuses.length > 0
        ? 'Session live'
        : 'Ready to track';
  const slotMeta = c.slotName
    ? [c.provider, c.rtp ? `RTP ${c.rtp}%` : null].filter(Boolean).join(' • ')
    : 'No slot selected yet';
  const sessionInsight = !c.slotName
    ? 'Pick a slot to unlock the live tracker and start the session.'
    : filledBonuses.length === 0
      ? 'The session is configured and ready. Add the first result to populate profitability and multiplier trends.'
      : profitLoss >= 0
        ? 'The run is above cost right now. Keep the average multiplier steady while the session is live.'
        : 'The run is below cost at the moment. Use the summary to watch for a recovery hit before resetting.';

  const handleAddBonus = () => {
    if (!winInput && winInput !== '0') return;
    const win = Number(winInput);
    const newBonuses = [...bonuses, { id: Date.now(), win }];
    set('bonuses', newBonuses);
    setWinInput('');
    setMessage(`✅ Bonus #${newBonuses.length} added — ${betValue > 0 ? (win / betValue).toFixed(2) : '0.00'}x`);
    setTimeout(() => setMessage(''), 3000);

    // Track slot record
    if (user?.id && c.slotName) {
      updateSlotRecordsFromHunt(user.id, [{
        slotName: c.slotName,
        slot: { name: c.slotName, provider: c.provider || '', image: c.imageUrl || '' },
        betSize: betValue,
        payout: win,
        opened: true,
      }], `Bonus Buy #${c.sessionNumber || 1}`);
    }
  };

  const handleRemoveBonus = (index) => {
    const newBonuses = bonuses.filter((_, i) => i !== index);
    set('bonuses', newBonuses);
  };

  const handleEditBonus = (index, newWin) => {
    const newBonuses = [...bonuses];
    newBonuses[index] = { ...newBonuses[index], win: Number(newWin) };
    set('bonuses', newBonuses);
  };

  const handleResetSession = () => {
    setMulti({
      bonuses: [],
      sessionNumber: (Number(c.sessionNumber) || 1) + 1,
    });
    setMessage('🔄 Session reset! Starting fresh.');
    setTimeout(() => setMessage(''), 3000);
  };

  const singlePage = mode === 'sidebar';

  return (
    <div className="bb-admin-page" style={{ padding: 2 }}>
      <div className="bb-admin-hero">
        <div className="bb-admin-hero-copy">
          <span className="bb-admin-eyebrow">Session Tracker</span>
          <h3 className="bb-admin-title">Bonus buy command deck</h3>
          <p className="bb-admin-subtitle">
            Lock the slot, define the buy economics, and record every result from one clean premium control surface.
          </p>

          <div className="bb-admin-progress">
            <div className="bb-admin-progress-track">
              <span className="bb-admin-progress-fill" style={{ width: `${completionPercent}%` }} />
            </div>
            <div className="bb-admin-progress-copy">
              <span>{sessionStateLabel}</span>
              <strong>{filledBonuses.length}/{plannedBonuses} bonuses recorded</strong>
            </div>
          </div>
        </div>

        <div className="bb-admin-hero-side">
          <div className="bb-admin-slot-card">
            <div className="bb-admin-slot-media">
              {c.imageUrl ? (
                <img className="bb-admin-slot-image" src={c.imageUrl} alt="" />
              ) : (
                <div className="bb-admin-slot-placeholder">🛒</div>
              )}
            </div>
            <div className="bb-admin-slot-body">
              <span className="bb-admin-slot-label">Selected Slot</span>
              <strong className="bb-admin-slot-name">{c.slotName || 'Choose a slot to begin'}</strong>
              <span className="bb-admin-slot-meta">{slotMeta}</span>
            </div>
          </div>

          <div className="bb-admin-metrics">
            <div className="bb-admin-metric-card">
              <span className="bb-admin-metric-label">Progress</span>
              <strong className="bb-admin-metric-value">{filledBonuses.length}/{plannedBonuses}</strong>
              <span className="bb-admin-metric-meta">{completionPercent.toFixed(0)}% of target</span>
            </div>
            <div className="bb-admin-metric-card">
              <span className="bb-admin-metric-label">Profit</span>
              <strong className={`bb-admin-metric-value ${profitLoss >= 0 ? 'bb-admin-metric-value--positive' : 'bb-admin-metric-value--negative'}`}>
                {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)}{currency}
              </strong>
              <span className="bb-admin-metric-meta">{filledBonuses.length} results captured</span>
            </div>
            <div className="bb-admin-metric-card">
              <span className="bb-admin-metric-label">Average Multi</span>
              <strong className="bb-admin-metric-value">{avgMulti.toFixed(2)}x</strong>
              <span className="bb-admin-metric-meta">Best hit {bestMulti.toFixed(2)}x</span>
            </div>
            <div className="bb-admin-metric-card">
              <span className="bb-admin-metric-label">Bankroll</span>
              <strong className="bb-admin-metric-value">{currentBankroll.toFixed(2)}{currency}</strong>
              <span className="bb-admin-metric-meta">Start money {startMoney.toFixed(2)}{currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation — hidden when sidebar merges everything into one page */}
      {!singlePage && (
        <div className="bb-admin-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              className={`bb-admin-tab ${activeTab === t.id ? 'bb-admin-tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── Setup ─── */}
      {(singlePage || activeTab === 'slot') && (
        <div className="bb-admin-section">
          <div className="bb-admin-section-heading">
            <div>
              <span className="bb-admin-section-eyebrow">Session Setup</span>
              <h3 className="bb-admin-section-title">Pick the slot and define the economy for this bonus buy run</h3>
            </div>
            <span className="bb-admin-section-pill">{c.slotName ? 'Slot selected' : 'Waiting for slot'}</span>
          </div>

          <div className="bb-admin-setup-grid">
            <div className="bb-admin-card bb-admin-card--search">
              <div className="bb-admin-card-header">
                <h4 className="bb-admin-card-title">Slot search</h4>
                <span className="bb-admin-card-chip">{searching ? 'Searching' : searchResults.length ? `${searchResults.length} matches` : 'Database lookup'}</span>
              </div>

              <label className="bb-admin-field-label">Search Slot</label>
            <input
              className="bb-admin-field-input"
              placeholder="Type slot name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />

              {searching && <div className="bb-admin-helper">Searching...</div>}

              {c.slotName && (
                <div className="bb-admin-selected-slot">
                  <div className="bb-admin-selected-slot-media">
                    {c.imageUrl ? <img className="bb-admin-selected-slot-image" src={c.imageUrl} alt="" /> : <div className="bb-admin-selected-slot-placeholder">🎰</div>}
                  </div>
                  <div className="bb-admin-selected-slot-copy">
                    <span className="bb-admin-selected-slot-label">Current slot</span>
                    <strong className="bb-admin-selected-slot-name">{c.slotName}</strong>
                    <span className="bb-admin-selected-slot-meta">{slotMeta}</span>
                  </div>
                </div>
              )}

            {searchResults.length > 0 && (
                <div className="bb-admin-search-results">
                {searchResults.map(slot => (
                    <button
                      key={slot.id}
                      type="button"
                      className={`bb-admin-search-result ${c.slotId === slot.id ? 'bb-admin-search-result--active' : ''}`}
                      onClick={() => selectSlot(slot)}
                    >
                      {slot.image && <img className="bb-admin-search-result-image" src={slot.image} alt="" />}
                      <div className="bb-admin-search-result-copy">
                        <div className="bb-admin-search-result-title">{slot.name}</div>
                        {slot.provider && <div className="bb-admin-search-result-meta">{slot.provider}</div>}
                      </div>
                    </button>
                ))}
              </div>
            )}
            </div>

            <div className="bb-admin-card bb-admin-card--settings">
              <div className="bb-admin-card-header">
                <h4 className="bb-admin-card-title">Bonus buy settings</h4>
                <span className="bb-admin-card-chip">Session #{c.sessionNumber || 1}</span>
              </div>

              <div className="bb-admin-field-grid bb-admin-field-grid--two">
                <div>
                  <label className="bb-admin-field-label">Bet Value ({currency})</label>
                <input
                    className="bb-admin-field-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={c.betValue || ''}
                  onChange={e => set('betValue', e.target.value)}
                  placeholder="5"
                />
              </div>
              <div>
                  <label className="bb-admin-field-label">Bonus Cost ({currency})</label>
                <input
                    className="bb-admin-field-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={c.bonusCost || c.betCost || ''}
                  onChange={e => set('bonusCost', e.target.value)}
                  placeholder="300"
                />
              </div>
            </div>

              <div className="bb-admin-field-grid bb-admin-field-grid--two">
              <div>
                  <label className="bb-admin-field-label">Planned Bonuses</label>
                <input
                    className="bb-admin-field-input"
                  type="number"
                  min="1"
                  max="50"
                  value={c.plannedBonuses || ''}
                  onChange={e => set('plannedBonuses', e.target.value)}
                  placeholder="5"
                />
              </div>
              <div>
                  <label className="bb-admin-field-label">Start Money ({currency})</label>
                <input
                    className="bb-admin-field-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={c.startMoney || ''}
                  onChange={e => set('startMoney', e.target.value)}
                  placeholder="0"
                />
              </div>
              </div>

              <div className="bb-admin-field-grid bb-admin-field-grid--two">
              <div>
                  <label className="bb-admin-field-label">Session #</label>
                <input
                    className="bb-admin-field-input"
                  type="number"
                  min="1"
                  value={c.sessionNumber || ''}
                  onChange={e => set('sessionNumber', e.target.value)}
                  placeholder="1"
                />
              </div>
                <div className="bb-admin-note-card">
                  <span className="bb-admin-note-label">Session note</span>
                  <strong className="bb-admin-note-value">{sessionStateLabel}</strong>
                  <span className="bb-admin-note-copy">Set the slot, buy cost, and planned count before going live.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bonuses ─── */}
      {(singlePage || activeTab === 'bonuses') && (
        <div className="bb-admin-section">
          <div className="bb-admin-section-heading">
            <div>
              <span className="bb-admin-section-eyebrow">Session Tracker</span>
              <h3 className="bb-admin-section-title">Capture each buy result and keep profitability visible while you stream</h3>
            </div>
            <span className="bb-admin-section-pill">{filledBonuses.length}/{plannedBonuses} tracked</span>
          </div>

          {!c.slotName ? (
            <div className="bb-admin-empty">
              Select a slot first in the Setup tab
            </div>
          ) : (
            <>
              {/* Quick stats */}
              <div className="bb-admin-stats-grid">
                <div className="bb-admin-stat-card">
                  <div className="bb-admin-stat-label">Bonuses</div>
                  <div className="bb-admin-stat-value">{filledBonuses.length}/{plannedBonuses}</div>
                </div>
                <div className="bb-admin-stat-card">
                  <div className="bb-admin-stat-label">Avg Multi</div>
                  <div className="bb-admin-stat-value bb-admin-stat-value--accent">{avgMulti.toFixed(2)}x</div>
                </div>
                <div className="bb-admin-stat-card">
                  <div className="bb-admin-stat-label">Profit</div>
                  <div className={`bb-admin-stat-value ${profitLoss >= 0 ? 'bb-admin-stat-value--positive' : 'bb-admin-stat-value--negative'}`}>
                    {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)}{currency}
                  </div>
                </div>
              </div>

              <div className="bb-admin-track-grid">
                <div className="bb-admin-track-main">
                  <div className="bb-admin-card bb-admin-card--add">
                    <div className="bb-admin-card-header">
                      <h4 className="bb-admin-card-title">Add Bonus #{filledBonuses.length + 1}</h4>
                      <span className="bb-admin-card-chip">Live entry</span>
                    </div>

                    <div className="bb-admin-add-row">
                    <input
                        className="bb-admin-field-input"
                      type="number"
                      step="0.01"
                      placeholder={`Win amount (${currency})`}
                      value={winInput}
                      onChange={e => setWinInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddBonus()}
                    />
                    
                  <button
                        type="button"
                        className="bb-admin-primary-btn"
                        style={{ opacity: (!winInput && winInput !== '0') ? 0.5 : 1 }}
                    onClick={handleAddBonus}
                    disabled={!winInput && winInput !== '0'}
                  >
                        Add Result
                  </button>
                    </div>

                    {winInput !== '' && betValue > 0 && (
                      <div className="bb-admin-helper">
                    Multi: {(Number(winInput) / betValue).toFixed(2)}x
                    {Number(winInput) >= betCost ? ' ✅' : ' ❌'}
                    &nbsp;| Profit: {(Number(winInput) - betCost).toFixed(2)}{currency}
                  </div>
                )}
                    {message && <div className="bb-admin-message">{message}</div>}
                  </div>

                  <div className="bb-admin-card bb-admin-card--results">
                    <div className="bb-admin-card-header">
                      <h4 className="bb-admin-card-title">Bonus Results ({filledBonuses.length})</h4>
                  {bonuses.length > 0 && (
                    <button
                          type="button"
                          className="bb-admin-secondary-btn bb-admin-secondary-btn--danger"
                      onClick={handleResetSession}
                    >
                      🔄 Reset
                    </button>
                  )}
                    </div>

                {bonuses.length === 0 ? (
                      <div className="bb-admin-empty bb-admin-empty--compact">
                    No bonuses added yet. Enter a win amount above to start tracking!
                  </div>
                ) : (
                      <div className="bb-admin-results-list">
                    {bonuses.map((b, i) => {
                      const win = Number(b.win) || 0;
                      const multi = betValue > 0 ? win / betValue : 0;
                      const isProfit = win >= betCost;
                      return (
                            <div key={b.id || i} className={`bb-admin-result-row ${isProfit ? 'bb-admin-result-row--profit' : 'bb-admin-result-row--loss'}`}>
                              <span className="bb-admin-result-index">#{i + 1}</span>
                              <span className="bb-admin-result-cost">Cost {betCost.toFixed(2)}{currency}</span>
                              <span className="bb-admin-result-win">
                            {win.toFixed(2)}{currency}
                          </span>
                              <span className="bb-admin-result-multi">
                            {multi.toFixed(2)}x
                          </span>
                          <button
                                type="button"
                                className="bb-admin-result-remove"
                            onClick={() => handleRemoveBonus(i)}
                            title="Remove"
                          >✕</button>
                            </div>
                      );
                    })}
                  </div>
                )}
                  </div>
                </div>

                <div className="bb-admin-track-side">
                  <div className="bb-admin-card bb-admin-card--summary">
                    <div className="bb-admin-card-header">
                      <h4 className="bb-admin-card-title">Session Summary</h4>
                      <span className="bb-admin-card-chip">Live totals</span>
                    </div>

                    <div className="bb-admin-summary-list">
                      <div className="bb-admin-summary-row">
                        <span>Total Cost</span>
                        <strong className="bb-admin-summary-value bb-admin-summary-value--negative">{totalCost.toFixed(2)}{currency}</strong>
                      </div>
                      <div className="bb-admin-summary-row">
                        <span>Total Won</span>
                        <strong className="bb-admin-summary-value bb-admin-summary-value--positive">{totalWin.toFixed(2)}{currency}</strong>
                      </div>
                      <div className="bb-admin-summary-row">
                        <span>Average Multi</span>
                        <strong className="bb-admin-summary-value bb-admin-summary-value--accent">{avgMulti.toFixed(2)}x</strong>
                      </div>
                      <div className="bb-admin-summary-row">
                        <span>Best Bonus</span>
                        <strong className="bb-admin-summary-value">{bestWin.toFixed(2)}{currency}</strong>
                      </div>
                      <div className="bb-admin-summary-row bb-admin-summary-row--final">
                        <span>Profit / Loss</span>
                        <strong className={`bb-admin-summary-value ${profitLoss >= 0 ? 'bb-admin-summary-value--positive' : 'bb-admin-summary-value--negative'}`}>
                          {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)}{currency}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="bb-admin-card bb-admin-card--insight">
                    <div className="bb-admin-card-header">
                      <h4 className="bb-admin-card-title">Run Insight</h4>
                      <span className="bb-admin-card-chip">Stream note</span>
                    </div>
                    <p className="bb-admin-insight-copy">{sessionInsight}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Style Tab ─── */}
      {activeTab === 'style' && (
        <div className="bb-admin-section">
          <div className="bb-admin-section-heading">
            <div>
              <span className="bb-admin-section-eyebrow">Visual System</span>
              <h3 className="bb-admin-section-title">Tune the overlay colors and typography for the Bonus Buys widget</h3>
            </div>
            <span className="bb-admin-section-pill">Style presets</span>
          </div>

          <div className="bb-admin-style-grid">
          {nb && (
              <div className="bb-admin-card bb-admin-card--sync">
                <div className="bb-admin-card-header">
                  <h4 className="bb-admin-card-title">Navbar Sync</h4>
                  <span className="bb-admin-card-chip">One click</span>
                </div>
                <p className="bb-admin-insight-copy">Pull the shared palette and font settings from the Navbar widget to keep the whole overlay consistent.</p>
                <button
                  type="button"
                  className="bb-admin-secondary-btn"
                  onClick={syncFromNavbar}
                >
                  🔗 Sync Colors from Navbar
                </button>
              </div>
          )}

            <div className="bb-admin-card bb-admin-card--colors">
              <div className="bb-admin-card-header">
                <h4 className="bb-admin-card-title">Color palette</h4>
                <span className="bb-admin-card-chip">Live preview ready</span>
              </div>

              <div className="bb-admin-color-grid">
                <div className="bb-admin-color-field">
                  <label className="bb-admin-field-label">Accent</label>
              <input type="color" value={c.accentColor || '#3b82f6'} onChange={e => set('accentColor', e.target.value)}
                    className="bb-admin-color-input" />
            </div>
                <div className="bb-admin-color-field">
                  <label className="bb-admin-field-label">Background</label>
              <input type="color" value={c.bgColor || '#0a0e1a'} onChange={e => set('bgColor', e.target.value)}
                    className="bb-admin-color-input" />
            </div>
                <div className="bb-admin-color-field">
                  <label className="bb-admin-field-label">Text</label>
              <input type="color" value={c.textColor || '#ffffff'} onChange={e => set('textColor', e.target.value)}
                    className="bb-admin-color-input" />
            </div>
                <div className="bb-admin-color-field">
                  <label className="bb-admin-field-label">Muted</label>
              <input type="color" value={c.mutedColor || '#64748b'} onChange={e => set('mutedColor', e.target.value)}
                    className="bb-admin-color-input" />
                </div>
              </div>
            </div>

            <div className="bb-admin-card bb-admin-card--font">
              <div className="bb-admin-card-header">
                <h4 className="bb-admin-card-title">Typography</h4>
                <span className="bb-admin-card-chip">Broadcast readable</span>
              </div>
              <label className="bb-admin-field-label">Font</label>
              <select className="bb-admin-field-select" value={c.fontFamily || "'Inter', sans-serif"} onChange={e => set('fontFamily', e.target.value)}>
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
              <div className="bb-admin-helper">Choose a typeface that stays readable in OBS at smaller widget widths.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
