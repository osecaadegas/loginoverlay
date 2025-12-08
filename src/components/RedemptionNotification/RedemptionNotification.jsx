import React, { useState, useEffect } from 'react';
import './RedemptionNotification.css';

const RedemptionNotification = ({ redemption, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 100);

    // Auto-hide after 8 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 500); // Wait for exit animation
    }, 8000);

    return () => clearTimeout(hideTimer);
  }, [onClose]);

  if (!redemption) return null;

  return (
    <div className={`redemption-notification ${isVisible ? 'visible' : ''}`}>
      <div className="redemption-icon">🎁</div>
      <div className="redemption-content">
        <div className="redemption-title">New Redemption!</div>
        <div className="redemption-user">{redemption.username}</div>
        <div className="redemption-item">{redemption.item}</div>
        <div className="redemption-cost">{redemption.cost} points</div>
      </div>
      <button className="redemption-close" onClick={() => {
        setIsVisible(false);
        setTimeout(onClose, 500);
      }}>×</button>
    </div>
  );
};

export default RedemptionNotification;
