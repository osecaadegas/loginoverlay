import React, { useMemo, useRef, useEffect } from 'react';

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

function BackgroundWidget({ config, theme }) {
  const c = config || {};

  const displayStyle = c.displayStyle || 'v1';
  const isSpecialBg = ['aurora', 'matrix', 'starfield', 'waves', 'geometric'].includes(displayStyle);

  const textureType = c.textureType || 'gradient';
  const bgMode = isSpecialBg ? 'special' : (c.bgMode || 'texture');  // 'texture' | 'image' | 'video' | 'special'
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

  /* ─── Effects config ─── */
  const fxParticles = c.fxParticles || 'none';     // none | orbs | fireflies | bokeh | snow | rain
  const fxParticleColor = c.fxParticleColor || '#ffffff';
  const fxParticleCount = c.fxParticleCount ?? 25;
  const fxParticleSpeed = c.fxParticleSpeed ?? 50;
  const fxParticleSize = c.fxParticleSize ?? 50;
  const fxFog = c.fxFog || 'none';                 // none | light | medium | heavy
  const fxFogColor = c.fxFogColor || '#000000';
  const fxGlimpse = c.fxGlimpse || 'none';         // none | sweep | pulse | flicker
  const fxGlimpseColor = c.fxGlimpseColor || '#ffffff';
  const fxGlimpseSpeed = c.fxGlimpseSpeed ?? 50;

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

      {/* ── Special animated backgrounds ── */}
      {bgMode === 'special' && displayStyle === 'aurora' && (
        <div className="oc-bg-layer oc-bg-aurora" style={{
          ...mediaStyle,
          background: `linear-gradient(${c.gradientAngle ?? 135}deg, ${c.color1 || '#0a0020'}, ${c.color2 || '#1a0040'}, ${c.color3 || '#002020'})`,
        }}>
          <div className="oc-bg-aurora-band oc-bg-aurora-1" style={{ '--aurora-c1': c.color2 || '#00ff88', '--aurora-c2': c.color3 || '#6366f1' }} />
          <div className="oc-bg-aurora-band oc-bg-aurora-2" style={{ '--aurora-c1': c.color3 || '#a855f7', '--aurora-c2': c.color1 || '#06b6d4' }} />
          <div className="oc-bg-aurora-band oc-bg-aurora-3" style={{ '--aurora-c1': c.color1 || '#22d3ee', '--aurora-c2': c.color2 || '#00ff88' }} />
        </div>
      )}

      {bgMode === 'special' && displayStyle === 'matrix' && (
        <div className="oc-bg-layer oc-bg-matrix" style={{ ...mediaStyle, background: c.color1 || '#000800' }}>
          <MatrixRain color={c.color2 || '#00ff41'} speed={c.animSpeed || 8} />
        </div>
      )}

      {bgMode === 'special' && displayStyle === 'starfield' && (
        <div className="oc-bg-layer oc-bg-starfield" style={{ ...mediaStyle, background: c.color1 || '#000005' }}>
          <StarfieldCanvas color={c.color2 || '#ffffff'} speed={c.animSpeed || 8} />
        </div>
      )}

      {bgMode === 'special' && displayStyle === 'waves' && (
        <div className="oc-bg-layer oc-bg-waves" style={{
          ...mediaStyle,
          background: c.color1 || '#0a0a2e',
        }}>
          <div className="oc-bg-wave oc-bg-wave-1" style={{ '--wave-color': c.color2 || 'rgba(99,102,241,0.15)' }} />
          <div className="oc-bg-wave oc-bg-wave-2" style={{ '--wave-color': c.color3 || 'rgba(168,85,247,0.1)' }} />
          <div className="oc-bg-wave oc-bg-wave-3" style={{ '--wave-color': c.color2 || 'rgba(59,130,246,0.08)' }} />
        </div>
      )}

      {bgMode === 'special' && displayStyle === 'geometric' && (
        <div className="oc-bg-layer oc-bg-geometric" style={{
          ...mediaStyle,
          background: c.color1 || '#0a0a1a',
        }}>
          <div className="oc-bg-geo-grid" style={{ '--geo-color': c.color2 || 'rgba(99,102,241,0.12)' }} />
          <div className="oc-bg-geo-shapes" style={{ '--geo-accent': c.color3 || 'rgba(168,85,247,0.15)' }} />
        </div>
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

      {/* ── Animated Effects Layer ── */}
      {(fxParticles !== 'none' || fxFog !== 'none' || fxGlimpse !== 'none') && (
        <div className="oc-bg-layer oc-bg-fx" style={{ ...mediaStyle, filter: undefined, zIndex: 2, pointerEvents: 'none' }}>

          {/* Particles / Snow / Rain / Fireflies / Bokeh / Orbs */}
          {fxParticles !== 'none' && (
            <ParticleLayer
              type={fxParticles}
              color={fxParticleColor}
              count={fxParticleCount}
              speed={fxParticleSpeed}
              size={fxParticleSize}
            />
          )}

          {/* Fog / Smoke */}
          {fxFog !== 'none' && (
            <FogLayer intensity={fxFog} color={fxFogColor} />
          )}

          {/* Glimpse / Sweep / Pulse */}
          {fxGlimpse !== 'none' && (
            <GlimpseLayer type={fxGlimpse} color={fxGlimpseColor} speed={fxGlimpseSpeed} />
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PARTICLE LAYER – generates CSS-animated particles
   ═══════════════════════════════════════════════ */
function ParticleLayer({ type, color, count, speed, size }) {
  const clamped = Math.min(Math.max(count, 5), 80);
  const speedFactor = (100 - speed) / 50 + 0.5; // 0.5x to 2.5x
  const sizeFactor = size / 50; // 0-2x

  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < clamped; i++) {
      const rng = seededRandom(i * 137 + 42);
      arr.push({
        x: rng() * 100,           // start X %
        y: rng() * 100,           // start Y %
        delay: rng() * 10,        // animation delay
        dur: (rng() * 6 + 4) * speedFactor,  // duration
        s: (rng() * 0.6 + 0.4) * sizeFactor, // size multiplier
        drift: (rng() - 0.5) * 60,           // horizontal drift
        opacity: rng() * 0.5 + 0.3,
      });
    }
    return arr;
  }, [clamped, speedFactor, sizeFactor]);

  const baseSize = type === 'rain' ? 2 : type === 'snow' ? 6 : type === 'fireflies' ? 4 : type === 'bokeh' ? 30 : 8;
  const animName = type === 'rain' ? 'oc-fx-rain' : type === 'snow' ? 'oc-fx-snow' : type === 'fireflies' ? 'oc-fx-firefly' : type === 'bokeh' ? 'oc-fx-bokeh' : 'oc-fx-orb';

  return (
    <div className="oc-fx-particles" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {particles.map((p, i) => {
        const w = baseSize * p.s;
        const h = type === 'rain' ? w * 6 : w;
        return (
          <span
            key={i}
            className={`oc-fx-particle oc-fx-particle--${type}`}
            style={{
              '--fx-x': `${p.x}%`,
              '--fx-drift': `${p.drift}px`,
              '--fx-color': color,
              '--fx-opacity': p.opacity,
              position: 'absolute',
              left: `${p.x}%`,
              top: type === 'rain' || type === 'snow' ? '-5%' : `${p.y}%`,
              width: `${w}px`,
              height: `${h}px`,
              borderRadius: type === 'rain' ? '1px' : '50%',
              background: type === 'fireflies'
                ? `radial-gradient(circle, ${color}, transparent 70%)`
                : type === 'bokeh'
                  ? `radial-gradient(circle, ${color}33, ${color}11 60%, transparent 70%)`
                  : color,
              opacity: p.opacity,
              animation: `${animName} ${p.dur}s ${p.delay}s ease-in-out infinite`,
              pointerEvents: 'none',
              filter: type === 'bokeh' ? `blur(${w * 0.3}px)` : type === 'fireflies' ? 'blur(1px)' : undefined,
              boxShadow: type === 'fireflies' ? `0 0 ${w * 2}px ${color}` : type === 'orbs' ? `0 0 ${w}px ${color}44` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   FOG LAYER – animated gradient fog
   ═══════════════════════════════════════════════ */
function FogLayer({ intensity, color }) {
  const opMap = { light: 0.15, medium: 0.3, heavy: 0.5 };
  const op = opMap[intensity] || 0.2;

  return (
    <div className="oc-fx-fog" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div className="oc-fx-fog-layer oc-fx-fog-1" style={{
        '--fog-color': color,
        '--fog-opacity': op,
      }} />
      <div className="oc-fx-fog-layer oc-fx-fog-2" style={{
        '--fog-color': color,
        '--fog-opacity': op * 0.7,
      }} />
      {intensity === 'heavy' && (
        <div className="oc-fx-fog-layer oc-fx-fog-3" style={{
          '--fog-color': color,
          '--fog-opacity': op * 0.5,
        }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   GLIMPSE LAYER – light sweep / pulse / flicker
   ═══════════════════════════════════════════════ */
function GlimpseLayer({ type, color, speed }) {
  const dur = ((100 - speed) / 10 + 2); // 2s to 12s

  if (type === 'sweep') {
    return (
      <div className="oc-fx-glimpse oc-fx-glimpse--sweep" style={{
        '--glimpse-color': color,
        '--glimpse-dur': `${dur}s`,
      }} />
    );
  }

  if (type === 'pulse') {
    return (
      <div className="oc-fx-glimpse oc-fx-glimpse--pulse" style={{
        '--glimpse-color': color,
        '--glimpse-dur': `${dur}s`,
      }} />
    );
  }

  if (type === 'flicker') {
    return (
      <div className="oc-fx-glimpse oc-fx-glimpse--flicker" style={{
        '--glimpse-color': color,
        '--glimpse-dur': `${dur * 0.3}s`,
      }} />
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════
   MATRIX RAIN – CSS-animated falling characters
   ═══════════════════════════════════════════════ */
function MatrixRain({ color, speed }) {
  const columns = useMemo(() => {
    const cols = [];
    const count = 30;
    for (let i = 0; i < count; i++) {
      const rng = seededRandom(i * 73 + 17);
      cols.push({
        x: (i / count) * 100 + rng() * (100 / count),
        delay: rng() * 10,
        dur: (rng() * 6 + 3) * ((100 - speed * 5) / 50 + 0.5),
        opacity: rng() * 0.6 + 0.2,
        chars: Array.from({ length: Math.floor(rng() * 12 + 8) }, () =>
          String.fromCharCode(0x30A0 + Math.floor(rng() * 96))
        ).join('\n'),
        fontSize: Math.floor(rng() * 6 + 10),
      });
    }
    return cols;
  }, [speed]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {columns.map((col, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${col.x}%`,
          top: '-20%',
          color,
          fontSize: col.fontSize,
          fontFamily: "'Courier New', monospace",
          whiteSpace: 'pre',
          lineHeight: 1.2,
          opacity: col.opacity,
          animation: `oc-fx-matrix-fall ${col.dur}s ${col.delay}s linear infinite`,
          textShadow: `0 0 8px ${color}`,
        }}>
          {col.chars}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   STARFIELD CANVAS – CSS-animated flying stars
   ═══════════════════════════════════════════════ */
function StarfieldCanvas({ color, speed }) {
  const stars = useMemo(() => {
    const arr = [];
    const count = 80;
    for (let i = 0; i < count; i++) {
      const rng = seededRandom(i * 53 + 99);
      const layer = Math.floor(rng() * 3); // 0=far, 1=mid, 2=near
      arr.push({
        x: rng() * 100,
        y: rng() * 100,
        size: (layer + 1) * (rng() * 0.8 + 0.6),
        opacity: 0.3 + layer * 0.25 + rng() * 0.2,
        dur: (8 - layer * 2) * ((100 - speed * 5) / 50 + 0.5),
        delay: rng() * 5,
      });
    }
    return arr;
  }, [speed]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {stars.map((s, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: `${s.x}%`,
          top: `${s.y}%`,
          width: s.size,
          height: s.size,
          borderRadius: '50%',
          background: color,
          opacity: s.opacity,
          boxShadow: `0 0 ${s.size * 2}px ${color}`,
          animation: `oc-fx-starfield ${s.dur}s ${s.delay}s linear infinite`,
        }} />
      ))}
    </div>
  );
}

/* ─── Seeded PRNG for deterministic particles ─── */
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export default React.memo(BackgroundWidget);
