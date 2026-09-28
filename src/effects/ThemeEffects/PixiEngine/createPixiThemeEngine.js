import {
  Application,
  Assets,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
  loadTextures,
} from "pixi.js";
import "pixi.js/unsafe-eval";
import { gsap } from "gsap";
import {
  getEffectQualityPreset,
  getEffectResolution,
  normalizeEffectQuality,
} from "../presets/performancePresets";

const QUALITY_RANK = Object.freeze({ low: 0, balanced: 1, ultra: 2 });
// OBS CSP disallows blob workers. Decode cached textures asynchronously on the
// main thread instead; a blocked worker otherwise leaves Assets.load pending.
loadTextures.config.preferWorkers = false;
const TARGET_WEIGHT = Object.freeze({
  slot_bingo: 1.35,
  bonus_hunt: 0.9,
  navbar: 0.55,
  rtp_stats: 0.45,
  bets: 0.5,
  chat: 0.55,
  slideshow_frame: 0.35,
  background: 0.65,
});
const ICE_PRIMARY_WEIGHT = Object.freeze({
  slot_bingo: 1,
  bonus_hunt: 0.78,
  slideshow_frame: 0.7,
  navbar: 0.62,
  rtp_stats: 0.58,
  bets: 0.46,
  chat: 0.44,
  background: 0.32,
});
const ICE_ICICLE_TARGETS = new Set(["navbar", "bonus_hunt", "slot_bingo", "slideshow_frame"]);
const ICE_MIST_TARGETS = new Set(["background", "bonus_hunt", "slot_bingo", "slideshow_frame"]);
const ICE_SHIMMER_TARGETS = new Set(["navbar", "slot_bingo", "rtp_stats", "slideshow_frame"]);
const ICE_BURST_TARGETS = new Set(["bonus_hunt", "slot_bingo", "tournament", "chat", "giveaway", "raid_shoutout"]);
const iceCornerViews = new WeakMap();

// Four atlas views share the existing GPU source. Cache metadata with the source
// texture instead of allocating/copying bitmaps for every target or resize.
function getIceCornerViews(texture) {
  if (!iceCornerViews.has(texture)) {
    const width = texture.width / 2;
    const height = texture.height / 2;
    iceCornerViews.set(texture, Array.from({ length: 4 }, (_, index) => new Texture({
      source: texture.source,
      frame: new Rectangle((index % 2) * width, Math.floor(index / 2) * height, width, height),
    })));
  }
  return iceCornerViews.get(texture);
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function isForcedEffect(debugEffect, effect) {
  return debugEffect === "all" || debugEffect === effect;
}

function hashString(value) {
  let hash = 2166136261;
  const source = String(value || "theme-effects");
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const randomRange = (random, min, max) => min + random() * (max - min);

function targetSignature(targets) {
  return JSON.stringify(
    targets.map(({ id, themeKey, effects }) => ({ id, themeKey, effects })),
  );
}

function getHighestQuality(targets) {
  return targets.reduce((best, target) => {
    const quality = normalizeEffectQuality(target.effects?.quality);
    return QUALITY_RANK[quality] > QUALITY_RANK[best] ? quality : best;
  }, "low");
}

function getParticleAmount(target) {
  const { theme, effects } = target;
  const family = theme.family;
  const familyAmount =
    family === "ice"
      ? effects.ice.snow
      : family === "gladiator"
        ? Math.max(effects.gladiator.embers, effects.gladiator.goldParticles)
        : effects.greek.dust;
  return clamp(
    effects.particleIntensity * familyAmount * (TARGET_WEIGHT[target.widgetType] || 0.5),
    0,
    1,
  );
}

async function loadTexture(url) {
  if (!url) return Texture.WHITE;
  try {
    return await Assets.load(url);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[ThemeEffects] Texture failed to load: ${url}`, error);
    }
    return Texture.WHITE;
  }
}

function setSpriteBounds(sprite, width, height) {
  sprite.width = Math.max(1, width);
  sprite.height = Math.max(1, height);
}

function drawTargetFrame(node, target, alphaMultiplier = 1) {
  const radius = target.radius ?? clamp(Math.min(target.width, target.height) * 0.045, 5, 28);
  const familyGlow = target.theme.family === "ice" ? target.effects.ice.glow : 1;
  const glow = target.effects.glowIntensity * familyGlow;
  node.frameBack.clear();
  node.frame.clear();
  node.frameHighlight.clear();
  if (target.widgetType === "background" && target.theme.family === "ice") return;
  if (target.theme.family === "ice") {
    // DOM owns the precise border/radius. Extra inset Pixi strokes produced
    // parallel seams at fractional editor scales; frost supplies irregular light.
    return;
  }
  node.frame
    .roundRect(1, 1, Math.max(1, target.width - 2), Math.max(1, target.height - 2), radius)
    .stroke({
      width: glow > 0.65 ? 2 : 1,
      color: target.theme.colors.primary,
      alpha: (0.16 + glow * 0.28) * alphaMultiplier,
    });
}

function resolveFogAmount(target) {
  if (target.theme.family === "ice") return target.effects.ice.fog;
  if (target.theme.family === "gladiator") return target.effects.gladiator.smoke;
  return target.effects.greek.fog;
}

function resolveShimmer(target, preset) {
  if (!preset.shimmer) return false;
  if (target.theme.family === "ice") {
    return target.effects.ice.shimmer && ICE_SHIMMER_TARGETS.has(target.widgetType);
  }
  if (target.theme.family === "gladiator") return target.effects.gladiator.metalShimmer;
  return target.effects.greek.marbleShimmer;
}

async function createTargetNode(target, layers, preset, debugEffect = "") {
  const random = createSeededRandom(hashString(`${target.id}:${target.widgetType}:${target.theme.id}`));
  // Independent stream keeps material variations stable without changing particles.
  const materialRandom = createSeededRandom(hashString(`${target.id}:ice-material`));
  const node = {
    id: target.id,
    target,
    behind: new Container(),
    inside: new Container(),
    foreground: new Container(),
    particleLayer: new Container(),
    particles: [],
    texture: null,
    edge: null,
    detail: null,
    decor: null,
    icicleClusters: [],
    edgeShards: [],
    frostCorners: [],
    clipMask: null,
    edgeMask: null,
    fog: null,
    fogSecondary: null,
    lightRay: null,
    shimmer: null,
    aura: null,
    burstSprites: [],
    frameBack: new Graphics(),
    frame: new Graphics(),
    frameHighlight: new Graphics(),
    pulse: new Graphics(),
    elapsed: randomRange(random, 0, 12),
    shimmerPeriod: randomRange(random, 11, 16),
    shimmerPhase: randomRange(random, 0, 8),
    debugEffect,
    material: {
      flipX: materialRandom() > 0.5,
      flipY: materialRandom() > 0.5,
      scale: randomRange(materialRandom, 1.04, 1.18),
      x: materialRandom(),
      y: materialRandom(),
      frost: randomRange(materialRandom, 0.86, 1.08),
    },
  };
  const targetLabel = `theme-fx:${target.id}`;
  const targetZIndex = Number(target.zIndex || 0);
  [
    [node.behind, "behind", target.widgetType === "background" ? layers.backgroundFX : layers.behindWidgetFX],
    [node.inside, "inside", target.widgetType === "background" ? layers.backgroundFX : layers.insideWidgetFX],
    [node.foreground, "foreground", target.widgetType === "background" ? layers.backgroundFX : layers.foregroundWidgetFX],
    [node.particleLayer, "particles", layers.globalParticles],
  ].forEach(([container, label, layer]) => {
    container.label = `${targetLabel}:${label}`;
    container.eventMode = "none";
    container.zIndex = targetZIndex;
    layer.addChild(container);
  });
  node.containers = [node.behind, node.inside, node.foreground, node.particleLayer];

  const [
    panelTexture,
    edgeTexture,
    detailTexture,
    decorTexture,
    fogTexture,
    particleTexture,
    cornerTexture,
    specularTexture,
    burstTexture,
  ] = await Promise.all([
    loadTexture(target.theme.textures.panel),
    target.theme.family === "ice" ? null : loadTexture(target.theme.textures.edge),
    loadTexture(target.theme.textures.detail),
    loadTexture(target.theme.textures.decor),
    loadTexture(target.theme.textures.fog),
    loadTexture(target.theme.textures.particle),
    loadTexture(target.theme.textures.corners),
    loadTexture(target.theme.textures.specular),
    loadTexture(target.theme.textures.burst),
  ]);

  node.texture = new Sprite(panelTexture);
  const iceHierarchy = ICE_PRIMARY_WEIGHT[target.widgetType] || 0.48;
  node.texture.alpha = target.theme.family === "ice" ? 0.07 + iceHierarchy * 0.08 : 0.065;
  node.texture.blendMode = target.theme.family === "gladiator" ? "overlay" : "screen";
  node.inside.addChild(node.texture);

  // Ice's old edge bitmap contains nested rectangular strokes. Corner frost has
  // a natural alpha falloff and does not compete with the DOM's single border.
  node.edge = target.theme.family === "ice" ? null : new Sprite(edgeTexture);
  if (node.edge) {
    node.edge.alpha = isForcedEffect(debugEffect, "frost") ? 1 : 0.075;
    node.edge.blendMode = "screen";
    node.foreground.addChild(node.edge);
  }

  const showDetail = target.theme.family !== "ice" || target.effects.ice.cracks;
  if (showDetail) {
    node.detail = new Sprite(detailTexture);
    const iceCrackAlpha = target.widgetType === "slideshow_frame"
      ? 0.12
      : target.widgetType === "slot_bingo"
        ? 0.045
        : 0.065;
    node.detail.alpha = isForcedEffect(debugEffect, "cracks")
      ? 1
      : target.theme.family === "ice" ? iceCrackAlpha * 2.5 : 0.055;
    node.detail.blendMode = target.theme.family === "ice"
      ? "screen"
      : target.theme.family === "gladiator" ? "overlay" : "multiply";
    node.inside.addChild(node.detail);
  }

  if (target.theme.family === "ice" && target.effects.ice.frost > 0.01 && target.widgetType !== "background") {
    getIceCornerViews(cornerTexture).forEach((texture, index) => {
      const sprite = new Sprite(texture);
      sprite.alpha = isForcedEffect(debugEffect, "frost") ? 1
        : target.effects.ice.frost * (0.68 + iceHierarchy * 0.24) * randomRange(materialRandom, 0.8, 1.1);
      sprite.blendMode = "screen";
      node.foreground.addChild(sprite);
      node.frostCorners.push({ sprite, index, scale: randomRange(materialRandom, 0.8, 1.1) });
    });
  }

  // A scene background is cold atmosphere, not another framed glass widget.
  if (target.theme.family === "ice" && target.widgetType === "background") {
    [node.edge, node.detail].filter(Boolean).forEach((sprite) => { sprite.visible = false; });
    node.texture.alpha = 0.055;
  }

  const showDecor = target.theme.family === "ice"
    && target.effects.ice.icicles
    && ICE_ICICLE_TARGETS.has(target.widgetType);
  // Static edge facets reuse the event texture; no ticker, filters or new atlas.
  // Two small groups occupy only the top/bottom material rim, away from labels.
  if (target.theme.family === "ice" && target.effects.ice.icicles
    && ["navbar", "rtp_stats"].includes(target.widgetType)) {
    const count = target.effects.quality === "low" ? 4 : 6;
    for (let index = 0; index < count; index += 1) {
      const sprite = new Sprite(burstTexture);
      sprite.anchor.set(0.5);
      sprite.alpha = randomRange(materialRandom, 0.38, 0.58);
      sprite.tint = 0xe4f4fa;
      sprite.rotation = randomRange(materialRandom, -0.8, 0.8);
      node.foreground.addChild(sprite);
      node.edgeShards.push({ sprite, position: index < count / 2 ? 0.14 : 0.76,
        offset: (index % (count / 2)) * 8, length: randomRange(materialRandom, 12, 18),
        bottom: index >= count / 2 });
    }
  }
  if (showDecor) {
    const count = target.widgetType === "navbar" ? 4 : 2;
    for (let index = 0; index < count; index += 1) {
      const sprite = new Sprite(decorTexture);
      sprite.alpha = isForcedEffect(debugEffect, "icicles") ? 1 : randomRange(materialRandom, 0.42, 0.64);
      sprite.blendMode = "normal";
      node.foreground.addChild(sprite);
      node.icicleClusters.push({
        sprite,
        position: (index + randomRange(materialRandom, 0.08, 0.7)) / count,
        length: randomRange(materialRandom, 0.5, 1),
        widthScale: randomRange(materialRandom, 0.65, 1.15),
        mirror: materialRandom() > 0.5,
      });
    }
  }

  const fogAmount = resolveFogAmount(target);
  const allowFog = target.theme.family !== "ice" || ICE_MIST_TARGETS.has(target.widgetType);
  if (fogAmount > 0.01 && allowFog) {
    node.fog = new Sprite(fogTexture);
    node.fog.alpha = isForcedEffect(debugEffect, "fog")
      ? 0.8
      : fogAmount * (target.theme.family === "gladiator" ? 0.1 : 0.2);
    node.fog.blendMode = target.theme.family === "ice" ? "normal" : "screen";
    node.inside.addChild(node.fog);
    if (preset.fogLayers > 1) {
      node.fogSecondary = new Sprite(fogTexture);
      node.fogSecondary.alpha = node.fog.alpha * 0.55;
      node.fogSecondary.blendMode = target.theme.family === "ice" ? "normal" : "screen";
      node.inside.addChild(node.fogSecondary);
    }
  }

  if (resolveShimmer(target, preset)) {
    node.shimmer = new Sprite(target.theme.family === "ice" ? specularTexture : Texture.WHITE);
    node.shimmer.tint = 0xffffff;
    node.shimmer.alpha = isForcedEffect(debugEffect, "shimmer")
      ? 1
      : 0.065 + target.effects.glowIntensity * 0.055;
    node.shimmer.rotation = 0.23;
    node.shimmer.blendMode = "screen";
    node.foreground.addChild(node.shimmer);
  }

  if (target.theme.family === "greek" && target.effects.greek.lightRays) {
    node.lightRay = new Sprite(Texture.WHITE);
    node.lightRay.tint = target.theme.colors.highlight;
    node.lightRay.alpha = 0.026;
    node.lightRay.rotation = -0.28;
    node.lightRay.blendMode = "screen";
    node.inside.addChild(node.lightRay);
  }

  if (preset.bloom && target.effects.glowIntensity > 0.05
    && !(target.theme.family === "ice" && target.widgetType === "background")) {
    node.aura = new Graphics();
    node.behind.addChild(node.aura);
  }
  node.behind.addChild(node.frameBack);
  node.foreground.addChild(node.frame);
  node.foreground.addChild(node.frameHighlight);
  node.foreground.addChild(node.pulse);

  node.clipMask = new Graphics();
  node.inside.addChild(node.clipMask);
  // One stencil boundary for the material group, rather than one per sprite.
  if (target.theme.family === "ice") node.inside.mask = node.clipMask;
  else [node.texture, node.detail, node.fog, node.fogSecondary, node.lightRay].filter(Boolean)
    .forEach((sprite) => { sprite.mask = node.clipMask; });
  if (node.shimmer) {
    node.foregroundMask = new Graphics();
    node.foreground.addChild(node.foregroundMask);
    node.shimmer.mask = node.foregroundMask;
  }
  if (target.theme.family === "ice") {
    // Keep branching edge frost away from labels and stat values.
    node.edgeMask = new Graphics();
    node.foreground.addChild(node.edgeMask);
    const frostLayer = new Container();
    node.foreground.addChildAt(frostLayer, 0);
    node.frostCorners.forEach(({ sprite }) => frostLayer.addChild(sprite));
    frostLayer.mask = node.edgeMask;
  }

  const particleCount = Math.max(
    0,
    Math.round(preset.maxParticles * (isForcedEffect(debugEffect, "snow") ? 1 : getParticleAmount(target))
      * (target.theme.family === "ice" ? clamp(Math.sqrt(target.width * target.height / 360000), 0.2, 1) : 1)),
  );
  for (let index = 0; index < particleCount; index += 1) {
    const sprite = new Sprite(particleTexture);
    sprite.anchor.set(0.5);
    sprite.blendMode = "screen";
    if (
      target.theme.family === "gladiator" &&
      index % 3 === 0 &&
      target.effects.gladiator.goldParticles > 0
    ) {
      sprite.tint = target.theme.colors.highlight;
    }
    const tierRoll = random();
    const tier = tierRoll < 0.66 ? "background" : tierRoll < 0.96 ? "midground" : "foreground";
    const particle = {
      sprite,
      tier,
      xRatio: random(),
      yRatio: random(),
      speed: tier === "background"
        ? randomRange(random, 0.38, 0.7)
        : tier === "midground" ? randomRange(random, 0.72, 1.05) : randomRange(random, 1.02, 1.28),
      drift: randomRange(random, -0.35, 0.35),
      phase: randomRange(random, 0, Math.PI * 2),
      scale: tier === "background"
        ? randomRange(random, 0.2, 0.48)
        : tier === "midground" ? randomRange(random, 0.5, 0.82) : randomRange(random, 0.88, 1.2),
    };
    node.particles.push(particle);
    node.particleLayer.addChild(sprite);
  }

  if (target.theme.family === "ice" && ICE_BURST_TARGETS.has(target.widgetType)) {
    const burstCount = target.effects.quality === "low" ? 5 : target.effects.quality === "ultra" ? 14 : 10;
    for (let index = 0; index < burstCount; index += 1) {
      const sprite = new Sprite(burstTexture);
      sprite.anchor.set(0.5);
      sprite.alpha = 0;
      sprite.blendMode = "screen";
      node.burstSprites.push(sprite);
      node.particleLayer.addChild(sprite);
    }
  }
  return node;
}

function resizeTargetNode(node, target) {
  const geometry = [target.x, target.y, target.width, target.height, target.radius, target.opacity, target.zIndex].join(":");
  if (node.geometry === geometry) return;
  node.geometry = geometry;
  node.target = target;
  node.containers.forEach((container) => {
    container.position.set(target.x, target.y);
    container.zIndex = Number(target.zIndex || 0);
    container.alpha = clamp(Number(target.opacity ?? 1), 0, 1);
  });
  setSpriteBounds(node.texture, target.width, target.height);
  if (node.edge) setSpriteBounds(node.edge, target.width, target.height);
  if (node.detail) setSpriteBounds(node.detail, target.width, target.height);
  node.frostCorners.forEach(({ sprite, index, scale }) => {
    // A tall sidebar must not stretch its frost across stat labels. Each corner
    // retains its physical proportions and fades naturally into the clear glass.
    const size = Math.min(82, target.width * 0.22, target.height * 0.46) * scale;
    setSpriteBounds(sprite, size, size);
    sprite.position.set(index % 2 ? target.width - size : 0, index > 1 ? target.height - size : 0);
  });
  if (target.theme.family === "ice") {
    const { flipX, flipY, scale, x, y } = node.material;
    [node.texture, node.detail, node.edge].filter(Boolean).forEach((sprite, index) => {
      // Keep edge accumulation attached to the frame; crop only interior material.
      const interior = sprite === node.texture || sprite === node.detail;
      const factor = interior ? scale : 1;
      const w = target.width * factor;
      const h = target.height * factor;
      const mirrorX = index % 2 ? !flipX : flipX;
      const mirrorY = index % 2 ? !flipY : flipY;
      sprite.anchor.set(mirrorX ? 1 : 0, mirrorY ? 1 : 0);
      sprite.scale.set((mirrorX ? -1 : 1) * w / sprite.texture.width, (mirrorY ? -1 : 1) * h / sprite.texture.height);
      sprite.position.set(interior ? -(w - target.width) * x : 0, interior ? -(h - target.height) * y : 0);
    });
  }
  node.icicleClusters.forEach(({ sprite, position, length, widthScale, mirror }) => {
    const navbar = target.widgetType === "navbar";
    setSpriteBounds(sprite, Math.min(navbar ? 110 : 65, target.width * 0.22) * widthScale, (navbar ? 28 : 17) * length);
    sprite.anchor.x = mirror ? 1 : 0;
    sprite.scale.x = Math.abs(sprite.scale.x) * (mirror ? -1 : 1);
    sprite.position.set(Math.min(target.width - sprite.width - 3, target.width * position), navbar ? target.height - 3 : 1);
  });
  node.edgeShards.forEach(({ sprite, position, offset, length, bottom }) => {
    const height = Math.min(length, target.height * 0.22);
    setSpriteBounds(sprite, height * 0.48, height);
    sprite.position.set(target.width * position + offset, bottom ? target.height - height * 0.7 - 1 : height * 0.7 + 1);
  });
  if (node.decor) {
    const isNavbar = target.widgetType === "navbar";
    setSpriteBounds(
      node.decor,
      target.width,
      isNavbar ? Math.min(52, Math.max(24, target.height * 0.86)) : Math.min(target.height * 0.12, 48),
    );
    node.decor.position.set(0, isNavbar ? Math.max(0, target.height - 7) : 0);
  }
  if (node.fog) {
    setSpriteBounds(node.fog, target.width * 1.18, target.height * 0.7);
    node.fog.position.set(-target.width * 0.06, target.height * 0.28);
  }
  if (node.fogSecondary) {
    setSpriteBounds(node.fogSecondary, target.width * 1.2, target.height * 0.54);
    node.fogSecondary.position.set(-target.width * 0.1, target.height * 0.04);
  }
  if (node.shimmer) {
    setSpriteBounds(node.shimmer, Math.max(42, target.width * 0.22), target.height * 1.32);
    if (target.theme.family === "ice") node.shimmer.anchor.set(0.5);
    else node.shimmer.pivot.set(node.shimmer.width / 2, node.shimmer.height / 2);
    node.shimmer.y = target.height * 0.5;
  }
  if (node.lightRay) {
    setSpriteBounds(node.lightRay, Math.max(28, target.width * 0.16), target.height * 1.4);
    node.lightRay.pivot.set(node.lightRay.width / 2, node.lightRay.height / 2);
    node.lightRay.position.set(target.width * 0.68, target.height * 0.42);
  }
  const radius = target.radius ?? clamp(Math.min(target.width, target.height) * 0.045, 5, 28);
  node.clipMask.clear()
    .roundRect(2, 2, Math.max(1, target.width - 4), Math.max(1, target.height - 4), Math.max(3, radius - 1))
    .fill({ color: 0xffffff });
  if (node.foregroundMask) {
    node.foregroundMask.clear()
      .roundRect(2, 2, Math.max(1, target.width - 4), Math.max(1, target.height - 4), Math.max(3, radius - 1))
      .fill({ color: 0xffffff });
  }
  if (node.edgeMask) {
    // Clip only the outside. Cutting a rectangular hole through translucent
    // frost creates a visible inner box; the texture already clears its center.
    node.edgeMask.clear()
      .roundRect(1, 1, Math.max(1, target.width - 2), Math.max(1, target.height - 2), Math.max(0, radius - 1))
      .fill(0xffffff);
  }
  drawTargetFrame(node, target, isForcedEffect(node.debugEffect, "glow") ? 2.4 : 1);
  if (node.aura) {
    const radius = clamp(Math.min(target.width, target.height) * 0.045, 5, 28);
    node.aura.clear().roundRect(3, 3, Math.max(1, target.width - 6), Math.max(1, target.height - 6), radius)
      .stroke({
        width: isForcedEffect(node.debugEffect, "glow") ? 10 : 6,
        color: target.theme.colors.primary,
        alpha: isForcedEffect(node.debugEffect, "glow") ? 0.9 : target.effects.glowIntensity * 0.08,
      });
  }
  node.pulse.clear();
  node.pulse
    .roundRect(2, 2, Math.max(1, target.width - 4), Math.max(1, target.height - 4), clamp(target.height * 0.05, 5, 24))
    .stroke({ width: 2, color: target.theme.colors.highlight, alpha: 0.92 });
  node.pulse.alpha = 0;
  node.pulse.pivot.set(target.width / 2, target.height / 2);
  node.pulse.position.set(target.width / 2, target.height / 2);

  node.particles.forEach((particle) => {
    const size = clamp(Math.min(target.width, target.height) * 0.018 * particle.scale, 2, 13);
    particle.sprite.width = size;
    particle.sprite.height = size;
    particle.sprite.x = particle.xRatio * target.width;
    particle.sprite.y = particle.yRatio * target.height;
    particle.sprite.alpha = isForcedEffect(node.debugEffect, "snow")
      ? 1
      : particle.tier === "background"
        ? 0.09 + particle.scale * 0.11
        : particle.tier === "midground" ? 0.14 + particle.scale * 0.17 : 0.19 + particle.scale * 0.16;
  });
  node.burstSprites.forEach((sprite, index) => {
    const size = clamp(Math.min(target.width, target.height) * (0.023 + index * 0.0015), 7, 20);
    sprite.width = size;
    sprite.height = size * 1.7;
    sprite.position.set(target.width / 2, target.height / 2);
    sprite.alpha = 0;
  });
}

function updateTargetNode(node, ticker) {
  const target = node.target;
  const family = target.theme.family;
  const qualityRank = QUALITY_RANK[target.effects.quality];
  const speed = target.effects.animationSpeed;
  const seconds = Math.min(ticker.deltaMS, 50) / 1000;
  node.elapsed += seconds * speed;

  if (node.shimmer) {
    if (family === "ice") {
      const sweepDuration = 1.8;
      const progress = (node.elapsed + node.shimmerPhase) % node.shimmerPeriod;
      const sweepRatio = clamp(progress / sweepDuration, 0, 1);
      node.shimmer.x = -node.shimmer.width + sweepRatio * (target.width + node.shimmer.width * 2);
      node.shimmer.alpha = progress < sweepDuration
        ? Math.sin(sweepRatio * Math.PI) * (
          isForcedEffect(node.debugEffect, "shimmer")
            ? 1
            : 0.06 + target.effects.glowIntensity * 0.055
        )
        : 0;
    } else {
      const travel = target.width + node.shimmer.width * 2;
      node.shimmer.x = -node.shimmer.width + ((node.elapsed * target.width * 0.08) % travel);
    }
  }
  if (node.fog) {
    node.fog.x = -target.width * 0.06 + (qualityRank > QUALITY_RANK.low ? Math.sin(node.elapsed * 0.18) * target.width * 0.035 : 0);
    node.fog.alpha = isForcedEffect(node.debugEffect, "fog")
      ? 0.8
      : resolveFogAmount(target) * (qualityRank > QUALITY_RANK.low ? 0.17 + Math.sin(node.elapsed * 0.24) * 0.025 : 0.11)
        * (family === "ice" && target.widgetType === "background" ? 1.45 : 1);
  }
  if (node.fogSecondary) {
    node.fogSecondary.x = -target.width * 0.1 - Math.sin(node.elapsed * 0.12) * target.width * 0.028;
    node.fogSecondary.alpha = isForcedEffect(node.debugEffect, "fog")
      ? 0.58
      : resolveFogAmount(target) * (0.07 + Math.cos(node.elapsed * 0.17) * 0.012);
  }

  if (
    family === "gladiator" &&
    target.effects.gladiator.heatDistortion &&
    qualityRank >= QUALITY_RANK.ultra
  ) {
    const heat = Math.sin(node.elapsed * 0.7) * 0.0018;
    node.texture.skew.x = heat;
    node.texture.scale.y = 1 + Math.abs(heat) * 1.8;
  }
  if (family === "greek" && target.effects.greek.torchFlicker > 0 && qualityRank > QUALITY_RANK.low) {
    const flicker = target.effects.greek.torchFlicker;
    node.frame.alpha = 0.78 + Math.sin(node.elapsed * 2.7) * flicker * 0.14;
  }
  if (node.lightRay) {
    node.lightRay.alpha = qualityRank > QUALITY_RANK.low
      ? 0.02 + (Math.sin(node.elapsed * 0.32) + 1) * 0.009
      : 0.02;
    node.lightRay.x = target.width * 0.68 + (qualityRank > QUALITY_RANK.low ? Math.sin(node.elapsed * 0.19) * target.width * 0.035 : 0);
  }

  node.particles.forEach((particle) => {
    if (family === "ice") {
      particle.yRatio += seconds * 0.025 * particle.speed * speed;
      particle.xRatio += Math.sin(node.elapsed * 0.55 + particle.phase) * seconds * 0.006;
      if (particle.yRatio > 1.04) particle.yRatio = -0.04;
    } else {
      particle.yRatio -= seconds * (family === "gladiator" ? 0.04 : 0.012) * particle.speed * speed;
      particle.xRatio += Math.sin(node.elapsed * 0.4 + particle.phase) * seconds * 0.004 + particle.drift * seconds * 0.002;
      if (particle.yRatio < -0.04) particle.yRatio = 1.04;
    }
    if (particle.xRatio > 1.04) particle.xRatio = -0.04;
    if (particle.xRatio < -0.04) particle.xRatio = 1.04;
    particle.sprite.x = particle.xRatio * target.width;
    particle.sprite.y = particle.yRatio * target.height;
    particle.sprite.rotation += seconds * particle.drift;
  });
}

export async function createPixiThemeEngine({
  canvas,
  width,
  height,
  targets = [],
  debugEffect = "",
}) {
  const quality = getHighestQuality(targets);
  const preset = getEffectQualityPreset(quality);
  const app = new Application();
  await app.init({
    canvas,
    width: Math.max(1, width),
    height: Math.max(1, height),
    backgroundAlpha: 0,
    antialias: quality !== "low",
    autoDensity: true,
    resolution: getEffectResolution(quality, window.devicePixelRatio),
    preference: "webgl",
    powerPreference: "high-performance",
    clearBeforeRender: true,
  });

  app.stage.eventMode = "none";
  app.ticker.maxFPS = preset.fps;
  const layers = {};
  [
    "backgroundFX",
    "behindWidgetFX",
    "insideWidgetFX",
    "foregroundWidgetFX",
    "globalParticles",
  ].forEach((name, index) => {
    const layer = new Container();
    layer.label = name;
    layer.eventMode = "none";
    layer.sortableChildren = true;
    layer.zIndex = index * 10;
    layers[name] = layer;
    app.stage.addChild(layer);
  });
  app.stage.sortableChildren = true;

  let destroyed = false;
  let viewportWidth = Math.max(1, width);
  let viewportHeight = Math.max(1, height);
  let currentSignature = "";
  let currentQuality = quality;
  let targetNodes = new Map();
  let rebuildToken = 0;
  let transition = null;
  let activeTargets = targets;
  let pendingUpdate = null;
  let renderedFrames = 0;
  let lastEvent = "";

  const tickerHandler = (ticker) => {
    renderedFrames += 1;
    targetNodes.forEach((node) => {
      const { x, y, width: w, height: h, opacity } = node.target;
      const visible = opacity > 0 && x < viewportWidth && y < viewportHeight && x + w > 0 && y + h > 0;
      node.containers.forEach((container) => { container.visible = visible; });
      if (visible) updateTargetNode(node, ticker);
    });
  };
  app.ticker.add(tickerHandler);

  async function rebuild(nextTargets, animate) {
    const token = ++rebuildToken;
    const nextQuality = getHighestQuality(nextTargets);
    const nextPreset = getEffectQualityPreset(nextQuality);
    const removeNodes = () => {
      targetNodes.forEach((node) => {
        gsap.killTweensOf(node.pulse);
        gsap.killTweensOf(node.pulse.scale);
        node.burstSprites.forEach((sprite) => gsap.killTweensOf(sprite));
        node.particles.forEach(({ sprite }) => gsap.killTweensOf(sprite));
        node.containers.forEach((container) => {
          container.destroy({ children: true, texture: false, textureSource: false });
        });
      });
      targetNodes = new Map();
    };

    if (animate) {
      transition?.kill();
      await new Promise((resolve) => {
        transition = gsap.to(app.stage, {
          alpha: 0,
          duration: 0.2,
          ease: "power1.out",
          onComplete: resolve,
          onInterrupt: resolve,
        });
      });
    }
    if (destroyed || token !== rebuildToken) return;
    removeNodes();
    if (nextQuality !== currentQuality) {
      app.renderer.resize(
        viewportWidth,
        viewportHeight,
        getEffectResolution(nextQuality, window.devicePixelRatio),
      );
    }
    currentQuality = nextQuality;
    app.ticker.maxFPS = nextPreset.fps;
    const created = await Promise.all(
      nextTargets.map(async (target) => {
        const targetPreset = getEffectQualityPreset(target.effects.quality);
        const node = await createTargetNode(target, layers, targetPreset, debugEffect);
        resizeTargetNode(node, target);
        return [target.id, node];
      }),
    );
    if (destroyed || token !== rebuildToken) {
      created.forEach(([, node]) => {
        node.containers.forEach((container) => {
          container.destroy({ children: true, texture: false, textureSource: false });
        });
      });
      return;
    }
    targetNodes = new Map(created);
    app.stage.alpha = animate ? 0 : 1;
    if (animate) {
      transition = gsap.to(app.stage, {
        alpha: 1,
        duration: 0.34,
        ease: "power1.out",
      });
    }
  }

  async function updateTargets(nextTargets, options = {}) {
    if (destroyed) return;
    activeTargets = nextTargets;
    const signature = targetSignature(nextTargets);
    if (signature === currentSignature && pendingUpdate) {
      await pendingUpdate;
      if (destroyed || signature !== currentSignature) return;
      activeTargets.forEach((target) => {
        const node = targetNodes.get(target.id);
        if (node) resizeTargetNode(node, target);
      });
      return;
    }
    if (signature === currentSignature && targetNodes.size === nextTargets.length) {
      nextTargets.forEach((target) => {
        const node = targetNodes.get(target.id);
        if (node) resizeTargetNode(node, target);
      });
      return;
    }
    const animate = currentSignature !== "" && options.transition !== false;
    currentSignature = signature;
    const pending = rebuild(nextTargets, animate);
    pendingUpdate = pending;
    try {
      await pending;
    } finally {
      if (pendingUpdate === pending) pendingUpdate = null;
    }
  }

  function resize(nextWidth, nextHeight) {
    if (destroyed) return;
    if (viewportWidth === Math.max(1, nextWidth) && viewportHeight === Math.max(1, nextHeight)) return;
    viewportWidth = Math.max(1, nextWidth);
    viewportHeight = Math.max(1, nextHeight);
    app.renderer.resize(viewportWidth, viewportHeight);
  }

  function burst(targetId, event = {}) {
    const node = targetNodes.get(targetId);
    if (!node || destroyed || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    lastEvent = event.kind || "completion";
    gsap.killTweensOf(node.pulse);
    gsap.killTweensOf(node.pulse.scale);
    const ice = node.target.theme.family === "ice";
    node.pulse.alpha = ice ? 0.65 : 0.92;
    node.pulse.scale.set(ice ? 1 : 0.96);
    gsap.to(node.pulse, { alpha: 0, duration: 0.58, ease: "power2.out" });
    if (!ice) gsap.to(node.pulse.scale, { x: 1.035, y: 1.035, duration: .58, ease: "power2.out" });
    const originX = node.target.width * clamp(event.x ?? 0.5, 0.08, 0.92);
    const originY = node.target.height * clamp(event.y ?? 0.5, 0.08, 0.92);
    if (node.burstSprites.length) {
      node.burstSprites.forEach((sprite, index) => {
        const angle = (Math.PI * 2 * index) / node.burstSprites.length - Math.PI / 2 + Math.sin(index * 7) * 0.22;
        const distance = Math.min(node.target.width, node.target.height) * (0.1 + (index % 4) * 0.032);
        gsap.killTweensOf(sprite);
        sprite.position.set(originX, originY);
        sprite.rotation = angle + Math.PI / 2;
        sprite.alpha = 0.64 + (index % 3) * 0.09;
        // Preserve pixel sizing from resizeTargetNode; texture-scale 0.7 used
        // to expand tiny shards to the source bitmap's dimensions.
        const size = 5 + (index % 4) * 2.4;
        sprite.width = size;
        sprite.height = size * (1.35 + (index % 3) * 0.3);
        gsap.to(sprite, {
          x: clamp(originX + Math.cos(angle) * distance, size, node.target.width - size),
          y: clamp(originY + Math.sin(angle) * distance + distance * 0.16, size, node.target.height - size),
          rotation: sprite.rotation + (index % 2 ? 0.7 : -0.7),
          alpha: 0,
          duration: (event.kind === "tournament" ? 0.85 : 0.52) + (index % 3) * 0.07,
          ease: "power3.out",
        });
      });
    } else {
      node.particles.slice(0, Math.min(12, node.particles.length)).forEach((particle, index) => {
        const angle = (Math.PI * 2 * index) / 12;
        particle.xRatio = 0.5 + Math.cos(angle) * 0.08;
        particle.yRatio = 0.5 + Math.sin(angle) * 0.08;
        particle.sprite.alpha = 0.65;
        gsap.to(particle.sprite, { alpha: 0.12, duration: 0.7, ease: "power2.out" });
      });
    }
  }

  function setVisible(visible) {
    if (destroyed) return;
    if (visible) app.ticker.start();
    else app.ticker.stop();
  }

  function getStats() {
    let particleCount = 0;
    targetNodes.forEach((node) => {
      particleCount += node.particles.length;
    });
    return {
      fps: Math.round(app.ticker.FPS || 0),
      particles: particleCount,
      width: app.renderer.width,
      height: app.renderer.height,
      resolution: app.renderer.resolution,
      targets: activeTargets.length,
      quality: currentQuality,
      debugEffect,
      frames: renderedFrames,
      lastEvent,
      layerOrder: app.stage.children.map((layer) => layer.label),
    };
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    rebuildToken += 1;
    transition?.kill();
    app.ticker.remove(tickerHandler);
    targetNodes.forEach((node) => {
      gsap.killTweensOf(node.pulse);
      gsap.killTweensOf(node.pulse.scale);
      node.burstSprites.forEach((sprite) => gsap.killTweensOf(sprite));
      node.particles.forEach(({ sprite }) => gsap.killTweensOf(sprite));
    });
    targetNodes.clear();
    app.destroy({ removeView: false }, { children: true, texture: false, textureSource: false });
  }

  await updateTargets(targets, { transition: false });
  return { updateTargets, resize, burst, setVisible, getStats, destroy };
}
