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
function ImageSlideshowWidget({ config, theme }) {
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
  const displayStyle = c.displayStyle || 'v1';
  const isMetal = displayStyle === 'metal';
  const isClean = displayStyle === 'clean';
  const isV12  = displayStyle === 'v12';

  /* ── Video detection ── */
  const VIDEO_EXTS = /\.(mp4|webm|ogg|mov|m4v|avi|mkv)(\?|$)/i;

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

  /* ─── Empty state (inline, still rendered) ─── */
  if (images.length === 0) {
    return (
      <div className="ov-slideshow-empty" style={{
        width: '100%', height: '100%',
        borderRadius: `${borderRadius}px`,
        border: `${borderWidth}px solid ${borderColor}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15,23,42,0.85)', color: '#94a3b8', gap: '6px', fontSize: '13px',
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
    borderRadius: isClean ? 0 : isV12 ? 12 : `${borderRadius}px`,
    border: isClean ? 'none' : isV12 ? 'none' : (isMetal ? '1px solid rgba(200,210,225,0.18)' : `${borderWidth}px solid ${borderColor}`),
    position: 'relative',
    overflow: 'hidden',
    background: isClean ? 'transparent' : isV12 ? 'linear-gradient(160deg, rgba(38,40,46,0.97), rgba(52,54,62,0.95))' : '#000',
    ...(isMetal && {
      boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
    }),
    ...(isV12 && {
      outline: '1.5px solid rgba(100,100,110,0.5)',
      outlineOffset: '-1.5px',
      boxShadow: '0 6px 20px rgba(0,0,0,0.5), 0 0 6px 1px rgba(150,150,160,0.04)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
    }),
  };

  /* ── Safe index ── */
  const safe = (i) => ((i % images.length) + images.length) % images.length;

  /* ── Shared image base ── */
  const mediaFit = c.mediaFit || 'cover'; // cover | contain | fill
  const baseImg = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: mediaFit,
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

  /* ── Render media element (image or video) ── */
  const renderMedia = (src, style, key) => {
    if (VIDEO_EXTS.test(src)) {
      return (
        <video
          key={key}
          src={src}
          style={style}
          autoPlay
          loop
          muted
          playsInline
          onError={e => { e.target.style.display = 'none'; }}
        />
      );
    }
    return (
      <img
        key={key}
        src={src}
        alt="Slideshow"
        style={style}
        onError={e => { e.target.style.display = 'none'; }}
      />
    );
  };

  return (
    <div
      className="ov-slideshow-widget"
      style={containerStyle}
      onMouseEnter={() => { if (pauseOnHover) paused.current = true; }}
      onMouseLeave={() => { if (pauseOnHover) paused.current = false; }}
    >
      {/* Bottom layer — "current" media */}
      {renderMedia(images[safe(currentIdx)], currentLayerStyle, `cur-${safe(currentIdx)}`)}
      {/* Top layer — "next" media */}
      {images.length > 1 && renderMedia(images[safe(nextIdx)], nextLayerStyle, `nxt-${safe(nextIdx)}`)}

      {!isClean && showGradient && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          background: isV12
            ? 'linear-gradient(to top, rgba(38,40,46,0.92), transparent 50%)'
            : isMetal
            ? 'linear-gradient(to top, rgba(26,28,32,0.85), transparent 50%), linear-gradient(145deg, rgba(42,45,51,0.3), transparent 60%)'
            : `linear-gradient(to top, ${gradientColor}, transparent 60%)`,
          pointerEvents: 'none',
        }} />
      )}

      {!isClean && (isMetal || isV12) && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          background: 'linear-gradient(145deg, rgba(200,210,225,0.04), transparent 50%)',
          pointerEvents: 'none',
        }} />
      )}

      {!isClean && showCaption && (
        <div className="ov-slideshow-caption" style={{
          fontFamily: isV12 ? "'Inter', sans-serif" : captionFont,
          fontSize: isV12 ? `${Math.max(captionSize, 13)}px` : `${captionSize}px`,
          color: isV12 ? '#fff' : isMetal ? '#d4d8e0' : captionColor,
          zIndex: 4,
          ...((isMetal || isV12) && {
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            letterSpacing: '0.08em',
          }),
          ...(isV12 && {
            fontWeight: 700,
            letterSpacing: '1px',
          }),
        }}>
          {c.caption}
        </div>
      )}

      {!isClean && images.length > 1 && c.showDots && (
        <div className="ov-slideshow-dots" style={{ zIndex: 5 }}>
          {images.map((_, i) => {
            const active = i === safe(transitioning ? nextIdx : currentIdx);
            return (
              <span key={i}
                className={`ov-slideshow-dot ${active ? 'ov-slideshow-dot--active' : ''}`}
                style={isV12 ? {
                  background: active ? '#fff' : 'rgba(255,255,255,0.25)',
                  width: active ? 8 : 6, height: active ? 8 : 6,
                  transition: 'all 0.3s ease',
                  boxShadow: active ? '0 0 6px rgba(255,255,255,0.3)' : 'none',
                } : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default React.memo(ImageSlideshowWidget);
