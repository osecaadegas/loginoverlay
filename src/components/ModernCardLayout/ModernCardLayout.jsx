import { useState, useEffect } from 'react';
import { useBonusHunt } from '../../context/BonusHuntContext';
import { findSlotByName } from '../../utils/slotUtils';
import { getProviderLogo } from '../../utils/providerLogos';
import './ModernCardLayout.css';

const ModernCardLayout = ({ showCards = true }) => {
  const { bonuses, getSlotImage } = useBonusHunt();
  const [slotData, setSlotData] = useState({});

  // Fetch slot data for all bonuses
  useEffect(() => {
    async function fetchSlotData() {
      const data = {};
      for (const bonus of bonuses) {
        if (!data[bonus.slotName]) {
          const slot = await findSlotByName(bonus.slotName);
          if (slot) {
            data[bonus.slotName] = slot;
          }
        }
      }
      setSlotData(data);
    }
    if (bonuses.length > 0) {
      fetchSlotData();
    }
  }, [bonuses]);

  if (bonuses.length === 0) {
    return (
      <div className="modern-card-layout">
        <div className="no-bonuses-card">
          <div className="no-bonuses-icon">🎰</div>
          <p>No bonuses added yet</p>
        </div>
      </div>
    );
  }

  if (!showCards) {
    return <div className="modern-card-layout" style={{ display: 'none' }} />;
  }

  // Find best and worst opened bonuses
  const openedBonuses = bonuses.filter(b => b.multiplier !== null && b.multiplier !== undefined);
  let bestBonusId = null;
  let worstBonusId = null;

  if (openedBonuses.length >= 2) {
    const bestBonus = openedBonuses.reduce((best, current) => 
      current.multiplier > best.multiplier ? current : best
    );
    const worstBonus = openedBonuses.reduce((worst, current) => 
      current.multiplier < worst.multiplier ? current : worst
    );
    
    // Don't set same bonus as both best and worst
    if (bestBonus.id !== worstBonus.id) {
      bestBonusId = bestBonus.id;
      worstBonusId = worstBonus.id;
      console.log('Best bonus:', bestBonus.slotName, bestBonus.multiplier + 'x', 'ID:', bestBonusId);
      console.log('Worst bonus:', worstBonus.slotName, worstBonus.multiplier + 'x', 'ID:', worstBonusId);
    }
  }

  return (
    <div className="modern-card-layout">
      <div className="card-carousel">
        {bonuses.map((bonus) => {
          const payout = bonus.multiplier ? bonus.multiplier * bonus.betSize : 0;
          const profitLoss = payout - bonus.betSize;
          const slot = slotData[bonus.slotName];
          const image = getSlotImage(bonus.slotName, slot);
          const provider = slot?.provider || 'Unknown Provider';
          const providerLogo = getProviderLogo(provider);
          
          // Determine glow class
          let glowClass = '';
          if (bonus.id === bestBonusId) glowClass = 'best-glow';
          if (bonus.id === worstBonusId) glowClass = 'worst-glow';
          
          return (
            <div key={bonus.id} className={`bonus-card ${bonus.opened ? 'opened' : 'unopened'} ${glowClass}`}>
              <div className="card-image-section">
                <div className="card-flipper">
                  {/* Front side - Slot Image */}
                  <div className="card-face card-face-front">
                    <img 
                      src={image} 
                      alt={bonus.slotName}
                      className="card-slot-image"
                      loading="eager"
                    />
                  </div>
                  
                  {/* Back side - Provider Info */}
                  <div className="card-face card-face-back">
                    {providerLogo ? (
                      <div className="provider-logo-container">
                        <img 
                          src={providerLogo} 
                          alt={provider}
                          className="provider-logo-image"
                          loading="eager"
                        />
                      </div>
                    ) : (
                      <div className="provider-text-container">
                        <span className="provider-text">{provider}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {bonus.opened && (
                  <div className="card-payout-overlay">
                    <div className="payout-value">€{payout.toFixed(2)}</div>
                    <div className="multiplier-value">{bonus.multiplier.toFixed(2)}x</div>
                  </div>
                )}
              </div>
              
              <div className="card-details-section">
                <h3 className="card-slot-name">{bonus.slotName}</h3>
                <div className="card-provider">{provider}</div>
                
                <div className="card-stats">
                  <div className="card-stat">
                    <span className="stat-label">Bet</span>
                    <span className="stat-value">€{bonus.betSize.toFixed(2)}</span>
                  </div>
                  
                  {bonus.opened && (
                    <div className="card-stat">
                      <span className="stat-label">Profit/Loss</span>
                      <span className={`stat-value ${profitLoss >= 0 ? 'positive' : 'negative'}`}>
                        {profitLoss >= 0 ? '+' : ''}€{profitLoss.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModernCardLayout;
