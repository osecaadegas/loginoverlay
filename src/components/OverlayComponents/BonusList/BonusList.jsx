import { useEffect, useRef } from 'react';
import './BonusList.css';
import BonusItem from '../BonusItem/BonusItem';
import { useBonusHunt } from '../../context/BonusHuntContext';

const BonusList = ({ onBonusClick }) => {
  const { bonuses, toggleSuperStatus } = useBonusHunt();
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current && bonuses.length > 2) {
      // Enable carousel for more than 2 bonuses
      listRef.current.classList.add('carousel-active');
      
      // Clone items for seamless loop
      const originalItems = listRef.current.querySelectorAll('.bonus-item:not(.bonus-item-clone)');
      
      // Remove existing clones
      const existingClones = listRef.current.querySelectorAll('.bonus-item-clone');
      existingClones.forEach(clone => clone.remove());
      
      // Create first set of clones
      originalItems.forEach(item => {
        const clone1 = item.cloneNode(true);
        clone1.classList.add('bonus-item-clone');
        listRef.current.appendChild(clone1);
      });
      
      // Create second set of clones
      originalItems.forEach(item => {
        const clone2 = item.cloneNode(true);
        clone2.classList.add('bonus-item-clone');
        listRef.current.appendChild(clone2);
      });
      
      // Set animation duration based on number of items
      const duration = originalItems.length * 3;
      listRef.current.style.animationDuration = `${duration}s`;
    } else if (listRef.current) {
      listRef.current.classList.remove('carousel-active');
      // Remove clones when not enough items
      const clones = listRef.current.querySelectorAll('.bonus-item-clone');
      clones.forEach(clone => clone.remove());
    }
  }, [bonuses.length]);

  return (
    <div className="bonus-list-container">
      <div className="bonus-list-inner-container">
        <div className="bonus-list-header">
          <h4>Bonus List</h4>
        </div>
        <div className="carousel-container">
          <div className="gradient-overlay-top"></div>
          <ul className="bonus-list" ref={listRef}>
            {bonuses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎰</div>
                <div className="empty-state-text">No bonuses yet</div>
                <div className="empty-state-subtext">Add a slot to get started</div>
              </div>
            ) : (
              bonuses.map((bonus) => (
                <BonusItem 
                  key={bonus.id} 
                  bonus={bonus} 
                  onToggleSuper={toggleSuperStatus}
                  onOpenBonus={onBonusClick}
                />
              ))
            )}
          </ul>
          <div className="gradient-overlay-bottom"></div>
        </div>
      </div>
      <div className="carousel-indicators">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: bonuses.length > 0 ? '100%' : '0%' }}></div>
        </div>
      </div>
    </div>
  );
};

export default BonusList;
