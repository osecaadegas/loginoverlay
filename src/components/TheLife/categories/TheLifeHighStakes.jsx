import { useState, useRef } from 'react';
import { useDragScroll } from '../hooks/useDragScroll';
import '../TheLife.css';

/**
 * High Stakes Category Component
 * Contains 2 subcategories for high-risk activities
 */
export default function TheLifeHighStakes({
  player,
  setPlayer,
  setMessage,
  showEventMessage,
  user,
  isInJail,
  isInHospital
}) {
  const [activeSubTab, setActiveSubTab] = useState('subcategory1');
  const contentScrollRef = useRef(null);
  const contentDragScroll = useDragScroll(contentScrollRef);

  // Subcategory definitions - update images/names as needed
  const subcategories = [
    { key: 'subcategory1', name: 'Subcategory 1', image: '/thelife/subcategories/casino.png' },
    { key: 'subcategory2', name: 'Subcategory 2', image: '/thelife/subcategories/stock-market.png' }
  ];

  const renderSubcategoryContent = () => {
    switch (activeSubTab) {
      case 'subcategory1':
        return (
          <div className="highstakes-content">
            <div className="empty-state">
              <h3>Subcategory 1</h3>
              <p>Content coming soon...</p>
            </div>
          </div>
        );
      case 'subcategory2':
        return (
          <div className="highstakes-content">
            <div className="empty-state">
              <h3>Subcategory 2</h3>
              <p>Content coming soon...</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="category-content highstakes-category">
      {/* Subcategory Tabs */}
      <div className="subcategory-tabs">
        {subcategories.map(sub => (
          <button
            key={sub.key}
            className={`subcategory-tab ${activeSubTab === sub.key ? 'active' : ''}`}
            onClick={() => setActiveSubTab(sub.key)}
          >
            <img src={sub.image} alt={sub.name} />
          </button>
        ))}
      </div>

      {/* Subcategory Content */}
      <div 
        className="subcategory-content-scroll"
        ref={contentScrollRef}
        {...contentDragScroll}
      >
        {renderSubcategoryContent()}
      </div>
    </div>
  );
}
