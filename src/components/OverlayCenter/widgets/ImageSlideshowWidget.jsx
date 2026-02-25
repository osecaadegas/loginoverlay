import React, { useEffect, useState, useRef } from 'react';

export default function ImageSlideshowWidget({ config, theme }) {
  const c = config || {};
  const images = (c.images || []).filter(url => url && url.trim());
  const interval = (c.interval || 5) * 1000;
  const fadeDuration = (c.fadeDuration || 1) * 1000;
  const width = c.width || 400;
  const height = c.height || 225;
  const borderRadius = c.borderRadius || 12;
  const borderColor = c.borderColor || 'rgba(51,65,85,0.5)';
  const borderWidth = c.borderWidth || 1;
  const objectFit = c.objectFit || 'cover';
  const showGradient = c.showGradient !== false;
  const gradientColor = c.gradientColor || 'rgba(15,23,42,0.8)';
  const showCaption = c.showCaption && c.caption;
  const captionColor = c.captionColor || '#e2e8f0';
  const captionSize = c.captionSize || 14;
  const captionFont = c.captionFont || "'Inter', sans-serif";
  const pauseOnHover = c.pauseOnHover || false;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const paused = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (images.length < 2) return;

    function tick() {
      if (paused.current) {
        timerRef.current = setTimeout(tick, 500);
        return;
      }
      setTransitioning(true);
      setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % images.length);
        setNextIdx(prev => (prev + 1) % images.length);
        setTransitioning(false);
      }, fadeDuration);
      timerRef.current = setTimeout(tick, interval);
    }

    timerRef.current = setTimeout(tick, interval);
    return () => clearTimeout(timerRef.current);
  }, [images.length, interval, fadeDuration]);

  if (images.length === 0) {
    return (
      <div className="ov-slideshow-empty" style={{
        width: `${width}px`, height: `${height}px`,
        borderRadius: `${borderRadius}px`,
        border: `${borderWidth}px solid ${borderColor}`,
      }}>
        <span>🖼️</span>
        <span>No images — add URLs in the config panel</span>
      </div>
    );
  }

  const containerStyle = {
    width: `${width}px`,
    height: `${height}px`,
    borderRadius: `${borderRadius}px`,
    border: `${borderWidth}px solid ${borderColor}`,
    position: 'relative',
    overflow: 'hidden',
  };

  const imgStyle = (isVisible) => ({
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit,
    transition: `opacity ${fadeDuration}ms ease`,
    opacity: isVisible ? 1 : 0,
  });

  return (
    <div
      className="ov-slideshow-widget"
      style={containerStyle}
      onMouseEnter={() => { if (pauseOnHover) paused.current = true; }}
      onMouseLeave={() => { if (pauseOnHover) paused.current = false; }}
    >
      <img
        src={images[currentIdx % images.length]}
        alt="Slideshow"
        style={imgStyle(!transitioning)}
        onError={e => { e.target.style.display = 'none'; }}
      />
      {images.length > 1 && (
        <img
          src={images[nextIdx % images.length]}
          alt="Slideshow"
          style={imgStyle(transitioning)}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}

      {showGradient && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${gradientColor}, transparent 60%)`,
          pointerEvents: 'none',
        }} />
      )}

      {showCaption && (
        <div className="ov-slideshow-caption" style={{
          fontFamily: captionFont,
          fontSize: `${captionSize}px`,
          color: captionColor,
        }}>
          {c.caption}
        </div>
      )}

      {images.length > 1 && c.showDots && (
        <div className="ov-slideshow-dots">
          {images.map((_, i) => (
            <span key={i} className={`ov-slideshow-dot ${i === (transitioning ? nextIdx : currentIdx) % images.length ? 'ov-slideshow-dot--active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}
