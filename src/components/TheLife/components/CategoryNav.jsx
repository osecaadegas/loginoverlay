import { useRef, useState, useEffect, useCallback } from 'react';
import './CategoryNav.css';

/**
 * CATEGORY_TABS — single source of truth.
 * Add new categories by pushing objects here.
 */
const CATEGORY_TABS = [
  { key: 'crimes',     label: 'Crimes',       icon: '🔫', img: '/thelife/categories/crimes.png' },
  { key: 'businesses', label: 'Business',      icon: '🏢', img: '/thelife/categories/businesses.png' },
  { key: 'brothel',    label: 'Brothel',       icon: '💋', img: '/thelife/categories/brothel.png', restricted: true },
  { key: 'pvp',        label: 'PvP',           icon: '⚔️', img: '/thelife/categories/pvp.png', restricted: true },
  { key: 'highstakes', label: 'High Stakes',   icon: '🎰', img: '/thelife/categories/high-stakes.png', restricted: true },
  { key: 'docks',      label: 'Docks',         icon: '🚢', img: '/thelife/categories/Docks.png', restricted: true },
  { key: 'market',     label: 'Black Market',  icon: '💀', img: '/thelife/categories/BlackMarket.png', restricted: true },
  { key: 'skills',     label: 'Skills',        icon: '📈', img: '/thelife/categories/skills.png' },
  { key: 'inventory',  label: 'Stash',         icon: '🎒', img: '/thelife/categories/Inventory.png' },
  { key: 'jail',       label: 'Jail',          icon: '🔒', img: '/thelife/categories/Jail.png' },
  { key: 'hospital',   label: 'Hospital',      icon: '🏥', img: '/thelife/categories/Hospital.png' },
];

/**
 * CategoryNav — Clean pill-style horizontal scrollable tabs.
 */
export default function CategoryNav({ activeTab, setActiveTab, isRestricted, onCategorySound }) {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0, hasMoved: false });

  const updateOverflow = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateOverflow();
    el.addEventListener('scroll', updateOverflow, { passive: true });
    const ro = new ResizeObserver(updateOverflow);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateOverflow); ro.disconnect(); };
  }, [updateOverflow]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY * 1.5, behavior: 'smooth' });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    const el = trackRef.current;
    if (!el) return;
    dragState.current = { isDragging: true, startX: e.clientX, scrollLeft: el.scrollLeft, hasMoved: false };
    el.style.cursor = 'grabbing';
    document.addEventListener('mousemove', onDocMouseMove);
    document.addEventListener('mouseup', onDocMouseUp);
  };

  const onDocMouseMove = useCallback((e) => {
    const ds = dragState.current;
    if (!ds.isDragging) return;
    const dx = e.clientX - ds.startX;
    if (Math.abs(dx) > 4) ds.hasMoved = true;
    if (trackRef.current) trackRef.current.scrollLeft = ds.scrollLeft - dx;
  }, []);

  const onDocMouseUp = useCallback(() => {
    dragState.current.isDragging = false;
    if (trackRef.current) trackRef.current.style.cursor = '';
    document.removeEventListener('mousemove', onDocMouseMove);
    document.removeEventListener('mouseup', onDocMouseUp);
  }, [onDocMouseMove]);

  const handleTabClick = (tab) => {
    if (dragState.current.hasMoved) { dragState.current.hasMoved = false; return; }
    if (tab.restricted && isRestricted) return;
    if (onCategorySound) onCategorySound(tab.key);
    setActiveTab(tab.key);
    requestAnimationFrame(() => {
      const el = trackRef.current;
      const tabEl = el?.querySelector(`[data-tab="${tab.key}"]`);
      if (tabEl && el) {
        const offset = tabEl.offsetLeft - el.clientWidth / 2 + tabEl.clientWidth / 2;
        el.scrollTo({ left: offset, behavior: 'smooth' });
      }
    });
  };

  const scrollBy = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: 'smooth' });
  };

  return (
    <nav className={`cn-wrap ${canScrollLeft ? 'cn-fade-l' : ''} ${canScrollRight ? 'cn-fade-r' : ''}`}>
      <button className="cn-arr cn-arr--l" onClick={() => scrollBy(-1)} aria-label="Scroll left"
        style={{ opacity: canScrollLeft ? 1 : 0, pointerEvents: canScrollLeft ? 'auto' : 'none' }}>‹</button>

      <div className="cn-track" ref={trackRef} onMouseDown={onMouseDown}>
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            data-tab={tab.key}
            className={`cn-pill ${activeTab === tab.key ? 'cn-pill--active' : ''} ${tab.restricted && isRestricted ? 'cn-pill--disabled' : ''}`}
            onClick={() => handleTabClick(tab)}
            tabIndex={tab.restricted && isRestricted ? -1 : 0}
          >
            <img className="cn-pill__img" src={tab.img} alt={tab.label} draggable={false} />
            <span className="cn-pill__label">{tab.label}</span>
          </button>
        ))}
      </div>

      <button className="cn-arr cn-arr--r" onClick={() => scrollBy(1)} aria-label="Scroll right"
        style={{ opacity: canScrollRight ? 1 : 0, pointerEvents: canScrollRight ? 'auto' : 'none' }}>›</button>
    </nav>
  );
}

export { CATEGORY_TABS };
