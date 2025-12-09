import { useBonusHunt } from '../../context/BonusHuntContext';
import './CurrentlyOpening.css';

const CurrentlyOpening = ({ selectedBonusId }) => {
  const { bonuses, getSlotImage } = useBonusHunt();
  
  // Find the bonus being opened - use selectedBonusId if provided, otherwise first unopened
  const openingBonus = selectedBonusId 
    ? bonuses.find(b => b.id === selectedBonusId)
    : bonuses.find(b => !b.opened);

  if (!openingBonus || !openingBonus.slotName) {
    return null;
  }

  return (
    <div className="currently-opening-card" key={openingBonus.id}>
      <img 
        key={`opening-${openingBonus.id}`}
        src={getSlotImage(openingBonus.slotName)} 
        alt={openingBonus.slotName}
        className="currently-opening-image"
      />
      <div className="currently-opening-header">
        <div className="opening-header-text">OPENING NOW</div>
      </div>
      <div className="currently-opening-bet">
        <div className="opening-bet-text">
          €{openingBonus.betSize.toFixed(2)}
        </div>
      </div>
    </div>
  );
};

export default CurrentlyOpening;
