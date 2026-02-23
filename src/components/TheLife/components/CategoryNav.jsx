import { useRef, useState, useEffect, useCallback } from 'react';
import './CategoryNav.css';

/**
 * CATEGORY_TABS - Single source of truth for all game categories.
 * To add a new category, just push an object here. The nav scales infinitely.
 * 
 * `restricted` tabs are disabled when player is in jail/hospital.
 */
const CATEGORY_TABS = [
  { key: 'crimes',     label: 'Crimes',     img: '/thelife/categories/crimes.png' },
  { key: 'businesses', label: 'Businesses', img: '/thelife/categories/businesses.png' },
  { key: 'brothel',    label: 'Brothel',    img: '/thelife/categories/brothel.png',    restricted: true },
  { key: 'pvp',        label: 'PvP',        img: '/thelife/categories/pvp.png',        restricted: true },
  { key: 'highstakes', label: 'High Stakes', img: '/thelife/categories/high-stakes.png', restricted: true },
  { key: 'docks',      label: 'Docks',      img: '/thelife/categories/Docks.png',      restricted: true },
  { key: 'market',     label: 'Black Market', img: '/thelife/categories/BlackMarket.png', restricted: true },
  { key: 'skills',     label: 'Skills',     img: '/thelife/categories/skills.png' },
  { key: 'inventory',  label: 'Stash',      img: '/thelife/categories/Inventory.png' },
  { key: 'jail',       label: 'Jail',       img: '/thelife/categories/Jail.png' },
  { key: 'hospital',   label: 'Hospital',   img: '/thelife/categories/Hospital.png' },
];

/**
 * CategoryNav — Premium horizontal scrollable category navigation.
 *
 * Features:
 * - Mouse wheel → horizontal scroll (desktop)
 * - Click-and-drag scroll
 * - Touch swipe (mobile)
 * - Scroll-snap to center
 * - Gradient fade edges indicating overflow
 * - Animated underline slider tracking active tab
 * - Active tab glow + scale
 * - Micro sound hook (onCategorySound callback)
 * - Scales to unlimited categories
 *
 * @param {string}   activeTab       - Currently active tab key
 * @param {function} setActiveTab    - Setter for active tab
 * @param {boolean}  isRestricted    - Whether player is in jail/hospital
 * @param {function} onCategorySound - Optional sound hook called on tab switch
 */
export default function CategoryNav({ activeTab, setActiveTab, isRestricted, onCategorySound }) {
  const trackRef = useRef(null);
  const [sliderStyle, setSliderStyle] = useState({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // --- Drag state ---
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0, hasMoved: false });

  // ==========================================
  // 1. UNDERLINE SLIDER — tracks active tab
  // ==========================================
  const updateSlider = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const activeEl = track.querySelector('.cn-tab.active');
    if (!activeEl) return;

    const trackRect = track.getBoundingClientRect();
    const tabRect = activeEl.getBoundingClientRect();

    setSliderStyle({
      width: tabRect.width,
      transform: `translateX(${tabRect.left - trackRect.left + track.scrollLeft}px)`,
    });
  }, []);

  // Recalculate slider when active tab or scroll position changes
  useEffect(() => {
    updateSlider();
  }, [activeTab, updateSlider]);

  // ==========================================
  // 2. SCROLL OVERFLOW DETECTION — fade edges
  // ==========================================
  const updateOverflow = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const tolerance = 2; // px rounding tolerance
    setCanScrollLeft(el.scrollLeft > tolerance);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - tolerance);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    updateOverflow();
    el.addEventListener('scroll', updateOverflow, { passive: true });
    const ro = new ResizeObserver(updateOverflow);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', updateOverflow);
      ro.disconnect();
    };
  }, [updateOverflow]);

  // Also update slider on scroll (it's position-relative to scrollLeft)
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => updateSlider();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [updateSlider]);

  // ==========================================
  // 3. MOUSE WHEEL → HORIZONTAL SCROLL
  // ==========================================
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const onWheel = (e) => {
      // Only hijack vertical scroll when cursor is over the nav
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY * 1.5, behavior: 'smooth' });
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ==========================================
  // 4. CLICK-AND-DRAG SCROLL (mouse only — touch uses native scroll)
  //    Uses document-level listeners so clicks on tabs aren't blocked.
  // ==========================================
  const onMouseDown = (e) => {
    // Only left mouse button
    if (e.button !== 0) return;
    const el = trackRef.current;
    if (!el) return;
    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      hasMoved: false,
    };
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

  // ==========================================
  // 5. TAB CLICK HANDLER
  // ==========================================
  const handleTabClick = (tab) => {
    const ds = dragState.current;
    // If the pointer moved (drag), don't register click
    if (ds.hasMoved) {
      ds.hasMoved = false;
      return;
    }
    if (tab.restricted && isRestricted) return;

    // Micro sound hook — fire before state change
    if (onCategorySound) onCategorySound(tab.key);

    setActiveTab(tab.key);

    // Scroll active tab into center view
    requestAnimationFrame(() => {
      const el = trackRef.current;
      const activeEl = el?.querySelector(`[data-tab="${tab.key}"]`);
      if (activeEl && el) {
        const offset = activeEl.offsetLeft - el.clientWidth / 2 + activeEl.clientWidth / 2;
        el.scrollTo({ left: offset, behavior: 'smooth' });
      }
    });
  };

  // ==========================================
  // 6. SCROLL VIA ARROW BUTTONS
  // ==========================================
  const scrollBy = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.55; // scroll ~55% of visible width
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  return (
    <div className={`cn-wrapper ${canScrollLeft ? 'cn-fade-left' : ''} ${canScrollRight ? 'cn-fade-right' : ''}`}>
      {/* Left arrow — only visible when scrollable */}
      <button
        className="cn-arrow cn-arrow-left"
        onClick={() => scrollBy(-1)}
        aria-label="Scroll categories left"
        style={{ opacity: canScrollLeft ? 1 : 0, pointerEvents: canScrollLeft ? 'auto' : 'none' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>

      {/* Scrollable track */}
      <div
        className="cn-track"
        ref={trackRef}
        onMouseDown={onMouseDown}
      >
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const disabled = tab.restricted && isRestricted;

          return (
            <button
              key={tab.key}
              data-tab={tab.key}
              className={`cn-tab ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => handleTabClick(tab)}
              aria-label={tab.label}
              tabIndex={disabled ? -1 : 0}
            >
              <div className="cn-tab-img">
                <img src={tab.img} alt={tab.label} draggable="false" />
              </div>
              <span className="cn-tab-label">{tab.label}</span>
            </button>
          );
        })}

        {/* Animated underline slider */}
        <div className="cn-slider" style={sliderStyle} />
      </div>

      {/* Right arrow */}
      <button
        className="cn-arrow cn-arrow-right"
        onClick={() => scrollBy(1)}
        aria-label="Scroll categories right"
        style={{ opacity: canScrollRight ? 1 : 0, pointerEvents: canScrollRight ? 'auto' : 'none' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  );
}

export { CATEGORY_TABS };
