import { memo, useRef, useState, useCallback, useEffect } from 'react';
import GameCard, { GameCardSkeleton } from './GameCard';
import './CarouselSection.css';

/**
 * CarouselSection — Horizontal snap-scroll carousel with:
 * - Mouse drag support
 * - Touch support (native)
 * - Arrow navigation (desktop)
 * - Skeleton loading
 * - Optional autoplay
 * - Lazy rendering via IntersectionObserver
 */
const CarouselSection = memo(function CarouselSection({
  title,
  subtitle,
  slots = [],
  loading = false,
  onSlotClick,
  cardSize = 'default',
  showStats = true,
  autoplay = false,
  autoplayInterval = 5000,
  icon,
  headerAction,
  className = '',
}) {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, scrollLeft: 0, moved: false });

  // ---- Scroll state check ----
  const checkScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
  }, [checkScroll, slots]);

  // ---- Arrow navigation ----
  const scroll = useCallback((direction) => {
    const el = trackRef.current;
    if (!el) return;
    const cardW = el.querySelector('.gc-card')?.offsetWidth || 200;
    const scrollAmount = cardW * 3 + 36; // 3 cards + gap
    el.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
  }, []);

  // ---- Mouse drag ----
  const onPointerDown = useCallback((e) => {
    if (e.pointerType === 'touch') return; // let native touch handle it
    const el = trackRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, scrollLeft: el.scrollLeft, moved: false };
    setIsDragging(true);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!isDragging || e.pointerType === 'touch') return;
    const el = trackRef.current;
    if (!el) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 3) dragState.current.moved = true;
    el.scrollLeft = dragState.current.scrollLeft - dx;
  }, [isDragging]);

  const onPointerUp = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    setIsDragging(false);
    // Prevent click if we dragged
    if (dragState.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  // ---- Autoplay ----
  useEffect(() => {
    if (!autoplay || loading || slots.length === 0) return;
    const interval = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 4) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scroll(1);
      }
    }, autoplayInterval);
    return () => clearInterval(interval);
  }, [autoplay, autoplayInterval, loading, slots.length, scroll]);

  // ---- Render ----
  const skeletonCount = cardSize === 'compact' ? 8 : cardSize === 'large' ? 4 : 6;

  return (
    <section className={`cs-section ${className}`}>
      {/* Header */}
      <div className="cs-header">
        <div className="cs-header-left">
          {icon && <span className="cs-icon">{icon}</span>}
          <div>
            <h2 className="cs-title">{title}</h2>
            {subtitle && <p className="cs-subtitle">{subtitle}</p>}
          </div>
        </div>
        <div className="cs-header-right">
          {headerAction}
          <div className="cs-arrows">
            <button
              className={`cs-arrow ${!canScrollLeft ? 'cs-arrow--disabled' : ''}`}
              onClick={() => scroll(-1)}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              className={`cs-arrow ${!canScrollRight ? 'cs-arrow--disabled' : ''}`}
              onClick={() => scroll(1)}
              disabled={!canScrollRight}
              aria-label="Scroll right"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className={`cs-track ${isDragging ? 'cs-track--dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setIsDragging(false)}
      >
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <GameCardSkeleton key={i} size={cardSize} />
            ))
          : slots.map((slot) => (
              <GameCard
                key={slot.id}
                slot={slot}
                size={cardSize}
                showStats={showStats}
                onClick={onSlotClick}
              />
            ))
        }
      </div>

      {/* Scroll fade indicators */}
      {canScrollLeft && <div className="cs-fade cs-fade--left" />}
      {canScrollRight && <div className="cs-fade cs-fade--right" />}
    </section>
  );
});

export default CarouselSection;
