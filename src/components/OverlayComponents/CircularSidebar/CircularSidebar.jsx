import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './CircularSidebar.css';

const CircularSidebar = ({ onMenuSelect, isLocked, onLockToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef(null);
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    // Supabase will automatically redirect to login page through AuthContext
  };

  const toggleMenu = () => {
    if (!isLocked) {
      setIsOpen(!isOpen);
    }
  };

  const handleLockToggle = () => {
    const newLockedState = !isLocked;
    if (onLockToggle) {
      onLockToggle();
    }
    // When locking, open the menu. When unlocking, keep it open
    setIsOpen(true);
  };

  const handleMenuClick = (menuItem) => {
    onMenuSelect(menuItem);
    if (!isLocked) {
      setIsOpen(false);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isLocked) return; // Don't close if locked
      
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isLocked]);

  const menuItems = [
    { id: 'customization', icon: '/palet.png', label: 'Customization', angle: 0 },
    { id: 'bonusHunt', icon: '/crossair.png', label: 'Bonus Hunt', angle: 30 },
    { id: 'tutorial', icon: '/info.png', label: 'Tutorial', angle: 60 },
    { id: 'randomSlot', icon: '/randomslot.png', label: 'Random Slot', angle: 90 },
    { id: 'slotMachine', icon: '/777.png', label: 'Slot Machine', angle: 120 },
    { id: 'coinFlip', icon: '/coinflip.png', label: 'Coin Flip', angle: 150 },
    { id: 'tournament', icon: '/tornament.png', label: 'Tournament', angle: 180 },
    { id: 'giveaway', icon: '/giveaway.png', label: 'Giveaway', angle: 210 },
    { id: 'artAd', icon: '/art.png', label: 'Art/Ad', angle: 240 },
    { id: 'lock', icon: isLocked ? '/lock.png' : '/unlock.png', label: 'Lock', angle: 270, special: true }
  ];

  return (
    <div ref={sidebarRef} className={`circular-sidebar ${isOpen || isLocked ? 'open' : ''} ${isLocked ? 'locked' : ''}`}>
      <div className="sidebar-main-button" onClick={toggleMenu} style={{
        cursor: isLocked ? 'not-allowed' : 'pointer',
        opacity: isLocked ? 0.7 : 1
      }}>
        <div className="main-button-icon">{isLocked ? '🔒' : '☰'}</div>
      </div>
      
      <div className="sidebar-fan">
        {menuItems.map((item, index) => {
          const radius = 95; // Distance from center - reduced for tighter spacing
          const angleRad = (item.angle - 90) * (Math.PI / 180); // -90 to start from top
          const x = Math.cos(angleRad) * radius;
          const y = Math.sin(angleRad) * radius;
          
          return (
            <button
              key={item.id}
              className={`sidebar-fan-button ${item.special ? 'special' : ''} ${item.special && isLocked ? 'active' : ''}`}
              style={{
                '--x': `${x}px`,
                '--y': `${y}px`,
                transform: (isOpen || isLocked)
                  ? `translate(${x}px, ${y}px) scale(1)` 
                  : 'translate(0, 0) scale(0)',
                transitionDelay: (isOpen || isLocked) ? `${index * 0.05}s` : '0s',
                opacity: (isOpen || isLocked) ? 1 : 0,
                pointerEvents: (isOpen || isLocked) ? 'all' : 'none',
                backgroundColor: item.special && isLocked && item.id === 'lock' ? '#00e1ff' : undefined
              }}
              onClick={() => {
                if (item.action === 'logout') {
                  handleLogout();
                } else if (item.id === 'lock') {
                  handleLockToggle();
                } else {
                  handleMenuClick(item.id);
                }
              }}
              title={item.label}
            >
              <img src={item.icon} alt={item.label} className="sidebar-icon-img" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CircularSidebar;
