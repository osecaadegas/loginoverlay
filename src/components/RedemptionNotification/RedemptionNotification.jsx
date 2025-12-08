import React, { useState, useEffect } from 'react';
import './RedemptionNotification.css';

const RedemptionNotification = ({ redemption, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 100);

    // Auto-hide after 5 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 500); // Wait for exit animation
    }, 5000);

    return () => clearTimeout(hideTimer);
  }, [onClose]);

  if (!redemption) return null;

  return (
    <div className={`redemption-notification ${isVisible ? 'visible' : ''}`}>
      <div className="redemption-header">
        <div className="redemption-badge">NEW REDEMPTION!</div>
        <button className="redemption-close" onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 500);
        }}>×</button>
      </div>
      
      <div className="redemption-body">
        {redemption.imageUrl && (
          <div className="redemption-image">
            <img src={redemption.imageUrl} alt={redemption.item} />
          </div>
        )}
        
        <div className="redemption-details">
          <div className="redemption-user">{redemption.username}</div>
          <div className="redemption-item">⚡ {redemption.item} ⚡</div>
          <div className="redemption-cost">{redemption.cost} points</div>
        </div>
      </div>
    </div>
  );
};

export default RedemptionNotification;
