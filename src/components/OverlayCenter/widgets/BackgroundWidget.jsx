import React, { useMemo } from "react";
import "./BackgroundWidget.css";
import { appearanceAttrs, subValue } from "./shared/appearanceStyles";

const toPercentOpacity = (value, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return number <= 1 ? number * 100 : number;
};

function partAttrs(partId) {
  return appearanceAttrs({
    widgetType: "background",
    elementId: partId,
  });
}

/* ─── Texture CSS generators ─── */
const TEXTURES = {
  none: (c) => ({
    background: c.color1 || "#0f172a",
  }),

  gradient: (c) => ({
    background: `linear-gradient(${c.gradientAngle ?? 135}deg, ${c.color1 || "#0f172a"}, ${c.color2 || "#2a3139"}, ${c.color3 || "#0f172a"})`,
  }),

  metallic: (c) => ({
    background: `linear-gradient(${c.gradientAngle ?? 135}deg, ${c.color1 || "#1a1a2e"}, ${c.color2 || "#3a3a5c"}, ${c.color1 || "#1a1a2e"}, ${c.color2 || "#3a3a5c"}, ${c.color1 || "#1a1a2e"})`,
    backgroundSize: "400% 400%",
  }),

  pearl: (c) => ({
    background: `linear-gradient(${c.gradientAngle ?? 135}deg, ${c.color1 || "#d5dbe1"}, ${c.color2 || "#eef2f5"}, ${c.color3 || "#bcc4cc"}, ${c.color2 || "#eef2f5"}, ${c.color1 || "#d5dbe1"})`,
    backgroundSize: "300% 300%",
  }),

  gloss: (c) => ({
    background: `linear-gradient(${c.gradientAngle ?? 180}deg, ${c.color1 || "#0f172a"} 0%, ${c.color2 || "#39424d"} 40%, rgba(255,255,255,0.08) 50%, ${c.color2 || "#39424d"} 60%, ${c.color1 || "#0f172a"} 100%)`,
  }),

  chameleon: (c) => ({
    background: `linear-gradient(${c.gradientAngle ?? 135}deg, ${c.color1 || "#4d5662"}, ${c.color2 || "#8993a0"}, ${c.color3 || "#dbe2e8"}, ${c.color1 || "#4d5662"})`,
    backgroundSize: "600% 600%",
    animation: `bg-chameleon-shift ${c.animSpeed || 8}s ease infinite`,
  }),

  radial: (c) => ({
    background: `radial-gradient(ellipse at center, ${c.color2 || "#313842"}, ${c.color1 || "#0f172a"})`,
  }),

  conic: (c) => ({
    background: `conic-gradient(from ${c.gradientAngle ?? 0}deg, ${c.color1 || "#0f172a"}, ${c.color2 || "#39424d"}, ${c.color3 || "#99a3ae"}, ${c.color1 || "#0f172a"})`,
  }),

  dots: (c) => ({
    background: c.color1 || "#0f172a",
    backgroundImage: `radial-gradient(circle, ${c.color2 || "rgba(255,255,255,0.06)"} 1px, transparent 1px)`,
    backgroundSize: `${c.patternSize || 20}px ${c.patternSize || 20}px`,
  }),

  grid: (c) => ({
    background: c.color1 || "#0f172a",
    backgroundImage: `linear-gradient(${c.color2 || "rgba(255,255,255,0.04)"} 1px, transparent 1px), linear-gradient(90deg, ${c.color2 || "rgba(255,255,255,0.04)"} 1px, transparent 1px)`,
    backgroundSize: `${c.patternSize || 40}px ${c.patternSize || 40}px`,
  }),

  diagonal: (c) => ({
    background: c.color1 || "#0f172a",
    backgroundImage: `repeating-linear-gradient(${c.gradientAngle ?? 45}deg, ${c.color2 || "rgba(255,255,255,0.03)"}, ${c.color2 || "rgba(255,255,255,0.03)"} 1px, transparent 1px, transparent ${c.patternSize || 12}px)`,
  }),

  noise: (c) => ({
    background: c.color1 || "#0f172a",
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
    backgroundSize: "256px 256px",
  }),

  vignette: (c) => ({
    background: `radial-gradient(ellipse at center, ${c.color2 || "#2a3139"} 0%, ${c.color1 || "#000000"} 100%)`,
  }),

  carbon: (c) => ({
    background: c.color1 || "#111111",
    backgroundImage: `repeating-linear-gradient(0deg, ${c.color2 || "rgba(255,255,255,0.02)"} 0px, ${c.color2 || "rgba(255,255,255,0.02)"} 1px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, ${c.color2 || "rgba(255,255,255,0.02)"} 0px, ${c.color2 || "rgba(255,255,255,0.02)"} 1px, transparent 1px, transparent 3px)`,
    backgroundSize: `${Math.max(Number(c.patternSize) || 4, 4)}px ${Math.max(Number(c.patternSize) || 4, 4)}px`,
  }),

  scanlines: (c) => ({
    background: c.color1 || "#0f172a",
    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${c.color2 || "rgba(0,0,0,0.15)"} 2px, ${c.color2 || "rgba(0,0,0,0.15)"} 4px)`,
  }),
};

function BackgroundWidget({ config, theme }) {
  const c = config || {};

  const displayStyle = c.displayStyle || "v1";
  const isSpecialBg = [
    "aurora",
    "matrix",
    "starfield",
    "waves",
    "geometric",
  ].includes(displayStyle);

  const textureType = subValue(
    c,
    "texture",
    "textureType",
    c.textureType || "gradient",
  );
  const sourceMode = subValue(c, "source", "bgMode", undefined);
  const bgMode =
    sourceMode || (isSpecialBg ? "special" : c.bgMode || "texture"); // 'texture' | 'image' | 'video' | 'special'
  const imageUrl = subValue(c, "media", "imageUrl", c.imageUrl || "");
  const videoUrl = subValue(c, "media", "videoUrl", c.videoUrl || "");
  const imageFit = subValue(c, "media", "imageFit", c.imageFit || "cover");
  const imagePosition = subValue(
    c,
    "media",
    "backgroundPosition",
    c.imagePosition || "center",
  );
  const opacity = toPercentOpacity(
    subValue(c, "canvas", "opacity", c.opacity ?? 100),
    100,
  );
  const borderRadius = subValue(c, "canvas", "radius", c.borderRadius ?? 0);
  const textureConfig = {
    ...c,
    color1: subValue(
      c,
      "texture",
      "background",
      subValue(c, "gradient", "background", c.color1 || "#0f172a"),
    ),
    color2: subValue(
      c,
      "texture",
      "accentColor",
      subValue(c, "gradient", "accentColor", c.color2 || "#2a3139"),
    ),
    color3: subValue(
      c,
      "texture",
      "fillColor",
      subValue(c, "gradient", "fillColor", c.color3 || "#0f172a"),
    ),
    gradientAngle: subValue(
      c,
      "texture",
      "gradientAngle",
      c.gradientAngle ?? 135,
    ),
    patternSize: subValue(c, "texture", "patternSize", c.patternSize ?? 20),
    animSpeed: subValue(c, "texture", "animSpeed", c.animSpeed || 8),
  };
  const brightness = subValue(c, "media", "brightness", c.brightness ?? 100);
  const contrast = subValue(c, "media", "contrast", c.contrast ?? 100);
  const saturation = subValue(c, "media", "saturation", c.saturation ?? 100);
  const blur = subValue(c, "media", "blur", c.blur ?? 0);
  const hueRotate = subValue(c, "media", "hueRotate", c.hueRotate ?? 0);
  const grayscale = subValue(c, "media", "grayscale", c.grayscale ?? 0);
  const sepia = subValue(c, "media", "sepia", c.sepia ?? 0);
  const overlayColor = subValue(c, "tint", "background", c.overlayColor || "");
  const overlayOpacity = toPercentOpacity(
    subValue(c, "tint", "opacity", c.overlayOpacity ?? 0),
  );

  /* ─── Effects config ─── */
  const fxParticles = subValue(
    c,
    "effects",
    "fxParticles",
    c.fxParticles || "none",
  ); // none | orbs | fireflies | bokeh | snow | rain
  const fxParticleColor = subValue(
    c,
    "effects",
    "fxParticleColor",
    c.fxParticleColor || "#ffffff",
  );
  const fxParticleCount = subValue(
    c,
    "effects",
    "fxParticleCount",
    c.fxParticleCount ?? 25,
  );
  const fxParticleSpeed = subValue(
    c,
    "effects",
    "fxParticleSpeed",
    c.fxParticleSpeed ?? 50,
  );
  const fxParticleSize = subValue(
    c,
    "effects",
    "fxParticleSize",
    c.fxParticleSize ?? 50,
  );
  const fxFog = subValue(c, "effects", "fxFog", c.fxFog || "none"); // none | light | medium | heavy
  const fxFogColor = subValue(
    c,
    "effects",
    "fxFogColor",
    c.fxFogColor || "#000000",
  );
  const fxGlimpse = subValue(c, "effects", "fxGlimpse", c.fxGlimpse || "none"); // none | sweep | pulse | flicker
  const fxGlimpseColor = subValue(
    c,
    "effects",
    "fxGlimpseColor",
    c.fxGlimpseColor || "#ffffff",
  );
  const fxGlimpseSpeed = subValue(
    c,
    "effects",
    "fxGlimpseSpeed",
    c.fxGlimpseSpeed ?? 50,
  );

  /* ─── Build CSS filter ─── */
  const filterParts = [];
  if (brightness !== 100) filterParts.push(`brightness(${brightness}%)`);
  if (contrast !== 100) filterParts.push(`contrast(${contrast}%)`);
  if (saturation !== 100) filterParts.push(`saturate(${saturation}%)`);
  if (blur > 0) filterParts.push(`blur(${blur}px)`);
  if (hueRotate !== 0) filterParts.push(`hue-rotate(${hueRotate}deg)`);
  if (grayscale > 0) filterParts.push(`grayscale(${grayscale}%)`);
  if (sepia > 0) filterParts.push(`sepia(${sepia}%)`);
  const filterStr = filterParts.length > 0 ? filterParts.join(" ") : undefined;

  /* ─── Texture style ─── */
  const textureStyle = useMemo(() => {
    const gen = TEXTURES[textureType] || TEXTURES.gradient;
    return gen(textureConfig);
  }, [textureType, textureConfig]);
  const specialSpeedFactor = secondsSpeedFactor(textureConfig.animSpeed, 8);

  const rootStyle = {
    width: "100%",
    height: "100%",
    borderRadius: `${borderRadius}px`,
    overflow: "hidden",
    opacity: opacity / 100,
    position: "relative",
    background: subValue(c, "canvas", "background", "transparent"),
  };

  const mediaOpacity = toPercentOpacity(
    subValue(c, "media", "opacity", 100),
    100,
  );
  const layerStyle = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    filter: filterStr,
    borderRadius: `${borderRadius}px`,
  };
  const mediaStyle = {
    ...layerStyle,
    opacity: mediaOpacity / 100,
  };

  return (
    <div className="oc-bg-widget" style={rootStyle} {...partAttrs("canvas")}>
      {/* ── Texture / Solid background ── */}
      {bgMode === "texture" && (
        <div
          className="oc-bg-layer oc-bg-texture"
          style={{ ...layerStyle, ...textureStyle }}
          {...partAttrs("texture")}
        />
      )}

      {/* ── Image background ── */}
      {bgMode === "image" && imageUrl && (
        <img
          className="oc-bg-layer oc-bg-image"
          src={imageUrl}
          alt=""
          {...partAttrs("media")}
          style={{
            ...mediaStyle,
            objectFit: imageFit,
            objectPosition: imagePosition,
          }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      )}

      {/* ── Video background ── */}
      {bgMode === "video" && videoUrl && (
        <video
          className="oc-bg-layer oc-bg-video"
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          {...partAttrs("media")}
          style={{
            ...mediaStyle,
            objectFit: imageFit,
            objectPosition: imagePosition,
          }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      )}

      {/* ── Special animated backgrounds ── */}
      {bgMode === "special" && displayStyle === "aurora" && (
        <div
          className="oc-bg-layer oc-bg-aurora"
          style={{
            ...layerStyle,
            background: `linear-gradient(${textureConfig.gradientAngle ?? 135}deg, ${textureConfig.color1 || "#0d1117"}, ${textureConfig.color2 || "#232a33"}, ${textureConfig.color3 || "#141a20"})`,
          }}
          {...partAttrs("texture")}
        >
          <div
            className="oc-bg-aurora-band oc-bg-aurora-1"
            style={{
              "--aurora-c1": textureConfig.color2 || "#dbe2e8",
              "--aurora-c2": textureConfig.color3 || "#8f98a3",
              animationDuration: `${12 * specialSpeedFactor}s`,
            }}
          />
          <div
            className="oc-bg-aurora-band oc-bg-aurora-2"
            style={{
              "--aurora-c1": textureConfig.color3 || "#bcc4cc",
              "--aurora-c2": textureConfig.color1 || "#6b7480",
              animationDuration: `${15 * specialSpeedFactor}s`,
            }}
          />
          <div
            className="oc-bg-aurora-band oc-bg-aurora-3"
            style={{
              "--aurora-c1": textureConfig.color1 || "#eef2f5",
              "--aurora-c2": textureConfig.color2 || "#dbe2e8",
              animationDuration: `${18 * specialSpeedFactor}s`,
            }}
          />
        </div>
      )}

      {bgMode === "special" && displayStyle === "matrix" && (
        <div
          className="oc-bg-layer oc-bg-matrix"
          style={{
            ...layerStyle,
            background: textureConfig.color1 || "#000800",
          }}
          {...partAttrs("texture")}
        >
          <MatrixRain
            color={textureConfig.color2 || "#dbe2e8"}
            speed={textureConfig.animSpeed || 8}
          />
        </div>
      )}

      {bgMode === "special" && displayStyle === "starfield" && (
        <div
          className="oc-bg-layer oc-bg-starfield"
          style={{
            ...layerStyle,
            background: textureConfig.color1 || "#000005",
          }}
          {...partAttrs("texture")}
        >
          <StarfieldCanvas
            color={textureConfig.color2 || "#ffffff"}
            speed={textureConfig.animSpeed || 8}
          />
        </div>
      )}

      {bgMode === "special" && displayStyle === "waves" && (
        <div
          className="oc-bg-layer oc-bg-waves"
          style={{
            ...layerStyle,
            background: textureConfig.color1 || "#0a0a2e",
          }}
          {...partAttrs("texture")}
        >
          <div
            className="oc-bg-wave oc-bg-wave-1"
            style={{
              "--wave-color": textureConfig.color2 || "rgba(219,226,232,0.15)",
              animationDuration: `${8 * specialSpeedFactor}s`,
            }}
          />
          <div
            className="oc-bg-wave oc-bg-wave-2"
            style={{
              "--wave-color": textureConfig.color3 || "rgba(188,196,204,0.1)",
              animationDuration: `${10 * specialSpeedFactor}s`,
            }}
          />
          <div
            className="oc-bg-wave oc-bg-wave-3"
            style={{
              "--wave-color": textureConfig.color2 || "rgba(143,152,163,0.08)",
              animationDuration: `${12 * specialSpeedFactor}s`,
            }}
          />
        </div>
      )}

      {bgMode === "special" && displayStyle === "geometric" && (
        <div
          className="oc-bg-layer oc-bg-geometric"
          style={{
            ...layerStyle,
            background: textureConfig.color1 || "#0a0a1a",
          }}
          {...partAttrs("texture")}
        >
          <div
            className="oc-bg-geo-grid"
            style={{
              "--geo-color": textureConfig.color2 || "rgba(200,208,216,0.12)",
              animationDuration: `${6 * specialSpeedFactor}s`,
            }}
          />
          <div
            className="oc-bg-geo-shapes"
            style={{
              "--geo-accent": textureConfig.color3 || "rgba(188,196,204,0.15)",
              animationDuration: `${20 * specialSpeedFactor}s`,
            }}
          />
        </div>
      )}

      {/* ── Color overlay ── */}
      {overlayColor && overlayOpacity > 0 && (
        <div
          className="oc-bg-layer oc-bg-overlay"
          {...partAttrs("tint")}
          style={{
            ...layerStyle,
            background: overlayColor,
            opacity: overlayOpacity / 100,
            filter: undefined,
          }}
        />
      )}

      {/* ── Animated Effects Layer ── */}
      {(fxParticles !== "none" || fxFog !== "none" || fxGlimpse !== "none") && (
        <div
          className="oc-bg-layer oc-bg-fx"
          style={{
            ...layerStyle,
            filter: undefined,
            zIndex: 2,
            pointerEvents: "none",
          }}
          {...partAttrs("effects")}
        >
          {/* Particles / Snow / Rain / Fireflies / Bokeh / Orbs */}
          {fxParticles !== "none" && (
            <ParticleLayer
              type={fxParticles}
              color={fxParticleColor}
              count={fxParticleCount}
              speed={fxParticleSpeed}
              size={fxParticleSize}
            />
          )}

          {/* Fog / Smoke */}
          {fxFog !== "none" && (
            <FogLayer intensity={fxFog} color={fxFogColor} />
          )}

          {/* Glimpse / Sweep / Pulse */}
          {fxGlimpse !== "none" && (
            <GlimpseLayer
              type={fxGlimpse}
              color={fxGlimpseColor}
              speed={fxGlimpseSpeed}
            />
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
        x: rng() * 100, // start X %
        y: rng() * 100, // start Y %
        delay: rng() * 10, // animation delay
        dur: (rng() * 6 + 4) * speedFactor, // duration
        s: (rng() * 0.6 + 0.4) * sizeFactor, // size multiplier
        drift: (rng() - 0.5) * 60, // horizontal drift
        opacity: rng() * 0.5 + 0.3,
      });
    }
    return arr;
  }, [clamped, speedFactor, sizeFactor]);

  const baseSizeByType = { rain: 2, snow: 6, fireflies: 4, bokeh: 30 };
  const animationByType = {
    rain: "oc-fx-rain",
    snow: "oc-fx-snow",
    fireflies: "oc-fx-firefly",
    bokeh: "oc-fx-bokeh",
  };
  const baseSize = baseSizeByType[type] || 8;
  const animName = animationByType[type] || "oc-fx-orb";

  return (
    <div
      className="oc-fx-particles"
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      {particles.map((p, i) => {
        const w = baseSize * p.s;
        const h = type === "rain" ? w * 6 : w;
        const particleBackground = (() => {
          if (type === "fireflies") return `radial-gradient(circle, ${color}, transparent 70%)`;
          if (type === "bokeh") return `radial-gradient(circle, ${color}33, ${color}11 60%, transparent 70%)`;
          return color;
        })();
        const particleFilter = (() => {
          if (type === "bokeh") return `blur(${w * 0.3}px)`;
          if (type === "fireflies") return "blur(1px)";
          return undefined;
        })();
        const particleShadow = (() => {
          if (type === "fireflies") return `0 0 ${w * 2}px ${color}`;
          if (type === "orbs") return `0 0 ${w}px ${color}44`;
          return undefined;
        })();
        return (
          <span
            key={`${type}-${Math.round(p.x * 100)}-${Math.round(p.y * 100)}-${i}`}
            className={`oc-fx-particle oc-fx-particle--${type}`}
            style={{
              "--fx-x": `${p.x}%`,
              "--fx-drift": `${p.drift}px`,
              "--fx-color": color,
              "--fx-opacity": p.opacity,
              position: "absolute",
              left: `${p.x}%`,
              top: type === "rain" || type === "snow" ? "-5%" : `${p.y}%`,
              width: `${w}px`,
              height: `${h}px`,
              borderRadius: type === "rain" ? "1px" : "50%",
              background: particleBackground,
              opacity: p.opacity,
              animation: `${animName} ${p.dur}s ${p.delay}s ease-in-out infinite`,
              pointerEvents: "none",
              filter: particleFilter,
              boxShadow: particleShadow,
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
    <div
      className="oc-fx-fog"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        className="oc-fx-fog-layer oc-fx-fog-1"
        style={{
          "--fog-color": color,
          "--fog-opacity": op,
        }}
      />
      <div
        className="oc-fx-fog-layer oc-fx-fog-2"
        style={{
          "--fog-color": color,
          "--fog-opacity": op * 0.7,
        }}
      />
      {intensity === "heavy" && (
        <div
          className="oc-fx-fog-layer oc-fx-fog-3"
          style={{
            "--fog-color": color,
            "--fog-opacity": op * 0.5,
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   GLIMPSE LAYER – light sweep / pulse / flicker
   ═══════════════════════════════════════════════ */
function GlimpseLayer({ type, color, speed }) {
  const dur = (100 - speed) / 10 + 2; // 2s to 12s

  if (type === "sweep") {
    return (
      <div
        className="oc-fx-glimpse oc-fx-glimpse--sweep"
        style={{
          "--glimpse-color": color,
          "--glimpse-dur": `${dur}s`,
        }}
      />
    );
  }

  if (type === "pulse") {
    return (
      <div
        className="oc-fx-glimpse oc-fx-glimpse--pulse"
        style={{
          "--glimpse-color": color,
          "--glimpse-dur": `${dur}s`,
        }}
      />
    );
  }

  if (type === "flicker") {
    return (
      <div
        className="oc-fx-glimpse oc-fx-glimpse--flicker"
        style={{
          "--glimpse-color": color,
          "--glimpse-dur": `${dur * 0.3}s`,
        }}
      />
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════
   MATRIX RAIN – CSS-animated falling characters
   ═══════════════════════════════════════════════ */
function secondsSpeedFactor(speed, fallback = 8) {
  const seconds = Number(speed);
  const safeSeconds = Number.isFinite(seconds) ? seconds : fallback;
  return Math.min(Math.max(safeSeconds, 2), 30) / fallback;
}

function MatrixRain({ color, speed }) {
  const speedFactor = secondsSpeedFactor(speed, 8);
  const columns = useMemo(() => {
    const cols = [];
    const count = 30;
    for (let i = 0; i < count; i++) {
      const rng = seededRandom(i * 73 + 17);
      cols.push({
        x: (i / count) * 100 + rng() * (100 / count),
        delay: rng() * 10,
        dur: (rng() * 6 + 3) * speedFactor,
        opacity: rng() * 0.6 + 0.2,
        chars: Array.from({ length: Math.floor(rng() * 12 + 8) }, () =>
          String.fromCodePoint(0x30a0 + Math.floor(rng() * 96)),
        ).join("\n"),
        fontSize: Math.floor(rng() * 6 + 10),
      });
    }
    return cols;
  }, [speedFactor]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {columns.map((col, i) => (
        <div
          key={`matrix-${Math.round(col.x * 100)}-${i}`}
          style={{
            position: "absolute",
            left: `${col.x}%`,
            top: "-20%",
            color,
            fontSize: col.fontSize,
            fontFamily: "'Courier New', monospace",
            whiteSpace: "pre",
            lineHeight: 1.2,
            opacity: col.opacity,
            animation: `oc-fx-matrix-fall ${col.dur}s ${col.delay}s linear infinite`,
            textShadow: `0 0 8px ${color}`,
          }}
        >
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
  const speedFactor = secondsSpeedFactor(speed, 8);
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
        dur: (8 - layer * 2) * speedFactor,
        delay: rng() * 5,
      });
    }
    return arr;
  }, [speedFactor]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {stars.map((s, i) => (
        <span
          key={`star-${Math.round(s.x * 100)}-${Math.round(s.y * 100)}-${i}`}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: color,
            opacity: s.opacity,
            boxShadow: `0 0 ${s.size * 2}px ${color}`,
            animation: `oc-fx-starfield ${s.dur}s ${s.delay}s linear infinite`,
          }}
        />
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
