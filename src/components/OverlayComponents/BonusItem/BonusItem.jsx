import './BonusItem.css';
import { useBonusHunt } from '../../context/BonusHuntContext';

const BonusItem = ({ bonus, onToggleSuper, onOpenBonus }) => {
  const { getSlotImage } = useBonusHunt();
  const slotImage = getSlotImage(bonus.slotName);
  
  const handleClick = (e) => {
    // Double-click to toggle super status
    if (e.detail === 2 && onToggleSuper) {
      onToggleSuper(bonus.id);
    }
    // Single click to open bonus
    else if (e.detail === 1 && onOpenBonus) {
      onOpenBonus(bonus.id);
    }
  };
  
  return (
    <li 
      className={`bonus-item${bonus.isSuper ? ' super-slot' : ''}`}
      data-bonus-id={bonus.id}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="bonus-content">
        <img 
          src={slotImage} 
          alt={bonus.slotName} 
          className="bonus-slot-image"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDEwMCAxNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxNDAiIHJ4PSIxMiIgZmlsbD0idXJsKCNncmFkaWVudDApIi8+PHRleHQgeD0iNTAiIHk9IjcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTM0NkZGIiBmb250LXNpemU9IjMwIj7wn46wPC90ZXh0PjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQwIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM5MzQ2RkYiIHN0b3Atb3BhY2l0eT0iMC4yIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMTkxOTI4IiBzdG9wLW9wYWNpdHk9IjAuOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjwvc3ZnPg==';
          }}
        />
        <div className="bonus-info-section">
          <div className="bonus-slot-name">{bonus.slotName}</div>
          <div className="bonus-metrics">
            <div className="metric-item">
              <div className="metric-value">€{bonus.betSize.toFixed(2)}</div>
              <div className="metric-label">BET</div>
            </div>
            <div className="metric-item">
              <div className={`metric-value payout-value ${bonus.multiplier > 0 ? 'completed' : 'pending'}`}>
                {bonus.multiplier > 0 ? `€${(bonus.betSize * bonus.multiplier).toFixed(2)}` : '--'}
              </div>
              <div className="metric-label">WIN</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">{bonus.multiplier > 0 ? bonus.multiplier.toFixed(2) : '0.00'}x</div>
              <div className="metric-label">MULT</div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

export default BonusItem;
