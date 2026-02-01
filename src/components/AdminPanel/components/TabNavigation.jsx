import { useRef, useEffect } from 'react';
import './TabNavigation.css';

/**
 * Modern Tab Navigation Component
 * Features:
 * - Horizontal scrolling on small screens
 * - Keyboard navigation (Arrow keys, Home, End)
 * - Deep linking support via URL
 * - ARIA compliant accessibility
 */
export default function TabNavigation({ 
  tabs, 
  activeTab, 
  onTabChange,
  ariaLabel = "Admin navigation"
}) {
  const tabsRef = useRef(null);
  const tabRefs = useRef({});

  // Keyboard navigation
  const handleKeyDown = (e, index) => {
    const tabCount = tabs.length;
    let newIndex = index;

    switch (e.key) {
      case 'ArrowRight':
        newIndex = (index + 1) % tabCount;
        break;
      case 'ArrowLeft':
        newIndex = (index - 1 + tabCount) % tabCount;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = tabCount - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    const newTab = tabs[newIndex];
    onTabChange(newTab.id);
    tabRefs.current[newTab.id]?.focus();
  };

  // Scroll active tab into view
  useEffect(() => {
    const activeTabEl = tabRefs.current[activeTab];
    if (activeTabEl && tabsRef.current) {
      activeTabEl.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'center' 
      });
    }
  }, [activeTab]);

  return (
    <div 
      className="admin-tabs-v2"
      role="tablist"
      aria-label={ariaLabel}
      ref={tabsRef}
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(el) => tabRefs.current[tab.id] = el}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          id={`tab-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          className={`admin-tab-v2 ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
        >
          <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
          {tab.badge !== undefined && (
            <span className="tab-badge">{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}
