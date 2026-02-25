import React, { useMemo } from 'react';

/* ─── Texture CSS generators ─── */
const TEXTURES = {
  none: () => ({}),

  gradient: (c) => ({
    background: `linear-gradient(${c.gradientAngle ?? 135}deg, ${c.color1 || '#0f172a'}, ${c.color2 || '#1e293b'}, ${c.color3 || '#0f172a'})`,
  }),

  metallic: (c) => ({
    background: `linear-gradient(${c.gradientAngle ?? 135}deg, ${c.color1 || '#1a1a2e'}, ${c.color2 || '#3a3a5c'}, ${c.color1 || '#1a1a2e'}, ${c.color2 || '#3a3a5c'}, ${c.color1 || '#1a1a2e'})`,
    backgroundSize: '400% 400%',
  }),

  pearl: (c) => ({
    background: `linear-gradient(${c.gradientAngle ?? 135}deg, ${c.color1 || '#e8dff5'}, ${c.color2 || '#f0e6ff'}, ${c.color3 || '#dde4ff'}, ${c.color2 || '#f0e6ff'}, ${c.color1 || '#e8dff5'})`,
    backgroundSize: '300% 300%',
  }),

  gloss: (c) => ({
    background: `linear-gradient(${c.gradientAngle ?? 180}deg, ${c.color1 || '#0f172a'} 0%, ${c.color2 || '#1e3a5f'} 40%, rgba(255,255,255,0.08) 50%, ${c.color2 || '#1e3a5f'} 60%, ${c.color1 || '#0f172a'} 100%)`,
  }),

  chameleon: (c) => ({
    background: `linear-gradient(${c.gradientAngle ?? 135}deg, ${c.color1 || '#6366f1'}, ${c.color2 || '#06b6d4'}, ${c.color3 || '#a855f7'}, ${c.color1 || '#6366f1'})`,
    backgroundSize: '600% 600%',
    animation: `bg-chameleon-shift ${c.animSpeed || 8}s ease infinite`,
  }),

  radial: (c) => ({
    background: `radial-gradient(ellipse at center, ${c.color2 || '#1e3a5f'}, ${c.color1 || '#0f172a'})`,
  }),

  conic: (c) => ({
    background: `conic-gradient(from ${c.gradientAngle ?? 0}deg, ${c.color1 || '#0f172a'}, ${c.color2 || '#1e3a5f'}, ${c.color3 || '#6366f1'}, ${c.color1 || '#0f172a'})`,
  }),

  dots: (c) => ({
    background: c.color1 || '#0f172a',
    backgroundImage: `radial-gradient(circle, ${c.color2 || 'rgba(255,255,255,0.06)'} 1px, transparent 1px)`,
    backgroundSize: `${c.patternSize || 20}px ${c.patternSize || 20}px`,
  }),

  grid: (c) => ({
    background: c.color1 || '#0f172a',
    backgroundImage: `linear-gradient(${c.color2 || 'rgba(255,255,255,0.04)'} 1px, transparent 1px), linear-gradient(90deg, ${c.color2 || 'rgba(255,255,255,0.04)'} 1px, transparent 1px)`,
    backgroundSize: `${c.patternSize || 40}px ${c.patternSize || 40}px`,
  }),

  diagonal: (c) => ({
    background: c.color1 || '#0f172a',
    backgroundImage: `repeating-linear-gradient(${c.gradientAngle ?? 45}deg, ${c.color2 || 'rgba(255,255,255,0.03)'}, ${c.color2 || 'rgba(255,255,255,0.03)'} 1px, transparent 1px, transparent ${c.patternSize || 12}px)`,
  }),

  noise: (c) => ({
    background: c.color1 || '#0f172a',
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
    backgroundSize: '256px 256px',
  }),

  vignette: (c) => ({
    background: `radial-gradient(ellipse at center, ${c.color2 || '#1e293b'} 0%, ${c.color1 || '#000000'} 100%)`,
  }),

  carbon: (c) => ({
    background: c.color1 || '#111111',
    backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)`,
    backgroundSize: '4px 4px',
  }),

  scanlines: (c) => ({
    background: c.color1 || '#0f172a',
    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${c.color2 || 'rgba(0,0,0,0.15)'} 2px, ${c.color2 || 'rgba(0,0,0,0.15)'} 4px)`,
  }),
};

export default function BackgroundWidget({ config, theme }) {
  const c = config || {};

  const textureType = c.textureType || 'gradient';
  const bgMode = c.bgMode || 'texture';        // 'texture' | 'image' | 'video'
  const imageUrl = c.imageUrl || '';
  const videoUrl = c.videoUrl || '';
  const imageFit = c.imageFit || 'cover';
  const imagePosition = c.imagePosition || 'center';
  const opacity = c.opacity ?? 100;
  const borderRadius = c.borderRadius ?? 0;
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;
  const blur = c.blur ?? 0;
  const hueRotate = c.hueRotate ?? 0;
  const grayscale = c.grayscale ?? 0;
  const sepia = c.sepia ?? 0;
  const overlayColor = c.overlayColor || '';
  const overlayOpacity = c.overlayOpacity ?? 0;

  /* ─── Build CSS filter ─── */
  const filterParts = [];
  if (brightness !== 100) filterParts.push(`brightness(${brightness}%)`);
  if (contrast !== 100) filterParts.push(`contrast(${contrast}%)`);
  if (saturation !== 100) filterParts.push(`saturate(${saturation}%)`);
  if (blur > 0) filterParts.push(`blur(${blur}px)`);
  if (hueRotate !== 0) filterParts.push(`hue-rotate(${hueRotate}deg)`);
  if (grayscale > 0) filterParts.push(`grayscale(${grayscale}%)`);
  if (sepia > 0) filterParts.push(`sepia(${sepia}%)`);
  const filterStr = filterParts.length > 0 ? filterParts.join(' ') : undefined;

  /* ─── Texture style ─── */
  const textureStyle = useMemo(() => {
    const gen = TEXTURES[textureType] || TEXTURES.gradient;
    return gen(c);
  }, [textureType, c.color1, c.color2, c.color3, c.gradientAngle, c.patternSize, c.animSpeed]);

  const rootStyle = {
    width: '100%',
    height: '100%',
    borderRadius: `${borderRadius}px`,
    overflow: 'hidden',
    opacity: opacity / 100,
    position: 'relative',
  };

  const mediaStyle = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    filter: filterStr,
    borderRadius: `${borderRadius}px`,
  };

  return (
    <div className="oc-bg-widget" style={rootStyle}>

      {/* ── Texture / Solid background ── */}
      {bgMode === 'texture' && (
        <div className="oc-bg-layer oc-bg-texture" style={{ ...mediaStyle, ...textureStyle }} />
      )}

      {/* ── Image background ── */}
      {bgMode === 'image' && imageUrl && (
        <img
          className="oc-bg-layer oc-bg-image"
          src={imageUrl}
          alt=""
          style={{
            ...mediaStyle,
            objectFit: imageFit,
            objectPosition: imagePosition,
          }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}

      {/* ── Video background ── */}
      {bgMode === 'video' && videoUrl && (
        <video
          className="oc-bg-layer oc-bg-video"
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          style={{
            ...mediaStyle,
            objectFit: imageFit,
            objectPosition: imagePosition,
          }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}

      {/* ── Color overlay ── */}
      {overlayColor && overlayOpacity > 0 && (
        <div
          className="oc-bg-layer oc-bg-overlay"
          style={{
            ...mediaStyle,
            background: overlayColor,
            opacity: overlayOpacity / 100,
            filter: undefined,
          }}
        />
      )}
    </div>
  );
}
