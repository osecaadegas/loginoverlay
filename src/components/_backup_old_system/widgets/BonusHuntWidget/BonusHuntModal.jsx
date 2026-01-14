import { useState } from 'react';

export default function BonusHuntModal({ overlay, onClose, slots, updateSettings }) {
  
  const [startMoney, setStartMoney] = useState(overlay.settings.widgets?.bonusHunt?.startMoney || 0);
  const [targetMoney, setTargetMoney] = useState(overlay.settings.widgets?.bonusHunt?.targetMoney || 0);
  const [stopLoss, setStopLoss] = useState(overlay.settings.widgets?.bonusHunt?.stopLoss || 0);
  const [betSize, setBetSize] = useState('');
  const [slotSearch, setSlotSearch] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isSuperBonus, setIsSuperBonus] = useState(false);
  const [showStatistics, setShowStatistics] = useState(overlay.settings.widgets?.bonusHunt?.showStatistics ?? true);
  const [animatedTracker, setAnimatedTracker] = useState(overlay.settings.widgets?.bonusHunt?.animatedTracker ?? true);
  const [bonusList, setBonusList] = useState(overlay.settings.widgets?.bonusHunt?.bonusList || []);
  const [showSlotSuggestions, setShowSlotSuggestions] = useState(false);
  const [positionX, setPositionX] = useState(overlay.settings.widgets?.bonusHunt?.position?.x || 50);
  const [positionY, setPositionY] = useState(overlay.settings.widgets?.bonusHunt?.position?.y || 50);

  const filteredSlots = slotSearch.trim().length > 0 && Array.isArray(slots) && slots.length > 0
    ? slots.filter(slot => {
        const hasName = slot && slot.name;
        if (!hasName) return false;
        return slot.name.toLowerCase().includes(slotSearch.toLowerCase());
      })
    : [];

  const handleAddBonus = () => {
    const betSizeNum = Number(betSize);
    if (!selectedSlot || !betSize || betSizeNum <= 0) return;
    
    const newBonus = {
      id: Date.now(),
      slot: selectedSlot,
      betSize: betSizeNum,
      isSuperBonus,
      opened: false,
      result: 0
    };

    const updatedList = [...bonusList, newBonus];
    setBonusList(updatedList);
    saveBonusHuntSettings(updatedList);
    
    // Reset form
    setSelectedSlot(null);
    setSlotSearch('');
    setBetSize('');
    setIsSuperBonus(false);
  };

  const handleOpenBonus = (bonusId, result) => {
    const updatedList = bonusList.map(b => 
      b.id === bonusId ? { ...b, opened: true, result } : b
    );
    setBonusList(updatedList);
    saveBonusHuntSettings(updatedList);
  };

  const handleRemoveBonus = (bonusId) => {
    const updatedList = bonusList.filter(b => b.id !== bonusId);
    setBonusList(updatedList);
    saveBonusHuntSettings(updatedList);
  };

  const saveBonusHuntSettings = (list = bonusList) => {
    const newSettings = {
      ...overlay.settings,
      widgets: {
        ...overlay.settings.widgets,
        bonusHunt: {
          ...overlay.settings.widgets.bonusHunt,
          startMoney,
          targetMoney,
          stopLoss,
          betSize,
          showStatistics,
          animatedTracker,
          bonusList: list,
          position: {
            x: positionX,
            y: positionY
          }
        }
      }
    };
    updateSettings(newSettings);
  };

  return (
    <>
      <div className="modal-overlay-transparent" onClick={onClose}></div>
      <div className="modal-content modal-draggable">
        <div className="modal-header">
          <h2>🎯 Bonus Hunt Tracker Configuration</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-section">
            <h3>Hunt Settings</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Start Money (€)</label>
                <input 
                  type="number" 
                  value={startMoney} 
                  onChange={(e) => setStartMoney(Number(e.target.value))}
                  onBlur={() => saveBonusHuntSettings()}
                />
              </div>
              <div className="form-group">
                <label>Target Money (€)</label>
                <input 
                  type="number" 
                  value={targetMoney} 
                  onChange={(e) => setTargetMoney(Number(e.target.value))}
                  onBlur={() => saveBonusHuntSettings()}
                />
              </div>
              <div className="form-group">
                <label>Stop Loss (€)</label>
                <input 
                  type="number" 
                  value={stopLoss} 
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  onBlur={() => saveBonusHuntSettings()}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Add Bonus</h3>
            <div className="add-bonus-inline">
              <div className="slot-search-wrapper">
                <input 
                  type="text" 
                  value={selectedSlot ? selectedSlot.name : slotSearch}
                  onChange={(e) => {
                    setSlotSearch(e.target.value);
                    setSelectedSlot(null);
                    setShowSlotSuggestions(true);
                  }}
                  onFocus={() => setShowSlotSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSlotSuggestions(false), 200)}
                  placeholder={`Search ${slots?.length || 0} slots...`}
                />
                {showSlotSuggestions && slotSearch.trim().length > 0 && (
                  <div className="slot-suggestions">
                    {filteredSlots.length > 0 ? (
                      filteredSlots.slice(0, 8).map(slot => (
                        <div 
                          key={slot.id} 
                          className="slot-suggestion"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSelectedSlot(slot);
                            setSlotSearch(slot.name);
                            setShowSlotSuggestions(false);
                          }}
                        >
                          <img 
                            src={slot.image || 'https://via.placeholder.com/60x60/1a1d23/d4af37?text=Slot'} 
                            alt={slot.name}
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/60x60/1a1d23/d4af37?text=Slot';
                            }}
                          />
                          <div>
                            <div className="slot-name">{slot.name}</div>
                            <div className="slot-provider">{slot.provider}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-results">
                        {!slots || slots.length === 0 ? 'Loading slots...' : `No slots found for "${slotSearch}"`}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <input 
                type="number" 
                className="bet-size-input"
                value={betSize} 
                onChange={(e) => setBetSize(e.target.value)}
                placeholder="Bet Size"
                step="0.1"
              />
              <label className="super-bonus-compact">
                <input 
                  type="checkbox" 
                  checked={isSuperBonus}
                  onChange={(e) => setIsSuperBonus(e.target.checked)}
                />
                <span>⭐ Super</span>
              </label>
            </div>

            <div className="add-bonus-actions">
              <button className="add-bonus-btn" onClick={handleAddBonus}>
                ➕ Add to Hunt
              </button>
              <div className="toggle-options">
                <label className="toggle-option">
                  <span>Show Statistics</span>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={showStatistics}
                      onChange={(e) => {
                        setShowStatistics(e.target.checked);
                        saveBonusHuntSettings();
                      }}
                    />
                    <span className="slider"></span>
                  </label>
                </label>
                <label className="toggle-option">
                  <span>Animated Tracker</span>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={animatedTracker}
                      onChange={(e) => {
                        setAnimatedTracker(e.target.checked);
                        saveBonusHuntSettings();
                      }}
                    />
                    <span className="slider"></span>
                  </label>
                </label>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="bonus-list-header">
              <h3>Bonus List ({bonusList.length})</h3>
            </div>
            <div className="bonus-list">
              {bonusList.map(bonus => (
                <div key={bonus.id} className={`bonus-item ${bonus.opened ? 'opened' : ''}`}>
                  {bonus.slot.image && <img src={bonus.slot.image} alt={bonus.slot.name} />}
                  <div className="bonus-info">
                    <div className="bonus-name">{bonus.slot.name}</div>
                    <div className="bonus-details">
                      €{bonus.betSize} {bonus.isSuperBonus && '⭐'}
                    </div>
                  </div>
                  <div className="bonus-actions">
                    {bonus.opened ? (
                      <div className="bonus-result">€{bonus.result}</div>
                    ) : (
                      <button 
                        className="open-btn"
                        onClick={() => {
                          const result = prompt('Enter result (€):');
                          if (result) handleOpenBonus(bonus.id, Number(result));
                        }}
                      >
                        Open
                      </button>
                    )}
                    <button 
                      className="remove-btn"
                      onClick={() => handleRemoveBonus(bonus.id)}
                      title="Remove from hunt"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-save-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </>
  );
}
