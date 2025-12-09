import './StatsPanel.css';
import { useBonusHunt } from '../../context/BonusHuntContext';
import useDraggable from '../../hooks/useDraggable';
import { useState, useEffect } from 'react';

const StatsPanel = () => {
  const { bonuses, startMoney, stopMoney, actualBalance, totalSpent } = useBonusHunt();
  const draggableRef = useDraggable(true, 'stats');
  
  // State to track current theme colors
  const [themeColors, setThemeColors] = useState({
    primary: '',
    secondary: '',
    accent: '',
    text: ''
  });

  // Function to update colors from CSS variables
  const updateThemeColors = () => {
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim() || '#d97706';
    const secondary = getComputedStyle(document.documentElement).getPropertyValue('--theme-secondary').trim() || '#dc2626';
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim() || '#ca8a04';
    const text = getComputedStyle(document.documentElement).getPropertyValue('--theme-text').trim() || '#fed7aa';
    
    console.log('StatsPanel theme colors updated:', { primary, secondary, accent, text });
    setThemeColors({ primary, secondary, accent, text });
  };

  // Listen for theme changes and update on mount
  useEffect(() => {
    // Initial update
    updateThemeColors();
    
    // Update after a delay to ensure CSS is loaded
    const timer = setTimeout(updateThemeColors, 200);

    const handleThemeChange = (e) => {
      console.log('Theme changed event received:', e.detail);
      // Update immediately when theme changes
      setTimeout(updateThemeColors, 100);
    };

    window.addEventListener('themeChanged', handleThemeChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);

  const totalBonuses = bonuses.length;
  const completedBonuses = bonuses.filter(b => b.opened && b.multiplier !== null).length;

  const totalWinnings = bonuses.reduce((sum, b) => {
    if (b.opened && b.multiplier !== null) {
      return sum + (b.betSize * b.multiplier);
    }
    return sum;
  }, 0);
  
  const openedBonuses = bonuses.filter(b => b.opened && b.multiplier !== null);
  const averageMultiplier = openedBonuses.length > 0
    ? openedBonuses.reduce((sum, b) => sum + b.multiplier, 0) / openedBonuses.length
    : 0;
  
  const profitLoss = totalWinnings - totalSpent;
  
  const unopenedBets = bonuses
    .filter(b => !b.opened || b.multiplier === null)
    .reduce((sum, b) => sum + b.betSize, 0);
  
  const requiredMultiplier = unopenedBets > 0
    ? (totalSpent - totalWinnings) / unopenedBets
    : 0;

  const bestSlot = openedBonuses.length > 0
    ? openedBonuses.reduce((best, b) => {
        if (!best || b.multiplier > best.multiplier) {
          return { slotName: b.slotName, multiplier: b.multiplier };
        }
        return best;
      }, null)
    : null;

  const worstSlot = openedBonuses.length > 0
    ? openedBonuses.reduce((worst, b) => {
        if (!worst || b.multiplier < worst.multiplier) {
          return { slotName: b.slotName, multiplier: b.multiplier };
        }
        return worst;
      }, null)
    : null;

  const formatCurrency = (value) => `€${value.toFixed(2)}`;
  const formatMultiplier = (value) => `${value.toFixed(2)}x`;

  return (
    <div 
      className="bonus-stats-panel-inline" 
      ref={draggableRef}
      style={{
        background: themeColors.primary ? `linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.6))` : undefined,
        borderColor: themeColors.primary || undefined,
        boxShadow: themeColors.primary ? `0 8px 32px 0 ${themeColors.primary}20, 0 1.5px 0 0 ${themeColors.primary} inset` : undefined,
        fontFamily: 'var(--theme-font)',
        color: themeColors.text || undefined
      }}
    >
      <div 
        className="stats-panel-header drag-handle"
        style={{
          color: themeColors.text || undefined
        }}
      >
        <h3 style={{ color: themeColors.text || undefined }}> BONUS HUNT STATISTICS</h3>
      </div>
      
      <div className="stats-panel-content">
        <div className="stat-card" style={{ 
          background: `color-mix(in srgb, ${themeColors.secondary} 10%, rgba(0, 0, 0, 0.3))`,
          borderColor: `color-mix(in srgb, ${themeColors.primary} 15%, transparent)`
        }}>
          <div className="stat-icon"></div>
          <div className="stat-info">
            <div className="stat-label" style={{ color: `color-mix(in srgb, ${themeColors.text} 70%, transparent)` }}>Start Money</div>
            <div className="stat-value" style={{ color: themeColors.text }}>{formatCurrency(startMoney)}</div>
          </div>
        </div>

        <div className="stat-card" style={{ 
          background: `color-mix(in srgb, ${themeColors.secondary} 10%, rgba(0, 0, 0, 0.3))`,
          borderColor: `color-mix(in srgb, ${themeColors.primary} 15%, transparent)`
        }}>
          <div className="stat-icon"></div>
          <div className="stat-info">
            <div className="stat-label" style={{ color: `color-mix(in srgb, ${themeColors.text} 70%, transparent)` }}>Target Money</div>
            <div className="stat-value" style={{ color: themeColors.text }}>{formatCurrency(stopMoney)}</div>
          </div>
        </div>

        <div className="stat-card" style={{ 
          background: `color-mix(in srgb, ${themeColors.secondary} 10%, rgba(0, 0, 0, 0.3))`,
          borderColor: `color-mix(in srgb, ${themeColors.primary} 15%, transparent)`
        }}>
          <div className="stat-icon"></div>
          <div className="stat-info">
            <div className="stat-label" style={{ color: `color-mix(in srgb, ${themeColors.text} 70%, transparent)` }}>Current Balance</div>
            <div className="stat-value" style={{ color: themeColors.text }}>{formatCurrency(actualBalance)}</div>
          </div>
        </div>

        <div className="stat-card" style={{ 
          background: `color-mix(in srgb, ${themeColors.secondary} 10%, rgba(0, 0, 0, 0.3))`,
          borderColor: `color-mix(in srgb, ${themeColors.primary} 15%, transparent)`
        }}>
          <div className="stat-icon"></div>
          <div className="stat-info">
            <div className="stat-label" style={{ color: `color-mix(in srgb, ${themeColors.text} 70%, transparent)` }}>Total Spent</div>
            <div className="stat-value" style={{ color: themeColors.text }}>{formatCurrency(totalSpent)}</div>
          </div>
        </div>

        <div className="stat-card" style={{ 
          background: `color-mix(in srgb, ${themeColors.secondary} 10%, rgba(0, 0, 0, 0.3))`,
          borderColor: `color-mix(in srgb, ${themeColors.primary} 15%, transparent)`
        }}>
          <div className="stat-icon">{profitLoss >= 0 ? '' : ''}</div>
          <div className="stat-info">
            <div className="stat-label" style={{ color: `color-mix(in srgb, ${themeColors.text} 70%, transparent)` }}>Total Profit/Loss</div>
            <div 
              className="stat-value"
              style={{ 
                color: profitLoss >= 0 ? themeColors.accent : themeColors.secondary,
                textShadow: `0 0 10px ${profitLoss >= 0 ? themeColors.accent : themeColors.secondary}66`
              }}
            >
              {formatCurrency(profitLoss)}
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ 
          background: `color-mix(in srgb, ${themeColors.secondary} 10%, rgba(0, 0, 0, 0.3))`,
          borderColor: `color-mix(in srgb, ${themeColors.primary} 15%, transparent)`
        }}>
          <div className="stat-icon"></div>
          <div className="stat-info">
            <div className="stat-label" style={{ color: `color-mix(in srgb, ${themeColors.text} 70%, transparent)` }}>Total Bonuses</div>
            <div className="stat-value" style={{ color: themeColors.text }}>{totalBonuses}</div>
            <div className="stat-subvalue" style={{ color: `color-mix(in srgb, ${themeColors.text} 70%, transparent)` }}>({completedBonuses} opened)</div>
          </div>
        </div>

        <div className="stat-card" style={{ 
          background: `color-mix(in srgb, ${themeColors.secondary} 10%, rgba(0, 0, 0, 0.3))`,
          borderColor: `color-mix(in srgb, ${themeColors.primary} 15%, transparent)`
        }}>
          <div className="stat-icon"></div>
          <div className="stat-info">
            <div className="stat-label" style={{ color: `color-mix(in srgb, ${themeColors.text} 70%, transparent)` }}>Avg Multiplier</div>
            <div 
              className="stat-value"
              style={{ 
                color: averageMultiplier >= requiredMultiplier ? themeColors.accent : themeColors.secondary,
                textShadow: `0 0 10px ${averageMultiplier >= requiredMultiplier ? themeColors.accent : themeColors.secondary}66`
              }}
            >
              {formatMultiplier(averageMultiplier)}
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ 
          background: `color-mix(in srgb, ${themeColors.secondary} 10%, rgba(0, 0, 0, 0.3))`,
          borderColor: `color-mix(in srgb, ${themeColors.primary} 15%, transparent)`
        }}>
          <div className="stat-icon"></div>
          <div className="stat-info">
            <div className="stat-label" style={{ color: `color-mix(in srgb, ${themeColors.text} 70%, transparent)` }}>Required Mult.</div>
            <div className="stat-value" style={{ color: themeColors.text }}>{formatMultiplier(requiredMultiplier)}</div>
            <div className="stat-subvalue" style={{ color: `color-mix(in srgb, ${themeColors.text} 70%, transparent)` }}>(break-even)</div>
          </div>
        </div>

        <div className="stat-card" style={{ 
          background: `color-mix(in srgb, ${themeColors.secondary} 10%, rgba(0, 0, 0, 0.3))`,
          borderColor: `color-mix(in srgb, ${themeColors.primary} 15%, transparent)`
        }}>
          <div className="stat-icon"></div>
          <div className="stat-info">
            <div className="stat-label" style={{ color: `color-mix(in srgb, ${themeColors.text} 70%, transparent)` }}>Best Slot</div>
            <div className="stat-value" style={{ color: themeColors.text }}>{bestSlot ? bestSlot.slotName : '--'}</div>
            {bestSlot && <div className="stat-subvalue" style={{ color: `color-mix(in srgb, ${themeColors.text} 70%, transparent)` }}>{formatMultiplier(bestSlot.multiplier)}</div>}
          </div>
        </div>

        <div className="stat-card" style={{ 
          background: `color-mix(in srgb, ${themeColors.secondary} 10%, rgba(0, 0, 0, 0.3))`,
          borderColor: `color-mix(in srgb, ${themeColors.primary} 15%, transparent)`
        }}>
          <div className="stat-icon"></div>
          <div className="stat-info">
            <div className="stat-label" style={{ color: `color-mix(in srgb, ${themeColors.text} 70%, transparent)` }}>Worst Slot</div>
            <div className="stat-value" style={{ color: themeColors.text }}>{worstSlot ? worstSlot.slotName : '--'}</div>
            {worstSlot && <div className="stat-subvalue" style={{ color: `color-mix(in srgb, ${themeColors.text} 70%, transparent)` }}>{formatMultiplier(worstSlot.multiplier)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
