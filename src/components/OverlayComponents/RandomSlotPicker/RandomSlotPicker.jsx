import { useState, useEffect } from 'react';
import './RandomSlotPicker.css';
import useDraggable from '../../hooks/useDraggable';
import { getAllSlots, getAllProviders } from '../../utils/slotUtils';

const RandomSlotPicker = ({ onClose }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [displaySlot, setDisplaySlot] = useState(null);
  const [slotDatabase, setSlotDatabase] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Initialize with all providers selected
  const [selectedProviders, setSelectedProviders] = useState([]);

  // Fetch slots and providers on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [slots, providers] = await Promise.all([
          getAllSlots(),
          getAllProviders()
        ]);
        setSlotDatabase(slots);
        setAllProviders(providers);
        setSelectedProviders(providers); // Select all by default
      } catch (error) {
        console.error('Error loading slots:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleProvider = (provider) => {
    setSelectedProviders(prev => 
      prev.includes(provider) 
        ? prev.filter(p => p !== provider)
        : [...prev, provider]
    );
  };

  const toggleAllProviders = () => {
    if (selectedProviders.length === allProviders.length) {
      setSelectedProviders([]);
    } else {
      setSelectedProviders(allProviders);
    }
  };

  // Filter slots by selected providers
  const getFilteredSlots = () => {
    if (selectedProviders.length === 0) return [];
    return slotDatabase.filter(slot => selectedProviders.includes(slot.provider));
  };

  const pickRandom = () => {
    const filteredSlots = getFilteredSlots();
    
    if (filteredSlots.length === 0) {
      console.warn('No slots available with selected providers!');
      return;
    }

    setIsSpinning(true);
    setSelectedSlot(null);

    let spins = 0;
    const maxSpins = 30;
    const interval = setInterval(() => {
      const randomSlot = filteredSlots[Math.floor(Math.random() * filteredSlots.length)];
      setDisplaySlot(randomSlot);
      spins++;

      if (spins >= maxSpins) {
        clearInterval(interval);
        setIsSpinning(false);
        const finalSlot = filteredSlots[Math.floor(Math.random() * filteredSlots.length)];
        setSelectedSlot(finalSlot);
        setDisplaySlot(finalSlot);
      }
    }, 80);
  };

  const draggableRef = useDraggable(true, 'randomslot');

  return (
    <div className="random-slot-overlay">
      <div className="random-slot-panel" ref={draggableRef}>
        <div className="random-slot-header drag-handle">
          <h2>🎲 Random Slot Picker</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="random-slot-content">
          {loading ? (
            <div className="slot-placeholder">
              <div className="placeholder-icon">⏳</div>
              <div className="placeholder-text">Loading slots...</div>
            </div>
          ) : (
          <>
          {/* Stats Row */}
          <div className="picker-info">
            <div className="info-stat">
              <span className="stat-label">Available</span>
              <span className="stat-value">{getFilteredSlots().length}</span>
            </div>
            <div className="info-stat">
              <span className="stat-label">Total Slots</span>
              <span className="stat-value">{slotDatabase.length}</span>
            </div>
          </div>

          {/* Main Grid: Left = Filters + Pick Button, Right = Slot + Actions */}
          <div className="picker-main-grid">
            {/* Left Column */}
            <div className="picker-left-column">
              <div className="provider-filters">
                <div className="filter-header">
                  <span className="filter-title">🎮 Providers</span>
                  <button className="toggle-all-btn" onClick={toggleAllProviders}>
                    {selectedProviders.length === allProviders.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="provider-checkboxes">
                  {allProviders.map(provider => (
                    <label key={provider} className="provider-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedProviders.includes(provider)}
                        onChange={() => toggleProvider(provider)}
                      />
                      <span className="checkbox-label">{provider}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button 
                className={`pick-btn ${isSpinning ? 'spinning' : ''}`}
                onClick={pickRandom}
                disabled={isSpinning || getFilteredSlots().length === 0}
              >
                {isSpinning ? '🎰 Spinning...' : '🎲 Pick Random Slot'}
              </button>
            </div>

            {/* Right Column */}
            <div className="picker-right-column">
              {displaySlot ? (
                <>
                  <div className={`slot-card ${isSpinning ? 'spinning' : 'selected'}`}>
                    <img 
                      src={displaySlot.image} 
                      alt={displaySlot.name}
                      className="slot-image"
                      onError={(e) => e.target.src = 'https://via.placeholder.com/150x200?text=Slot'}
                    />
                    <div className="slot-info">
                      <div className="slot-name">{displaySlot.name}</div>
                      <div className="slot-bet">{displaySlot.provider}</div>
                    </div>
                  </div>

                  {!isSpinning && (
                    <div className="result-actions">
                      <button className="action-btn" onClick={pickRandom}>
                        🔄 Pick Again
                      </button>
                      <button className="action-btn primary" onClick={onClose}>
                        ✅ Done
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="slot-placeholder">
                  <div className="placeholder-icon">🎰</div>
                  <div className="placeholder-text">Ready!</div>
                </div>
              )}
            </div>
          </div>

          {getFilteredSlots().length === 0 && selectedProviders.length > 0 && (
            <div className="no-bonuses-message">
              <span className="message-icon">⚠️</span>
              <span>No slots match selected providers!</span>
            </div>
          )}

          {selectedProviders.length === 0 && (
            <div className="no-bonuses-message">
              <span className="message-icon">⚠️</span>
              <span>Please select at least one provider!</span>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RandomSlotPicker;
