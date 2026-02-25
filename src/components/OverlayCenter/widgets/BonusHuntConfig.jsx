import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllSlots } from '../../../utils/slotUtils';

export default function BonusHuntConfig({ config, onChange }) {
  const c = config || {};
  const [open, setOpen] = useState(false);
  const set = (key, val) => onChange({ ...c, [key]: val });

  return (
    <div className="bh-config">
      {/* Top quick toggles */}
      <div className="bh-quick-row">
        <label className="oc-config-field" style={{ flex: 1 }}>
          <span>Currency</span>
          <input value={c.currency || '€'} onChange={e => set('currency', e.target.value)} />
        </label>
        <label className="bh-check-row">
          <input type="checkbox" checked={!!c.huntActive} onChange={e => set('huntActive', e.target.checked)} />
          <span>Hunt Active</span>
        </label>
      </div>

      {/* Toggle dropdown */}
      <button
        className={`bh-config-toggle ${open ? 'bh-config-toggle--open' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <span>⚙️ Configure Bonus Hunt</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <BonusHuntPanel config={c} onChange={onChange} />
      )}
    </div>
  );
}

/* ─── Inline Dropdown Panel (replaces old modal) ─── */
function BonusHuntPanel({ config, onChange }) {
  const c = config || {};
  const [startMoney, setStartMoney] = useState(c.startMoney || '');
  const [targetMoney, setTargetMoney] = useState(c.targetMoney || '');
  const [stopLoss, setStopLoss] = useState(c.stopLoss || '');
  const [betSize, setBetSize] = useState('');
  const [slotSearch, setSlotSearch] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isSuperBonus, setIsSuperBonus] = useState(false);
  const [showStatistics, setShowStatistics] = useState(c.showStatistics ?? true);
  const [animatedTracker, setAnimatedTracker] = useState(c.animatedTracker ?? true);
  const [bonusList, setBonusList] = useState(c.bonuses || []);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [slots, setSlots] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    getAllSlots().then(d => setSlots(d || [])).catch(() => setSlots([]));
  }, []);

  const filteredSlots = slotSearch.trim().length > 0 && slots.length > 0
    ? slots.filter(s => s?.name?.toLowerCase().includes(slotSearch.toLowerCase()))
    : [];

  const save = useCallback((list = bonusList, extras = {}) => {
    onChange({
      ...config,
      startMoney: Number(startMoney) || 0,
      targetMoney: Number(targetMoney) || 0,
      stopLoss: Number(stopLoss) || 0,
      showStatistics, animatedTracker,
      bonuses: list,
      huntActive: config?.huntActive ?? false,
      ...extras,
    });
  }, [config, onChange, startMoney, targetMoney, stopLoss, showStatistics, animatedTracker, bonusList]);

  const handleAddBonus = () => {
    const betNum = Number(betSize);
    if (!selectedSlot || !betSize || betNum <= 0) return;
    const newBonus = {
      id: Date.now(),
      slot: selectedSlot,
      slotName: selectedSlot.name,
      betSize: betNum,
      isSuperBonus,
      opened: false,
      result: 0,
      payout: 0,
    };
    const updated = [...bonusList, newBonus];
    setBonusList(updated);
    save(updated);
    setSelectedSlot(null);
    setSlotSearch('');
    setBetSize('');
    setIsSuperBonus(false);
  };

  const handleOpenBonus = (bonusId, result) => {
    const updated = bonusList.map(b =>
      b.id === bonusId ? { ...b, opened: true, result, payout: result } : b
    );
    setBonusList(updated);
    save(updated);
  };

  const handleRemoveBonus = (bonusId) => {
    const updated = bonusList.filter(b => b.id !== bonusId);
    setBonusList(updated);
    save(updated);
  };

  const currency = config?.currency || '€';

  return (
    <div className="bh-panel">

      {/* ─── Hunt Settings ─── */}
      <div className="bh-panel-section">
        <h4 className="bh-panel-label">Hunt Settings</h4>
        <div className="bh-settings-grid">
          <label className="bh-input-group">
            <span>Start ({currency})</span>
            <input type="number" value={startMoney}
              placeholder="0"
              onChange={e => setStartMoney(e.target.value)}
              onBlur={() => save()} />
          </label>
          <label className="bh-input-group">
            <span>Target ({currency})</span>
            <input type="number" value={targetMoney}
              placeholder="0"
              onChange={e => setTargetMoney(e.target.value)}
              onBlur={() => save()} />
          </label>
          <label className="bh-input-group">
            <span>Stop Loss ({currency})</span>
            <input type="number" value={stopLoss}
              placeholder="0"
              onChange={e => setStopLoss(e.target.value)}
              onBlur={() => save()} />
          </label>
        </div>
      </div>

      {/* ─── Add Bonus ─── */}
      <div className="bh-panel-section">
        <h4 className="bh-panel-label">Add Bonus</h4>

        {/* Slot search with dropdown suggestions */}
        <div className="bh-search-container" ref={searchRef}>
          <input
            type="text"
            className="bh-search-input"
            value={selectedSlot ? selectedSlot.name : slotSearch}
            onChange={e => { setSlotSearch(e.target.value); setSelectedSlot(null); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddBonus(); } }}
            placeholder={`Search ${slots.length} slots...`}
          />

          {showSuggestions && slotSearch.trim().length > 0 && (
            <div className="bh-suggestions-dropdown">
              {filteredSlots.length > 0 ? (
                filteredSlots.slice(0, 8).map(slot => (
                  <div key={slot.id} className="bh-suggestion-item"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { setSelectedSlot(slot); setSlotSearch(slot.name); setShowSuggestions(false); }}>
                    <img
                      src={slot.image || 'https://via.placeholder.com/36x36/1a1d23/9346ff?text=S'}
                      alt={slot.name}
                      className="bh-suggestion-img"
                      onError={e => { e.target.src = 'https://via.placeholder.com/36x36/1a1d23/9346ff?text=S'; }}
                    />
                    <div className="bh-suggestion-info">
                      <span className="bh-suggestion-name">{slot.name}</span>
                      {slot.provider && <span className="bh-suggestion-provider">{slot.provider}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bh-suggestion-empty">
                  {slots.length === 0 ? 'Loading slots...' : `No slots found for "${slotSearch}"`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bet + Super + Add button row */}
        <div className="bh-add-controls">
          <input type="number" className="bh-bet-field" value={betSize}
            onChange={e => setBetSize(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddBonus(); } }}
            placeholder={`Bet (${currency})`} step="0.1" />
          <label className="bh-super-check">
            <input type="checkbox" checked={isSuperBonus} onChange={e => setIsSuperBonus(e.target.checked)} />
            <span>⭐</span>
          </label>
          <button className="bh-add-btn" onClick={handleAddBonus} disabled={!selectedSlot || !betSize}>
            + Add
          </button>
        </div>

        {/* Options row */}
        <div className="bh-options-row">
          <label className="bh-option">
            <input type="checkbox" checked={showStatistics}
              onChange={e => { setShowStatistics(e.target.checked); save(bonusList, { showStatistics: e.target.checked }); }} />
            <span>Statistics</span>
          </label>
          <label className="bh-option">
            <input type="checkbox" checked={animatedTracker}
              onChange={e => { setAnimatedTracker(e.target.checked); save(bonusList, { animatedTracker: e.target.checked }); }} />
            <span>Animated</span>
          </label>
        </div>
      </div>

      {/* ─── Bonus List ─── */}
      <div className="bh-panel-section">
        <h4 className="bh-panel-label">
          Bonuses <span className="bh-count">{bonusList.length}</span>
        </h4>
        <div className="bh-list">
          {bonusList.length === 0 ? (
            <p className="bh-list-empty">No bonuses added yet</p>
          ) : bonusList.map((bonus, i) => (
            <div key={bonus.id} className={`bh-list-item ${bonus.opened ? 'bh-list-item--opened' : ''} ${bonus.isSuperBonus ? 'bh-list-item--super' : ''}`}>
              <span className="bh-list-num">{i + 1}</span>
              {bonus.slot?.image && (
                <img src={bonus.slot.image} alt={bonus.slotName} className="bh-list-img"
                  onError={e => { e.target.style.display = 'none'; }} />
              )}
              <div className="bh-list-info">
                <span className="bh-list-name">{bonus.slotName || bonus.slot?.name}</span>
                <span className="bh-list-bet">{currency}{bonus.betSize} {bonus.isSuperBonus && '⭐'}</span>
              </div>
              <div className="bh-list-actions">
                {bonus.opened ? (
                  <span className="bh-list-result">{currency}{bonus.result}</span>
                ) : (
                  <button className="bh-list-open" onClick={() => {
                    const result = prompt(`Enter result (${currency}):`);
                    if (result) handleOpenBonus(bonus.id, Number(result));
                  }}>Open</button>
                )}
                <button className="bh-list-remove" onClick={() => handleRemoveBonus(bonus.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
