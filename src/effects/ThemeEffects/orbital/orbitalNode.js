import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { gsap } from 'gsap';

const SVG_NS = 'http://www.w3.org/2000/svg';
const majorEvent = kind => ['super', 'extreme', 'max', 'insane'].includes(kind);
const numberSeed = text => [...text].reduce((n, ch) => (Math.imul(n, 31) + ch.charCodeAt(0)) >>> 0, 17);

/** A target node of the existing engine, not another renderer or ticker. */
export function createOrbitalNode(target, layers, host, budget) {
  const foreground = new Container();
  foreground.eventMode = 'none';
  foreground.zIndex = target.zIndex;
  layers.foregroundWidgetFX.addChild(foreground);
  const frame = new Graphics();
  const pulse = new Graphics();
  const scan = new Graphics();
  const transmissionRing = new Graphics();
  const transmissionScan = new Graphics();
  foreground.addChild(frame, pulse, scan, transmissionRing, transmissionScan);
  transmissionRing.alpha = transmissionScan.alpha = 0;
  pulse.alpha = 0;
  scan.alpha = 0;
  const node = {
    target, id: target.id, foreground, frame, pulse, scan, transmissionRing, transmissionScan, containers: [foreground],
    particles: [], burstSprites: [], starCount: 0, elapsed: 0,
    ambient: gsap.timeline({ paused: true, repeat: -1, yoyo: true }),
    eventTimeline: null, eventTime: 0, budget,
  };
  const root = host?.querySelector(`[data-effect-target-id="${CSS.escape(target.id)}"]`);
  node.root = root;
  const space = target.effects.orbital;
  const background = target.widgetType === 'background';
  if (background) {
    const environment = root?.querySelector('[data-orbital-environment]');
    node.environment = environment;
    // No environment on the foreground canvas. These layers remain INSIDE the
    // background widget, so neither Earth nor stars can obscure a game source.
    if (!environment || environment.dataset.orbitalEnvironment === 'off') return node;
    node.stars = environment.querySelector('[data-orbital-stars]');
    const seed = numberSeed(target.id);
    const count = space.stars ? budget.count : 0;
    const hasEarth = space.environment !== 'deep_space' && space.earthVisibility > 0;
    if (node.stars) {
      const groups = [0, 1, 2].map(() => {
        const group = document.createElementNS(SVG_NS, 'g');
        node.stars.appendChild(group);
        return group;
      });
      node.starGroups = groups;
      for (let index = 0; index < count; index++) {
        const star = document.createElementNS(SVG_NS, 'circle');
        star.setAttribute('cx', String((seed + index * 827) % 1920));
        star.setAttribute('cy', String((seed + index * 337) % (hasEarth ? 355 : 1080)));
        star.setAttribute('r', String(0.55 + (index % 4) * .32));
        star.setAttribute('opacity', String(.18 + (index % 5) * .1));
        groups[index % 3].appendChild(star);
      }
      node.starCount = count;
      if (space.backgroundAnimation && target.effects.enabled) groups.forEach((group, index) => node.ambient.to(group, { x: 5 + index * 4, y: -(2 + index), duration: 100, ease: 'sine.inOut' }, 0));
    }
    const earth = environment.querySelector('[data-orbital-drift="earth"]');
    const clouds = environment.querySelector('[data-orbital-drift="clouds"]');
    const nebula = environment.querySelector('[data-orbital-drift="nebula"]');
    if (space.backgroundAnimation && target.effects.enabled) {
      if (earth) node.ambient.to(earth, { xPercent: -.5, yPercent: .25, duration: 120, ease: 'sine.inOut' }, 0);
      if (clouds) node.ambient.to(clouds, { xPercent: .75, duration: 120, ease: 'sine.inOut' }, 0);
      if (nebula) node.ambient.to(nebula, { opacity: space.intensity * .65, duration: 80, ease: 'sine.inOut' }, 0);
    }
  } else if (space.particles) {
    // Reuse Pixi's white texture. Dust travels only along the rim, away from
    // artwork, text and gameplay, using the scene's shared particle budget.
    for (let index = 0; index < Math.min(budget.count, 12); index++) {
      const sprite = new Sprite(Texture.WHITE);
      sprite.width = index % 3 === 0 ? 2 : 1;
      sprite.height = 1;
      sprite.tint = target.theme.colors.highlight;
      sprite.alpha = .05 + (index % 3) * .04;
      foreground.addChild(sprite);
      node.particles.push({ sprite, phase: (index * .6180339) % 1 });
    }
  }
  return node;
}

export function resizeOrbitalNode(node, target) {
  node.target = target;
  const key = [target.x, target.y, target.width, target.height, target.radius, target.opacity].join(':');
  if (node.geometry === key) return;
  node.geometry = key;
  const { width: w, height: h } = target;
  node.foreground.position.set(target.x, target.y);
  node.foreground.alpha = target.opacity;
  if (target.widgetType === 'background') return;
  const radius = Math.min(16, Math.max(4, target.radius || 12), h / 3);
  const cyan = target.theme.colors.primary;
  node.frame.clear();
  // Static metal/corners belong to the DOM casing. A second Pixi outline
  // produced crossing corners and detached rails on fitted widget surfaces.
  node.pulse.clear().roundRect(2, 2, Math.max(1, w - 4), Math.max(1, h - 4), radius)
    .stroke({ color: target.theme.colors.highlight, alpha: .9, width: 2 });
  node.scan.clear().rect(4, 0, Math.max(1, w - 8), 1).fill({ color: cyan, alpha: .12 });
  placeParticles(node);
}

function placeParticles(node) {
  const { width, height } = node.target;
  node.particles.forEach(({ sprite, phase }, index) => {
    const t = (phase + node.elapsed * .0004) % 1;
    sprite.x = 5 + t * Math.max(1, width - 10);
    sprite.y = index % 2 ? height - 5 : 5;
    // Comms dust drifts just three pixels; it never travels across messages.
    if (['chat', 'raid_shoutout'].includes(node.target.widgetType)) {
      sprite.x = 5 + phase * Math.max(1, width - 13) + Math.sin(node.elapsed / 18 + phase) * 3;
    }
  });
}

export function updateOrbitalNode(node, ticker, reducedMotion) {
  if (!node.target.effects.enabled || reducedMotion) {
    node.scan.alpha = 0;
    node.eventTimeline?.progress(1);
    return;
  }
  const seconds = Math.min(ticker.deltaMS, 50) / 1000;
  node.elapsed += seconds;
  if (node.target.widgetType === 'background') {
    if (node.target.effects.orbital.backgroundAnimation) node.ambient.totalTime(node.elapsed);
  } else {
    placeParticles(node);
    // One soft scan every 24 seconds, disabled at low quality.
    const phase = (node.elapsed + numberSeed(node.id) % 17) % 24;
    node.scan.alpha = node.budget.quality !== 'low' && phase < 1.8
      ? Math.sin(phase / 1.8 * Math.PI) * node.target.effects.orbital.hudGlow : 0;
    node.scan.y = 5 + phase / 1.8 * Math.max(1, node.target.height - 10);
  }
  if (node.eventTimeline) {
    node.eventTime += seconds;
    node.eventTimeline.time(node.eventTime);
  }
}

export function burstOrbitalNode(node, kind) {
  if (!node.target.effects.enabled) return;
  // Coalesce duplicate DOM/event notifications for the same visual change.
  if (node.eventTimeline && node.eventTime < .35) return;
  node.eventTimeline?.progress(1).kill();
  const timeline = gsap.timeline({ paused: true });
  node.eventTimeline = timeline;
  node.eventTime = 0;
  if (node.target.widgetType === 'background') {
    if (!majorEvent(kind) || !node.environment || !node.target.effects.orbital.backgroundAnimation) return;
    const surge = node.environment.querySelector('[data-orbital-surge]');
    const shade = node.environment.querySelector('[data-orbital-shade]');
    if (surge) timeline.to(surge, { opacity: .7, duration: .45, ease: 'sine.out' }, 0).to(surge, { opacity: 0, duration: 1.65 }, .45);
    if (shade && kind !== 'super') timeline.to(shade, { opacity: .18, duration: .4 }, 0).to(shade, { opacity: 0, duration: 1.7 }, .4);
  } else {
    const glow = node.target.effects.orbital.hudGlow;
    timeline.to(node.pulse, { alpha: .2 + glow * .65, duration: .18, ease: 'sine.out' }, 0)
      .to(node.pulse, { alpha: 0, duration: majorEvent(kind) ? 1.9 : .65, ease: 'sine.inOut' }, .18);
    if (kind === 'giveaway') {
      const avatar = node.root?.querySelector('.better-gw-result-avatar, .is-winner .better-gw-avatar-bubble');
      const surface = node.root?.querySelector(node.target.widgetType === 'chat' ? '.ov-chat-widget' : '.better-gw-result-stage, .better-giveaway-widget');
      if (avatar && surface) {
        const a = avatar.getBoundingClientRect();
        const s = surface.getBoundingClientRect();
        if (s.width && s.height) {
          // Map the real selected participant into the shared canvas, including
          // editor zoom. No DOM transforms or persistent winner animation.
          const sx = node.target.width / s.width, sy = node.target.height / s.height;
          const cx = (a.left + a.width / 2 - s.left) * sx;
          const cy = (a.top + a.height / 2 - s.top) * sy;
          const radius = Math.min(a.width * sx, a.height * sy) / 2 + 3;
          const ring = node.transmissionRing, sweep = node.transmissionScan;
          ring.clear().circle(0, 0, radius).stroke({ color: node.target.theme.colors.highlight, width: 1.5, alpha: .65 });
          ring.position.set(cx, cy); ring.scale.set(1); ring.alpha = 0;
          const span = Math.min(radius * 2.4, node.target.width - 24);
          sweep.clear().rect(-span / 2, 0, span, 1).fill({ color: node.target.theme.colors.primary, alpha: .4 });
          sweep.position.set(cx, Math.max(12, cy - radius)); sweep.alpha = 0;
          timeline.to(ring, { alpha: .7, duration: .15 }, 0)
            .to(ring.scale, { x: 1.3, y: 1.3, duration: 1, ease: 'sine.out' }, 0)
            .to(ring, { alpha: 0, duration: .85 }, .15)
            .to(sweep, { alpha: .7, duration: .15 }, 0)
            .to(sweep, { y: Math.min(node.target.height - 12, cy + radius), duration: 1, ease: 'sine.inOut' }, 0)
            .to(sweep, { alpha: 0, duration: .3 }, .7);
        }
      }
    }
  }
}

export function disposeOrbitalNode(node) {
  node.ambient?.revert();
  node.eventTimeline?.revert();
  node.starGroups?.forEach(group => group.remove());
}
