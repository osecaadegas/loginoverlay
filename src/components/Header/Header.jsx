import './Header.css';
import overlayConfig from '../../config/overlayConfig';
import { useBonusHunt } from '../../context/BonusHuntContext';

const Header = () => {
  const { stats } = useBonusHunt();
  const { headerTitle, currency, decimals } = overlayConfig.display;
  const { totalBonuses, totalCost, profitLoss, openedBonuses } = stats;

  const formatCurrency = (value) => {
    return `${currency}${value.toFixed(decimals)}`;
  };

  const getProfitLossClass = () => {
    if (profitLoss > 0) return 'positive';
    if (profitLoss < 0) return 'negative';
    return 'neutral';
  };

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="header-title">{headerTitle}</h1>
        
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">Session Balance:</span>
            <span className={`stat-value ${getProfitLossClass()}`}>
              {formatCurrency(profitLoss)}
            </span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Bonuses Collected:</span>
            <span className="stat-value">{openedBonuses} / {totalBonuses}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Total Cost:</span>
            <span className="stat-value">{formatCurrency(totalCost)}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">P/L:</span>
            <span className={`stat-value ${getProfitLossClass()}`}>
              {formatCurrency(profitLoss)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
