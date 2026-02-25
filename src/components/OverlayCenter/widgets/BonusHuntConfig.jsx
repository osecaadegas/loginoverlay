import React, { useState, useEffect, useCallback } from 'react';
import { getAllSlots } from '../../../utils/slotUtils';

export default function BonusHuntConfig({ config, onChange }) {
  const c = config || {};
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="oc-config-form">
      <label className="oc-config-field">
        <span>Currency</span>
        <input value={c.currency || '€'} onChange={e => onChange({ ...c, currency: e.target.value })} />
      </label>
      <label className="oc-config-field">
        <span>Hunt Active</span>
        <input type="checkbox" checked={!!c.huntActive} onChange={e => onChange({ ...c, huntActive: e.target.checked })} />
      </label>
      <button className="oc-btn oc-btn--primary" style={{ marginTop: 8, width: '100%' }} onClick={() => setShowModal(true)}>
        ⚙️ Configure Bonus Hunt
      </button>
      {showModal && (
        <BonusHuntModal config={c} onChange={onChange} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

/* ─── Full Bonus Hunt Modal (ported from old system) ─── */
function BonusHuntModal({ config, onChange, onClose }) {
  const c = config || {};
  const [startMoney, setStartMoney] = useState(c.startMoney || 0);
  const [targetMoney, setTargetMoney] = useState(c.targetMoney || 0);
  const [stopLoss, setStopLoss] = useState(c.stopLoss || 0);
  const [betSize, setBetSize] = useState('');
  const [slotSearch, setSlotSearch] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isSuperBonus, setIsSuperBonus] = useState(false);
  const [showStatistics, setShowStatistics] = useState(c.showStatistics ?? true);
  const [animatedTracker, setAnimatedTracker] = useState(c.animatedTracker ?? true);
  const [bonusList, setBonusList] = useState(c.bonuses || []);
  const [showSlotSuggestions, setShowSlotSuggestions] = useState(false);
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllSlots();
        setSlots(data || []);
      } catch { setSlots([]); }
    };
    load();
  }, []);

  const filteredSlots = slotSearch.trim().length > 0 && Array.isArray(slots) && slots.length > 0
    ? slots.filter(s => s && s.name && s.name.toLowerCase().includes(slotSearch.toLowerCase()))
    : [];

  const save = useCallback((list = bonusList, extras = {}) => {
    onChange({
      ...config,
      startMoney,
      targetMoney,
      stopLoss,
      showStatistics,
      animatedTracker,
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

  return (
    <div className="bh-modal-overlay" onClick={onClose}>
      <div className="bh-modal" onClick={e => e.stopPropagation()}>
        <div className="bh-modal-header">
          <h2>🎯 Bonus Hunt Configuration</h2>
          <button className="bh-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="bh-modal-body">
          {/* Hunt Settings */}
          <div className="bh-section">
            <h3>Hunt Settings</h3>
            <div className="bh-form-grid">
              <div className="bh-form-group">
                <label>Start Money (€)</label>
                <input type="number" value={startMoney}
                  onChange={e => setStartMoney(Number(e.target.value))}
                  onBlur={() => save()} />
              </div>
              <div className="bh-form-group">
                <label>Target Money (€)</label>
                <input type="number" value={targetMoney}
                  onChange={e => setTargetMoney(Number(e.target.value))}
                  onBlur={() => save()} />
              </div>
              <div className="bh-form-group">
                <label>Stop Loss (€)</label>
                <input type="number" value={stopLoss}
                  onChange={e => setStopLoss(Number(e.target.value))}
                  onBlur={() => save()} />
              </div>
            </div>
          </div>

          {/* Add Bonus */}
          <div className="bh-section">
            <h3>Add Bonus</h3>
            <div className="bh-add-row">
              <div className="bh-slot-search">
                <input type="text"
                  value={selectedSlot ? selectedSlot.name : slotSearch}
                  onChange={e => { setSlotSearch(e.target.value); setSelectedSlot(null); setShowSlotSuggestions(true); }}
                  onFocus={() => setShowSlotSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSlotSuggestions(false), 200)}
                  placeholder={`Search ${slots.length} slots...`}
                />
                {showSlotSuggestions && slotSearch.trim().length > 0 && (
                  <div className="bh-slot-suggestions">
                    {filteredSlots.length > 0 ? (
                      filteredSlots.slice(0, 8).map(slot => (
                        <div key={slot.id} className="bh-slot-suggestion"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => { setSelectedSlot(slot); setSlotSearch(slot.name); setShowSlotSuggestions(false); }}>
                          <img src={slot.image || 'https://via.placeholder.com/40x40/1a1d23/9346ff?text=S'} alt={slot.name}
                            onError={e => { e.target.src = 'https://via.placeholder.com/40x40/1a1d23/9346ff?text=S'; }} />
                          <div>
                            <div className="bh-slot-name">{slot.name}</div>
                            <div className="bh-slot-provider">{slot.provider}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bh-no-results">{slots.length === 0 ? 'Loading slots...' : `No slots found for "${slotSearch}"`}</div>
                    )}
                  </div>
                )}
              </div>
              <input type="number" className="bh-bet-input" value={betSize}
                onChange={e => setBetSize(e.target.value)} placeholder="Bet" step="0.1" />
              <label className="bh-super-label">
                <input type="checkbox" checked={isSuperBonus} onChange={e => setIsSuperBonus(e.target.checked)} />
                <span>⭐ Super</span>
              </label>
            </div>

            <div className="bh-add-actions">
              <button className="bh-add-btn" onClick={handleAddBonus}>➕ Add to Hunt</button>
              <div className="bh-toggles">
                <label className="bh-toggle-option">
                  <span>Show Statistics</span>
                  <input type="checkbox" checked={showStatistics}
                    onChange={e => { setShowStatistics(e.target.checked); save(bonusList, { showStatistics: e.target.checked }); }} />
                </label>
                <label className="bh-toggle-option">
                  <span>Animated Tracker</span>
                  <input type="checkbox" checked={animatedTracker}
                    onChange={e => { setAnimatedTracker(e.target.checked); save(bonusList, { animatedTracker: e.target.checked }); }} />
                </label>
              </div>
            </div>
          </div>

          {/* Bonus List */}
          <div className="bh-section">
            <h3>Bonus List ({bonusList.length})</h3>
            <div className="bh-bonus-list">
              {bonusList.map(bonus => (
                <div key={bonus.id} className={`bh-bonus-item ${bonus.opened ? 'bh-opened' : ''}`}>
                  {bonus.slot?.image && <img src={bonus.slot.image} alt={bonus.slotName} className="bh-bonus-img" />}
                  <div className="bh-bonus-info">
                    <div className="bh-bonus-name">{bonus.slotName || bonus.slot?.name}</div>
                    <div className="bh-bonus-details">€{bonus.betSize} {bonus.isSuperBonus && '⭐'}</div>
                  </div>
                  <div className="bh-bonus-actions">
                    {bonus.opened ? (
                      <div className="bh-bonus-result">€{bonus.result}</div>
                    ) : (
                      <button className="bh-open-btn" onClick={() => {
                        const result = prompt('Enter result (€):');
                        if (result) handleOpenBonus(bonus.id, Number(result));
                      }}>Open</button>
                    )}
                    <button className="bh-remove-btn" onClick={() => handleRemoveBonus(bonus.id)} title="Remove">✕</button>
                  </div>
                </div>
              ))}
              {bonusList.length === 0 && <p className="bh-empty">No bonuses added yet</p>}
            </div>
          </div>
        </div>

        <div className="bh-modal-footer">
          <button className="bh-done-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
