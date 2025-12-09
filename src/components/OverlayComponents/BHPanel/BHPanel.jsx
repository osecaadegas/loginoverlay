import { useState, useRef, useEffect } from 'react';
import './BHPanel.css';
import { useBonusHunt } from '../../../context/BonusHuntContext';
import overlayConfig from '../../../config/overlayConfig';
import { slotDatabase } from '../../../data/slotDatabase';
import useDraggable from '../../../hooks/useDraggable';

const BHPanel = ({ onClose, onOpenBonusOpening }) => {
  const {
    addBonus,
    updateBonus,
    deleteBonus,
    startMoney,
    stopMoney,
    actualBalance,
    totalSpent,
    setStartMoney,
    setStopMoney,
    setActualBalance,
    setCustomSlotImage,
    clearAllBonuses,
    bonuses
  } = useBonusHunt();

  const [slotName, setSlotName] = useState('');
  const [betSize, setBetSize] = useState('');
  const [isSuper, setIsSuper] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [customImage, setCustomImage] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingBonusId, setEditingBonusId] = useState(null);
  const [showStats, setShowStats] = useState(() => localStorage.getItem('showBHStats') !== 'false');
  const [showCards, setShowCards] = useState(() => localStorage.getItem('showBHCards') !== 'false');

  const slotNameRef = useRef(null);
  const betSizeRef = useRef(null);
  const fileInputRef = useRef(null);
  const { currency } = overlayConfig.display;
  const draggableRef = useDraggable(true, 'bonushunt');

  const toggleStats = () => {
    const newValue = !showStats;
    setShowStats(newValue);
    localStorage.setItem('showBHStats', newValue);
    window.dispatchEvent(new CustomEvent('toggleBHStats', { detail: { show: newValue } }));
  };

  const toggleCards = () => {
    const newValue = !showCards;
    setShowCards(newValue);
    localStorage.setItem('showBHCards', newValue);
    window.dispatchEvent(new CustomEvent('toggleBHCards', { detail: { show: newValue } }));
  };

  // Handle import
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      importBonuses(file);
      e.target.value = ''; // Reset input
    }
  };

  // Handle slot name input with suggestions
  const handleSlotNameChange = (e) => {
    const value = e.target.value;
    setSlotName(value);

    if (value.length >= 2) {
      const matches = slotDatabase
        .filter(slot => slot.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 8);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle Enter key on slot name input
  const handleSlotNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      betSizeRef.current?.focus();
    }
  };

  // Handle Enter key on bet size input
  const handleBetSizeKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBonus();
    }
  };

  // Select suggestion
  const selectSuggestion = (slot) => {
    setSlotName(slot.name);
    setShowSuggestions(false);
    betSizeRef.current?.focus();
  };

  // Handle form submission
  const handleAddBonus = (e) => {
    e?.preventDefault();
    
    if (!slotName.trim() || !betSize || parseFloat(betSize) <= 0) {
      return;
    }

    const slot = slotDatabase.find(s => s.name.toLowerCase() === slotName.toLowerCase());
    
    if (editingBonusId) {
      // Update existing bonus
      updateBonus(editingBonusId, {
        slotName: slotName.trim(),
        betSize: parseFloat(betSize),
        expectedRTP: slot?.rtp || 96.00,
        isSuper
      });
      setEditingBonusId(null);
    } else {
      // Add new bonus
      addBonus({
        slotName: slotName.trim(),
        betSize: parseFloat(betSize),
        expectedRTP: slot?.rtp || 96.00,
        isSuper
      });
    }

    // Save custom image if provided
    if (customImage.trim()) {
      setCustomSlotImage(slotName.trim(), customImage.trim());
      setCustomImage('');
    }

    // Clear form
    setSlotName('');
    setBetSize('');
    setIsSuper(false);
    setShowImageInput(false);
    slotNameRef.current?.focus();
  };

  // Handle editing a bonus
  const handleEditBonus = (bonus) => {
    setSlotName(bonus.slotName);
    setBetSize(bonus.betSize.toString());
    setIsSuper(bonus.isSuper);
    setEditingBonusId(bonus.id);
    setEditMode(false);
    slotNameRef.current?.focus();
  };

  // Handle deleting a bonus
  const handleDeleteBonus = (bonusId) => {
    deleteBonus(bonusId);
  };

  // Focus slot name input on mount
  useEffect(() => {
    slotNameRef.current?.focus();
  }, []);

  // Auto-calculate total spent
  useEffect(() => {
    const spent = startMoney - stopMoney;
    if (spent >= 0) {
      setActualBalance(stopMoney);
    }
  }, [startMoney, stopMoney]);

  const handleOpeningClick = () => {
    if (onOpenBonusOpening) {
      // Find first unopened bonus
      const firstUnopened = bonuses.find(b => !b.opened);
      if (firstUnopened) {
        onOpenBonusOpening(firstUnopened.id);
        onClose(); // Close the BHPanel when opening the BonusOpening panel
      } else {
        onOpenBonusOpening(null);
      }
    }
  };

  return (
    <div className="bh-panel" ref={draggableRef}>
      <div className="bh-panel-header drag-handle">
        <h3>🎰 Bonus Hunt</h3>
        <div className="header-actions">
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="bh-panel-content">
        {/* Balance Inputs */}
        <div className="bh-panel-row">
          <div className="bh-input-group">
            <label>Start Money</label>
            <input
              type="number"
              value={startMoney}
              onChange={(e) => setStartMoney(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>
          <div className="bh-input-group">
            <label>Target</label>
            <input
              type="number"
              value={stopMoney}
              onChange={(e) => setStopMoney(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <div className="bh-panel-row">
          <div className="bh-input-group">
            <label>Stop Loss</label>
            <input
              type="number"
              value={actualBalance}
              onChange={(e) => setActualBalance(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>
          <div className="bh-input-group">
            <label>Total Spent</label>
            <input
              type="number"
              value={totalSpent.toFixed(2)}
              placeholder="Auto calculated"
              readOnly
              disabled
            />
          </div>
        </div>

        {/* Slot Input */}
        <div className="bh-panel-row">
          <div className="bh-input-group bh-slot-input-group">
            <label>Slot Name</label>
            <div className="bh-input-with-suggestions">
              <input
                ref={slotNameRef}
                type="text"
                value={slotName}
                onChange={handleSlotNameChange}
                onKeyPress={handleSlotNameKeyPress}
                onFocus={() => slotName.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Enter slot name"
              />
              {showSuggestions && (
                <div className="bh-suggestions">
                  {suggestions.map((slot, idx) => (
                    <div
                      key={idx}
                      className="bh-suggestion-item"
                      onMouseDown={() => selectSuggestion(slot)}
                    >
                      <img src={slot.image} alt={slot.name} />
                      <div className="bh-suggestion-info">
                        <div className="bh-suggestion-name">{slot.name}</div>
                        <div className="bh-suggestion-provider">{slot.provider}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="bh-input-group">
            <label>Bet Size</label>
            <input
              ref={betSizeRef}
              type="number"
              value={betSize}
              onChange={(e) => setBetSize(e.target.value)}
              onKeyPress={handleBetSizeKeyPress}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        {/* Custom Image URL (toggleable) */}
        {showImageInput && (
          <div className="bh-panel-row">
            <div className="bh-input-group" style={{ width: '100%' }}>
              <label>Slot Image URL</label>
              <input
                type="url"
                value={customImage}
                onChange={(e) => setCustomImage(e.target.value)}
                placeholder="Paste image URL here"
              />
            </div>
          </div>
        )}

        {/* Super Checkbox & Action Buttons */}
        <div className="bh-panel-actions">
          <label className="bh-checkbox">
            <input
              type="checkbox"
              checked={isSuper}
              onChange={(e) => setIsSuper(e.target.checked)}
            />
            <span>Super</span>
          </label>

          <div className="bh-action-buttons">
            <button
              className="bh-btn bh-btn-secondary"
              onClick={() => setShowImageInput(!showImageInput)}
              type="button"
            >
              🖼️ Slot Image
            </button>
            <button
              className="bh-btn bh-btn-primary"
              onClick={handleAddBonus}
              type="button"
            >
              {editingBonusId ? '💾 Update Slot' : '➕ Add Slot'}
            </button>
          </div>
        </div>

        {/* Management Actions */}
        <div className="bh-panel-footer">
          <div className="bh-management-buttons">
            <button
              className={`bh-btn bh-btn-small ${showStats ? 'bh-btn-active' : ''}`}
              onClick={toggleStats}
              type="button"
              title="Toggle Statistics Panel"
            >
              📊 Stats
            </button>
            <button
              className={`bh-btn bh-btn-small ${showCards ? 'bh-btn-active' : ''}`}
              onClick={toggleCards}
              type="button"
              title="Toggle Spinning Cards"
            >
              🎴 Cards
            </button>
            <button
              className={`bh-btn bh-btn-small ${editMode ? 'bh-btn-active' : ''}`}
              onClick={() => setEditMode(!editMode)}
              type="button"
              title="Edit bonus slots"
            >
              ✏️ {editMode ? 'Done Editing' : 'Edit Slots'}
            </button>
            <button
              className="bh-btn bh-btn-small bh-btn-danger"
              onClick={clearAllBonuses}
              type="button"
              title="Clear all bonuses"
            >
              🗑️ Clear All
            </button>
            {bonuses.length > 0 && (
              <button
                className="bh-btn bh-btn-small bh-btn-opening"
                onClick={handleOpeningClick}
                type="button"
                title="Open Bonus Opening Panel"
              >
                🎁 Opening
              </button>
            )}
          </div>
        </div>

        {/* Edit Mode - List of bonuses */}
        {editMode && bonuses.length > 0 && (
          <div className="bh-edit-list">
            <h4>📝 Edit Bonuses</h4>
            <div className="bh-edit-items">
              {bonuses.map((bonus) => (
                <div key={bonus.id} className="bh-edit-item">
                  <div className="bh-edit-item-info">
                    <span className="bh-edit-slot-name">{bonus.slotName}</span>
                    <span className="bh-edit-bet-size">€{bonus.betSize.toFixed(2)}</span>
                    {bonus.isSuper && <span className="bh-edit-super-badge">⭐</span>}
                  </div>
                  <div className="bh-edit-item-actions">
                    <button
                      className="bh-btn bh-btn-icon"
                      onClick={() => handleEditBonus(bonus)}
                      title="Edit this bonus"
                    >
                      ✏️
                    </button>
                    <button
                      className="bh-btn bh-btn-icon bh-btn-danger"
                      onClick={() => handleDeleteBonus(bonus.id)}
                      title="Delete this bonus"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BHPanel;
