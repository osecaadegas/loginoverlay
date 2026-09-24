import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Texture,
} from "pixi.js";
import { gsap } from "gsap";
import {
  getEffectQualityPreset,
  getEffectResolution,
  normalizeEffectQuality,
} from "../presets/performancePresets";

const QUALITY_RANK = Object.freeze({ low: 0, balanced: 1, ultra: 2 });
const TARGET_LAYER = Object.freeze({
  background: "backgroundFX",
  navbar: "navbarFX",
  bonus_hunt: "bonusHuntFX",
  slot_bingo: "bingoFX",
  bets: "betsFX",
  chat: "chatFX",
  slideshow_frame: "mediaFX",
});
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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const randomRange = (min, max) => min + Math.random() * (max - min);

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

function drawTargetFrame(graphics, target, alphaMultiplier = 1) {
  const radius = clamp(Math.min(target.width, target.height) * 0.045, 5, 28);
  const familyGlow = target.theme.family === "ice" ? target.effects.ice.glow : 1;
  const glow = target.effects.glowIntensity * familyGlow;
  graphics.clear();
  graphics
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
  if (target.theme.family === "ice") return target.effects.ice.shimmer;
  if (target.theme.family === "gladiator") return target.effects.gladiator.metalShimmer;
  return target.effects.greek.marbleShimmer;
}

async function createTargetNode(target, layer, preset) {
  const node = {
    id: target.id,
    target,
    container: new Container(),
    particles: [],
    texture: null,
    edge: null,
    detail: null,
    decor: null,
    fog: null,
    fogSecondary: null,
    lightRay: null,
    shimmer: null,
    aura: null,
    frame: new Graphics(),
    pulse: new Graphics(),
    elapsed: Math.random() * 10,
  };
  node.container.label = `theme-fx:${target.id}`;
  node.container.eventMode = "none";
  layer.addChild(node.container);

  const [panelTexture, edgeTexture, detailTexture, decorTexture, fogTexture, particleTexture] = await Promise.all([
    loadTexture(target.theme.textures.panel),
    loadTexture(target.theme.textures.edge),
    loadTexture(target.theme.textures.detail),
    loadTexture(target.theme.textures.decor),
    loadTexture(target.theme.textures.fog),
    loadTexture(target.theme.textures.particle),
  ]);

  node.texture = new Sprite(panelTexture);
  node.texture.alpha = target.theme.family === "ice" ? 0.085 : 0.065;
  node.texture.blendMode = target.theme.family === "gladiator" ? "overlay" : "screen";
  node.container.addChild(node.texture);

  node.edge = new Sprite(edgeTexture);
  node.edge.alpha = target.theme.family === "ice"
    ? 0.13 + target.effects.ice.frost * 0.12
    : 0.075;
  node.edge.blendMode = "screen";
  node.container.addChild(node.edge);

  const showDetail = target.theme.family !== "ice" || target.effects.ice.cracks;
  if (showDetail) {
    node.detail = new Sprite(detailTexture);
    node.detail.alpha = target.theme.family === "ice" ? 0.11 : 0.055;
    node.detail.blendMode = target.theme.family === "gladiator" ? "overlay" : "multiply";
    node.container.addChild(node.detail);
  }

  const showDecor = target.theme.family === "ice" && target.effects.ice.icicles;
  if (showDecor) {
    node.decor = new Sprite(decorTexture);
    node.decor.alpha = 0.22;
    node.decor.blendMode = "screen";
    node.container.addChild(node.decor);
  }

  const fogAmount = resolveFogAmount(target);
  if (fogAmount > 0.01) {
    node.fog = new Sprite(fogTexture);
    node.fog.alpha = fogAmount * (target.theme.family === "gladiator" ? 0.1 : 0.13);
    node.fog.blendMode = "screen";
    node.container.addChild(node.fog);
    if (preset.fogLayers > 1) {
      node.fogSecondary = new Sprite(fogTexture);
      node.fogSecondary.alpha = node.fog.alpha * 0.55;
      node.fogSecondary.blendMode = "screen";
      node.container.addChild(node.fogSecondary);
    }
  }

  if (resolveShimmer(target, preset)) {
    node.shimmer = new Sprite(Texture.WHITE);
    node.shimmer.tint = target.theme.colors.highlight;
    node.shimmer.alpha = 0.035 + target.effects.glowIntensity * 0.035;
    node.shimmer.rotation = 0.23;
    node.shimmer.blendMode = "screen";
    node.container.addChild(node.shimmer);
  }

  if (target.theme.family === "greek" && target.effects.greek.lightRays) {
    node.lightRay = new Sprite(Texture.WHITE);
    node.lightRay.tint = target.theme.colors.highlight;
    node.lightRay.alpha = 0.026;
    node.lightRay.rotation = -0.28;
    node.lightRay.blendMode = "screen";
    node.container.addChild(node.lightRay);
  }

  if (preset.bloom && target.effects.glowIntensity > 0.05) {
    node.aura = new Graphics();
    node.container.addChild(node.aura);
  }
  node.container.addChild(node.frame);
  node.container.addChild(node.pulse);

  const particleCount = Math.max(
    0,
    Math.round(preset.maxParticles * getParticleAmount(target)),
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
    const particle = {
      sprite,
      xRatio: Math.random(),
      yRatio: Math.random(),
      speed: randomRange(0.6, 1.25),
      drift: randomRange(-0.35, 0.35),
      phase: randomRange(0, Math.PI * 2),
      scale: randomRange(0.35, 1),
    };
    node.particles.push(particle);
    node.container.addChild(sprite);
  }
  return node;
}

function resizeTargetNode(node, target) {
  node.target = target;
  node.container.position.set(target.x, target.y);
  setSpriteBounds(node.texture, target.width, target.height);
  setSpriteBounds(node.edge, target.width, target.height);
  if (node.detail) setSpriteBounds(node.detail, target.width, target.height);
  if (node.decor) {
    setSpriteBounds(node.decor, target.width, Math.min(target.height * 0.22, 72));
    node.decor.position.set(0, 0);
  }
  if (node.fog) {
    setSpriteBounds(node.fog, target.width * 1.12, target.height * 0.64);
    node.fog.position.set(-target.width * 0.06, target.height * 0.28);
  }
  if (node.fogSecondary) {
    setSpriteBounds(node.fogSecondary, target.width * 1.2, target.height * 0.54);
    node.fogSecondary.position.set(-target.width * 0.1, target.height * 0.04);
  }
  if (node.shimmer) {
    setSpriteBounds(node.shimmer, Math.max(24, target.width * 0.12), target.height * 1.25);
    node.shimmer.pivot.set(node.shimmer.width / 2, node.shimmer.height / 2);
    node.shimmer.y = target.height * 0.5;
  }
  if (node.lightRay) {
    setSpriteBounds(node.lightRay, Math.max(28, target.width * 0.16), target.height * 1.4);
    node.lightRay.pivot.set(node.lightRay.width / 2, node.lightRay.height / 2);
    node.lightRay.position.set(target.width * 0.68, target.height * 0.42);
  }
  drawTargetFrame(node.frame, target);
  if (node.aura) {
    const radius = clamp(Math.min(target.width, target.height) * 0.045, 5, 28);
    node.aura.clear().roundRect(3, 3, Math.max(1, target.width - 6), Math.max(1, target.height - 6), radius)
      .stroke({ width: 6, color: target.theme.colors.primary, alpha: target.effects.glowIntensity * 0.055 });
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
    particle.sprite.alpha = 0.08 + particle.scale * 0.2;
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
    const travel = target.width + node.shimmer.width * 2;
    node.shimmer.x = -node.shimmer.width + ((node.elapsed * target.width * 0.08) % travel);
  }
  if (node.fog) {
    node.fog.x = -target.width * 0.06 + (qualityRank > QUALITY_RANK.low ? Math.sin(node.elapsed * 0.18) * target.width * 0.035 : 0);
    node.fog.alpha = resolveFogAmount(target) * (qualityRank > QUALITY_RANK.low ? 0.08 + Math.sin(node.elapsed * 0.24) * 0.015 : 0.07);
  }
  if (node.fogSecondary) {
    node.fogSecondary.x = -target.width * 0.1 - Math.sin(node.elapsed * 0.12) * target.width * 0.028;
    node.fogSecondary.alpha = resolveFogAmount(target) * (0.035 + Math.cos(node.elapsed * 0.17) * 0.008);
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

export async function createPixiThemeEngine({ canvas, width, height, targets = [] }) {
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
    "navbarFX",
    "bonusHuntFX",
    "bingoFX",
    "betsFX",
    "chatFX",
    "mediaFX",
    "foregroundFX",
    "globalParticles",
  ].forEach((name) => {
    const layer = new Container();
    layer.label = name;
    layer.eventMode = "none";
    layers[name] = layer;
    app.stage.addChild(layer);
  });

  let destroyed = false;
  let viewportWidth = Math.max(1, width);
  let viewportHeight = Math.max(1, height);
  let currentSignature = "";
  let currentQuality = quality;
  let targetNodes = new Map();
  let rebuildToken = 0;
  let transition = null;
  let activeTargets = targets;

  const tickerHandler = (ticker) => {
    targetNodes.forEach((node) => updateTargetNode(node, ticker));
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
        node.container.destroy({ children: true, texture: false, textureSource: false });
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
        const layer = layers[TARGET_LAYER[target.widgetType] || "foregroundFX"];
        const targetPreset = getEffectQualityPreset(target.effects.quality);
        const node = await createTargetNode(target, layer, targetPreset);
        resizeTargetNode(node, target);
        return [target.id, node];
      }),
    );
    if (destroyed || token !== rebuildToken) {
      created.forEach(([, node]) => node.container.destroy({ children: true, texture: false, textureSource: false }));
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
    if (signature === currentSignature && targetNodes.size === nextTargets.length) {
      nextTargets.forEach((target) => {
        const node = targetNodes.get(target.id);
        if (node) resizeTargetNode(node, target);
      });
      return;
    }
    const animate = currentSignature !== "" && options.transition !== false;
    currentSignature = signature;
    await rebuild(nextTargets, animate);
  }

  function resize(nextWidth, nextHeight) {
    if (destroyed) return;
    viewportWidth = Math.max(1, nextWidth);
    viewportHeight = Math.max(1, nextHeight);
    app.renderer.resize(viewportWidth, viewportHeight);
  }

  function burst(targetId) {
    const node = targetNodes.get(targetId);
    if (!node || destroyed) return;
    gsap.killTweensOf(node.pulse);
    gsap.killTweensOf(node.pulse.scale);
    node.pulse.alpha = 0.92;
    node.pulse.scale.set(0.96);
    gsap.to(node.pulse, { alpha: 0, duration: 0.58, ease: "power2.out" });
    gsap.to(node.pulse.scale, { x: 1.035, y: 1.035, duration: 0.58, ease: "power2.out" });
    node.particles.slice(0, Math.min(12, node.particles.length)).forEach((particle, index) => {
      const angle = (Math.PI * 2 * index) / 12;
      particle.xRatio = 0.5 + Math.cos(angle) * 0.08;
      particle.yRatio = 0.5 + Math.sin(angle) * 0.08;
      particle.sprite.alpha = 0.65;
      gsap.to(particle.sprite, { alpha: 0.12, duration: 0.7, ease: "power2.out" });
    });
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
    });
    targetNodes.clear();
    app.destroy({ removeView: false }, { children: true, texture: false, textureSource: false });
  }

  await updateTargets(targets, { transition: false });
  return { updateTargets, resize, burst, setVisible, getStats, destroy };
}
