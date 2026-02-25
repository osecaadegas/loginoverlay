import React, { useEffect, useState, useRef } from 'react';

/**
 * ImageSlideshowWidget — double-buffered crossfade.
 *
 * Two image layers alternate roles:
 *   • The VISIBLE layer shows the current image at full opacity / position.
 *   • The HIDDEN layer pre-loads the next image off-screen / at opacity 0.
 *   • On each cycle we flip which layer is visible (CSS transition).
 *   • After the transition finishes we swap src's on the now-hidden layer
 *     with `transition: none` so there is never a visual glitch.
 */
export default function ImageSlideshowWidget({ config, theme }) {
  const c = config || {};
  const images = (c.images || []).filter(url => url && url.trim());
  const interval = (c.interval || 5) * 1000;
  const fadeDuration = (c.fadeDuration || 1) * 1000;
  const borderRadius = c.borderRadius ?? 12;
  const borderColor = c.borderColor || 'rgba(51,65,85,0.5)';
  const borderWidth = c.borderWidth ?? 1;
  const showGradient = c.showGradient !== false;
  const gradientColor = c.gradientColor || 'rgba(15,23,42,0.8)';
  const showCaption = c.showCaption && c.caption;
  const captionColor = c.captionColor || '#e2e8f0';
  const captionSize = c.captionSize || 14;
  const captionFont = c.captionFont || "'Inter', sans-serif";
  const pauseOnHover = c.pauseOnHover || false;
  const animType = c.animationType || 'fade'; // fade | slide | zoom

  /* ── Double-buffer state ── */
  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(images.length > 1 ? 1 : 0);
  const [transitioning, setTransitioning] = useState(false);
  const [instant, setInstant] = useState(false); // disables CSS transition during layer swap
  const paused = useRef(false);
  const timerRef = useRef(null);
  const swapTimerRef = useRef(null);

  /* Stable key — reset everything when the image list itself changes */
  const imageKey = images.join('|');

  useEffect(() => {
    clearTimeout(timerRef.current);
    clearTimeout(swapTimerRef.current);
    setCurrentIdx(0);
    setNextIdx(images.length > 1 ? 1 : 0);
    setTransitioning(false);
    setInstant(false);

    if (images.length < 2) return;

    function cycle() {
      if (paused.current) {
        timerRef.current = setTimeout(cycle, 500);
        return;
      }

      /* 1.  Start the CSS transition (current fades out, next fades in) */
      setTransitioning(true);

      /* 2.  After the CSS transition finishes, do an INSTANT layer swap:
       *     - Disable CSS transition (`instant = true`)
       *     - Move currentIdx forward (the "current" layer now holds the same
       *       image the "next" layer just showed → no visible change)
       *     - Move nextIdx forward (the "next" layer loads the upcoming image,
       *       but it's hidden so there is no flash)
       *     - Flip transitioning back to false
       *     - Re-enable CSS transitions on the next animation frame            */
      swapTimerRef.current = setTimeout(() => {
        setInstant(true);
        setCurrentIdx(prev => (prev + 1) % images.length);
        setNextIdx(prev => (prev + 1) % images.length);
        setTransitioning(false);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setInstant(false);
          });
        });
      }, fadeDuration + 60);

      /* 3.  Schedule the next cycle (display-time + transition-time) */
      timerRef.current = setTimeout(cycle, interval + fadeDuration + 80);
    }

    timerRef.current = setTimeout(cycle, interval);
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(swapTimerRef.current);
    };
  }, [imageKey, interval, fadeDuration]);

  /* ─── Empty state ─── */
  if (images.length === 0) {
    return (
      <div className="ov-slideshow-empty" style={{
        width: '100%', height: '100%',
        borderRadius: `${borderRadius}px`,
        border: `${borderWidth}px solid ${borderColor}`,
      }}>
        <span>🖼️</span>
        <span>No images — add URLs in the config panel</span>
      </div>
    );
  }

  /* ─── Container ─── */
  const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: `${borderRadius}px`,
    border: `${borderWidth}px solid ${borderColor}`,
    position: 'relative',
    overflow: 'hidden',
    background: '#000',
  };

  /* ── Safe index ── */
  const safe = (i) => ((i % images.length) + images.length) % images.length;

  /* ── Shared image base ── */
  const baseImg = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
  };

  /* ── "current" layer (bottom, z-index 1) ── */
  const currentLayerStyle = (() => {
    const visible = !transitioning;
    const noTx = instant ? 'none' : undefined;

    if (animType === 'slide') {
      return {
        ...baseImg, zIndex: 1,
        transition: noTx || `transform ${fadeDuration}ms ease`,
        transform: visible ? 'translateX(0)' : 'translateX(-100%)',
      };
    }
    if (animType === 'zoom') {
      return {
        ...baseImg, zIndex: 1,
        transition: noTx || `opacity ${fadeDuration}ms ease, transform ${fadeDuration}ms ease`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(1.15)',
      };
    }
    return {
      ...baseImg, zIndex: 1,
      transition: noTx || `opacity ${fadeDuration}ms ease`,
      opacity: visible ? 1 : 0,
    };
  })();

  /* ── "next" layer (top, z-index 2) ── */
  const nextLayerStyle = (() => {
    const visible = transitioning;
    const noTx = instant ? 'none' : undefined;

    if (animType === 'slide') {
      return {
        ...baseImg, zIndex: 2,
        transition: noTx || `transform ${fadeDuration}ms ease`,
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
      };
    }
    if (animType === 'zoom') {
      return {
        ...baseImg, zIndex: 2,
        transition: noTx || `opacity ${fadeDuration}ms ease, transform ${fadeDuration}ms ease`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(1.15)',
      };
    }
    return {
      ...baseImg, zIndex: 2,
      transition: noTx || `opacity ${fadeDuration}ms ease`,
      opacity: visible ? 1 : 0,
    };
  })();

  return (
    <div
      className="ov-slideshow-widget"
      style={containerStyle}
      onMouseEnter={() => { if (pauseOnHover) paused.current = true; }}
      onMouseLeave={() => { if (pauseOnHover) paused.current = false; }}
    >
      {/* Bottom layer — "current" image */}
      <img
        src={images[safe(currentIdx)]}
        alt="Slideshow"
        style={currentLayerStyle}
        onError={e => { e.target.style.display = 'none'; }}
      />
      {/* Top layer — "next" image */}
      {images.length > 1 && (
        <img
          src={images[safe(nextIdx)]}
          alt="Slideshow"
          style={nextLayerStyle}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}

      {showGradient && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          background: `linear-gradient(to top, ${gradientColor}, transparent 60%)`,
          pointerEvents: 'none',
        }} />
      )}

      {showCaption && (
        <div className="ov-slideshow-caption" style={{
          fontFamily: captionFont,
          fontSize: `${captionSize}px`,
          color: captionColor,
          zIndex: 4,
        }}>
          {c.caption}
        </div>
      )}

      {images.length > 1 && c.showDots && (
        <div className="ov-slideshow-dots" style={{ zIndex: 5 }}>
          {images.map((_, i) => (
            <span key={i} className={`ov-slideshow-dot ${i === safe(transitioning ? nextIdx : currentIdx) ? 'ov-slideshow-dot--active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}
