import 'pixi.js/unsafe-eval';
import {
  Application, BlurFilter, Container, Graphics, Rectangle, RenderTexture, Sprite, Texture, type Filter, type Ticker,
} from 'pixi.js';
import { gsap } from 'gsap';
import { createKeyFilter, hexRgb } from '../freeze-shatter/shaders';
import { seededRandom } from '../freeze-shatter/geometry';
import { MoneyExplosionAudio } from './audio';
import { discoverLocalCameraRelay, fetchRelayFrame } from '../cameraRelay';
import {
  moneyPhaseTimings, type MoneyExplosionConfig, type MoneyTransitionState,
} from './config';

const WIDTH = 1280;
const HEIGHT = 720;
const QUALITY_LIMITS = { Low: 80, Medium: 160, High: 260, Ultra: 400 } as const;

type Point = { x: number; y: number };
interface MoneyNote {
  sprite: Sprite; origin: Point; start: Point; exit: Point;
  vx: number; vy: number; depth: number; size: number; seed: number; phase: number;
}
interface GoldParticle { graphic: Graphics; origin: Point; vx: number; vy: number; seed: number }
export interface MoneyRendererMetrics { fps: number; banknotes: number; particles: number; resolution: number; reduced: boolean }
export interface MoneyRendererCallbacks {
  onState: (state: MoneyTransitionState) => void;
  onProgress: (seconds: number) => void;
  onError: (message: string) => void;
  onReady: () => void;
  onMetrics: (metrics: MoneyRendererMetrics) => void;
}

function cameraError(error: unknown) {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError') return 'Camera permission was denied. Allow access in your browser, then select the camera again.';
  if (name === 'NotReadableError') return 'This camera is in use. Disable the other capture or select a virtual camera.';
  return 'The selected camera is unavailable. Reconnect it or choose another source.';
}

async function imageTexture(url: string) {
  const image = new Image(); image.src = url; await image.decode(); return Texture.from(image);
}

export class MoneyExplosionRenderer {
  private app = new Application();
  private cameraLayer = new Container();
  private frozen = new Sprite();
  private noteLayer = new Container();
  private particleLayer = new Container();
  private flash = new Graphics();
  private camera?: Sprite;
  private video?: HTMLVideoElement;
  private stream?: MediaStream;
  private sourceTexture?: Texture;
  private bridgeCanvas?: HTMLCanvasElement;
  private bridgeFrameUrl?: string;
  private bridgeTimer?: number;
  private captureTexture?: RenderTexture;
  private frontTexture = Texture.EMPTY;
  private backTexture = Texture.EMPTY;
  private ownedTextures: Texture[] = [];
  private keyFilter: Filter;
  private blurFilter = new BlurFilter({ strength: 0, quality: 2, kernelSize: 5 });
  private notes: MoneyNote[] = [];
  private particles: GoldParticle[] = [];
  private notePool: Sprite[] = [];
  private particlePool: Graphics[] = [];
  private animation?: gsap.core.Tween;
  private config: MoneyExplosionConfig;
  private callbacks: MoneyRendererCallbacks;
  private audio = new MoneyExplosionAudio();
  private initialized = false;
  private disposed = false;
  private captureReady = false;
  private sourceVersion = 0;
  private textureVersion = 0;
  private frameCount = 0;
  private metricsAt = performance.now();
  private lowFrames = 0;
  private reduced = false;
  private fps = 0;
  private currentState: MoneyTransitionState = 'VISIBLE';

  constructor(config: MoneyExplosionConfig, callbacks: MoneyRendererCallbacks) {
    this.config = { ...config }; this.callbacks = callbacks; this.keyFilter = createKeyFilter(config);
  }

  get state() { return this.currentState; }
  get busy() { return !!this.animation; }

  async init(host: HTMLElement) {
    await this.app.init({ width: WIDTH, height: HEIGHT, resolution: this.config.resolution, backgroundAlpha: 0, antialias: true, preference: 'webgl', powerPreference: 'high-performance', autoStart: false });
    if (this.disposed) { this.app.destroy(true, { children: true }); return; }
    this.initialized = true; host.appendChild(this.app.canvas); this.app.canvas.setAttribute('aria-label', 'Transparent money explosion webcam transition');
    this.app.canvas.addEventListener('webglcontextlost', this.onContextLost); this.app.canvas.addEventListener('webglcontextrestored', this.onContextRestored);
    this.noteLayer.filters = [this.blurFilter]; this.flash.visible = false;
    this.frozen.visible = false; this.app.stage.addChild(this.cameraLayer, this.frozen, this.noteLayer, this.particleLayer, this.flash);
    this.app.ticker.maxFPS = 60; this.app.ticker.add(this.tick);
    await Promise.all([this.loadBanknoteTextures(), this.setSource(this.config.source)]);
    if (this.disposed) return;
    this.app.start(); this.callbacks.onReady(); this.reportMetrics();
  }

  private onContextLost = (event: Event) => { event.preventDefault(); this.animation?.kill(); this.animation = undefined; this.audio.stop(); this.app.stop(); this.callbacks.onError('The GPU context was lost. Waiting for your graphics device to recover.'); };
  private onContextRestored = () => { this.captureReady = false; this.resetMoneyTransition(); this.callbacks.onReady(); };
  private tick = (ticker: Ticker) => {
    // Relay frames drive the idle webcam. Keep the 60 FPS ticker for transitions/scrubbing.
    if (this.bridgeCanvas && this.state === 'VISIBLE' && !this.busy) {
      this.app.stop();
      return;
    }
    this.frameCount++; const now = performance.now();
    if (now - this.metricsAt < 1200) return;
    this.fps = Math.min(60, Math.round(this.frameCount * 1000 / (now - this.metricsAt))); this.reportMetrics();
    if (this.config.autoQuality && this.fps < 38 && ticker.deltaMS < 200) this.lowFrames++; else this.lowFrames = 0;
    if (this.lowFrames >= 3 && !this.busy && this.app.renderer.resolution > 0.5) {
      this.app.renderer.resolution = Math.max(0.5, this.app.renderer.resolution - 0.25); this.app.renderer.resize(WIDTH, HEIGHT); this.reduced = true; this.lowFrames = 0;
    }
    this.frameCount = 0; this.metricsAt = now;
  };

  private reportMetrics() { this.callbacks.onMetrics({ fps: this.state === 'HIDDEN' ? 0 : this.fps, banknotes: this.notes.length, particles: this.particles.length, resolution: this.app.renderer.resolution, reduced: this.reduced }); }

  private async loadBanknoteTextures() {
    const version = ++this.textureVersion;
    const custom = this.config.banknoteStyle === 'custom' && this.config.customFrontTexture;
    const front = custom ? this.config.customFrontTexture : `/images/widgets/money-explosion/${this.config.banknoteStyle}-front.svg`;
    const back = this.config.banknoteStyle === 'custom'
      ? (this.config.customBackTexture || this.config.customFrontTexture)
      : `/images/widgets/money-explosion/${this.config.banknoteStyle}-back.svg`;
    try {
      const [frontTexture, backTexture] = await Promise.all([imageTexture(front || '/images/widgets/money-explosion/dollar-front.svg'), imageTexture(back || front || '/images/widgets/money-explosion/dollar-back.svg')]);
      if (this.disposed || version !== this.textureVersion) { frontTexture.destroy(true); backTexture.destroy(true); return; }
      this.ownedTextures.forEach(texture => texture.destroy(true)); this.ownedTextures = [frontTexture, backTexture];
      this.frontTexture = frontTexture; this.backTexture = backTexture;
      this.notes.forEach(note => { note.sprite.texture = frontTexture; });
    } catch { this.callbacks.onError('The selected banknote texture could not be loaded. Use a PNG, JPG, or WebP image.'); }
  }

  async setSource(source: string) {
    const version = ++this.sourceVersion; this.resetMoneyTransition(); this.releaseSource();
    if (source === 'demo') {
      const image = new Image(); image.src = '/images/widgets/freeze-shatter/demo-streamer.png'; await image.decode();
      if (this.disposed || version !== this.sourceVersion) return; this.sourceTexture = Texture.from(image);
    } else if (source === 'screen-splitter') {
      const relay = await discoverLocalCameraRelay();
      if (this.disposed || version !== this.sourceVersion) return;
      const bitmap = await fetchRelayFrame(relay.frameUrl);
      if (this.disposed || version !== this.sourceVersion) { bitmap.close(); return; }
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      canvas.getContext('2d', { alpha: false })?.drawImage(bitmap, 0, 0);
      bitmap.close();
      this.bridgeCanvas = canvas;
      this.bridgeFrameUrl = relay.frameUrl;
      this.sourceTexture = Texture.from(canvas);
    } else {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera capture requires HTTPS or localhost and a compatible browser.');
      const constraints = (deviceId?: string) => ({ ...(deviceId ? { deviceId: { exact: deviceId } } : {}), width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60, max: 60 } });
      let stream: MediaStream | undefined;
      try { stream = await navigator.mediaDevices.getUserMedia({ video: constraints(source !== 'default' ? source : undefined), audio: false }); }
      catch (initialError) {
        const name = initialError instanceof DOMException ? initialError.name : '';
        if (source !== 'default' && (name === 'NotFoundError' || name === 'OverconstrainedError')) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: constraints(), audio: false });
            const label = this.config.sourceLabel.trim().toLowerCase();
            if (label) {
              const match = (await navigator.mediaDevices.enumerateDevices()).find(device => device.kind === 'videoinput' && device.label.trim().toLowerCase() === label);
              const localId = stream.getVideoTracks()[0]?.getSettings().deviceId;
              if (match?.deviceId && match.deviceId !== localId) {
                stream.getTracks().forEach(track => track.stop());
                try { stream = await navigator.mediaDevices.getUserMedia({ video: constraints(match.deviceId), audio: false }); }
                catch { stream = await navigator.mediaDevices.getUserMedia({ video: constraints(), audio: false }); }
              }
            }
          } catch (fallbackError) { initialError = fallbackError; stream = undefined; }
        }
        if (!stream) { this.finishHidden(); throw new Error(cameraError(initialError)); }
      }
      if (!stream) throw new Error('The selected camera is unavailable. Reconnect it or choose another source.');
      if (this.disposed || version !== this.sourceVersion) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream; const video = document.createElement('video'); video.srcObject = stream; video.muted = true; video.playsInline = true; video.autoplay = true; this.video = video; await video.play();
      if (this.disposed || version !== this.sourceVersion) return; this.sourceTexture = Texture.from(video);
      stream.getVideoTracks()[0].addEventListener('ended', () => { if (!this.disposed && version === this.sourceVersion) { this.finishHidden(); this.callbacks.onError('Camera access ended. Reconnect the camera and select it again to recover.'); } }, { once: true });
    }
    this.camera = new Sprite(this.sourceTexture); this.camera.filters = [this.keyFilter]; this.cameraLayer.addChild(this.camera); this.layoutCamera(); this.cameraLayer.visible = this.config.enabled; if (this.bridgeFrameUrl) this.startRelayPolling(version); this.app.start(); this.callbacks.onReady();
  }

  private releaseSource() {
    if (this.bridgeTimer !== undefined) window.clearTimeout(this.bridgeTimer);
    this.bridgeTimer = undefined; this.bridgeCanvas = undefined; this.bridgeFrameUrl = undefined;
    if (this.video) { this.video.pause(); this.video.srcObject = null; this.video = undefined; }
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined;
    this.camera?.destroy(); this.camera = undefined; this.sourceTexture?.destroy(true); this.sourceTexture = undefined;
  }

  private startRelayPolling(version: number) {
    const frameUrl = this.bridgeFrameUrl;
    if (!frameUrl) return;
    let failures = 0;
    const poll = async () => {
      if (this.disposed || version !== this.sourceVersion || !this.bridgeCanvas) return;
      try {
        const bitmap = await fetchRelayFrame(frameUrl);
        if (this.disposed || version !== this.sourceVersion || !this.bridgeCanvas) { bitmap.close(); return; }
        const canvas = this.bridgeCanvas;
        if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
          canvas.width = bitmap.width; canvas.height = bitmap.height;
          this.layoutCamera();
        }
        try {
          canvas.getContext('2d', { alpha: false })?.drawImage(bitmap, 0, 0);
          // Upload only new relay frames, rather than the same canvas on every display tick.
          this.sourceTexture?.source.update();
          if (!this.app.ticker.started && this.state === 'VISIBLE' && this.config.enabled) this.app.render();
        } finally {
          bitmap.close();
        }
        failures = 0;
      } catch {
        failures += 1;
        if (failures === 15) this.callbacks.onError('The ScreenSplit camera relay stopped sending frames. Start the relay again and retry.');
      }
      if (!this.disposed && version === this.sourceVersion) this.bridgeTimer = window.setTimeout(() => void poll(), 66);
    };
    this.bridgeTimer = window.setTimeout(() => void poll(), 66);
  }

  private layoutCamera() {
    if (!this.camera || !this.sourceTexture) return;
    const scale = Math.min(WIDTH / this.sourceTexture.width, HEIGHT / this.sourceTexture.height) * this.config.subjectScale;
    this.camera.scale.set((this.config.mirror ? -1 : 1) * scale, scale); this.camera.anchor.set(0.5, 1); this.camera.position.set(WIDTH * this.config.subjectX, HEIGHT * this.config.subjectY);
  }

  updateConfig(config: MoneyExplosionConfig) {
    const previous = this.config; this.config = { ...config };
    const key = this.keyFilter.resources.keyUniforms.uniforms; key.uKeyColor = hexRgb(config.chromaColor); key.uTolerance = config.tolerance; key.uSoftness = config.softness; key.uSpill = config.spill;
    if (config.sound && !previous.sound) this.audio.unlock(); if (!config.sound && previous.sound) this.audio.stop();
    if (!this.initialized) return;
    if (previous.source !== config.source) { void this.setSource(config.source).catch(error => this.callbacks.onError(error.message)); return; }
    if (previous.banknoteStyle !== config.banknoteStyle || previous.customFrontTexture !== config.customFrontTexture || previous.customBackTexture !== config.customBackTexture) void this.loadBanknoteTextures();
    if (previous.resolution !== config.resolution) { this.app.renderer.resolution = config.resolution; this.app.renderer.resize(WIDTH, HEIGHT); this.reduced = false; }
    this.layoutCamera();
    if (!config.enabled) { this.resetMoneyTransition(); this.cameraLayer.visible = false; this.app.render(); this.app.stop(); }
    else if (!previous.enabled) this.resetMoneyTransition();
  }

  private sampleSilhouette(alphaAt: (x: number, y: number) => number, bounds: Rectangle, count: number) {
    const random = seededRandom(93217); const candidates: Point[] = [];
    const left = Math.max(0, bounds.x); const right = Math.min(WIDTH, bounds.x + bounds.width); const top = Math.max(0, bounds.y); const bottom = Math.min(HEIGHT, bounds.y + bounds.height);
    for (let i = 0; i < count * 80 && candidates.length < count * 5; i++) {
      const x = left + random() * Math.max(1, right - left); const y = top + random() * Math.max(1, bottom - top);
      if (alphaAt(x, y) > 28) candidates.push({ x, y });
    }
    const points: Point[] = []; const minDistance = Math.max(5, 21 - count / 28);
    for (const point of candidates) {
      if (points.length >= count) break;
      if (!points.some(existing => Math.hypot(point.x - existing.x, point.y - existing.y) < minDistance)) points.push(point);
    }
    let cursor = 0; while (points.length < count && candidates.length) { points.push(candidates[cursor++ % candidates.length]); }
    return points;
  }

  private capture() {
    if (!this.camera) throw new Error('Choose a webcam or the demo silhouette before running a transition.');
    this.clearEffects(); const resolution = Math.min(1.5, this.app.renderer.resolution);
    this.captureTexture ??= RenderTexture.create({ width: WIDTH, height: HEIGHT, resolution, dynamic: true });
    if (this.captureTexture.source.resolution !== resolution) this.captureTexture.resize(WIDTH, HEIGHT, resolution);
    this.cameraLayer.visible = true; this.cameraLayer.alpha = 1; this.app.renderer.render({ container: this.cameraLayer, target: this.captureTexture, clear: true });
    const { pixels, width, height } = this.app.renderer.extract.pixels({ target: this.captureTexture });
    const alphaAt = (x: number, y: number) => pixels[(Math.min(height - 1, Math.floor(y * height / HEIGHT)) * width + Math.min(width - 1, Math.floor(x * width / WIDTH))) * 4 + 3];
    const bounds = this.camera.getBounds(); let samples = 0; let transparent = 0;
    for (let y = Math.max(0, bounds.y) + 1; y < Math.min(HEIGHT, bounds.y + bounds.height); y += 14) for (let x = Math.max(0, bounds.x) + 1; x < Math.min(WIDTH, bounds.x + bounds.width); x += 14) { samples++; if (alphaAt(x, y) < 10) transparent++; }
    if (samples && transparent / samples < 0.02) throw new Error('No transparent background was found. Use a key screen and adjust chroma settings. An opaque webcam rectangle cannot become banknotes.');
    const count = Math.min(this.config.banknoteCount, QUALITY_LIMITS[this.config.quality]); const points = this.sampleSilhouette(alphaAt, bounds as Rectangle, count);
    if (points.length < 8) throw new Error('No visible silhouette was found. Check the camera and chroma key tolerance.');
    this.frozen.texture = this.captureTexture; this.frozen.position.set(0); this.frozen.width = WIDTH; this.frozen.height = HEIGHT; this.frozen.alpha = 1; this.frozen.visible = true;
    this.createNotes(points); this.createParticles(points); this.captureReady = true; this.reportMetrics();
  }

  private createNotes(points: Point[]) {
    const random = seededRandom(58131); const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length; const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length * 0.92;
    points.forEach((origin, index) => {
      const angle = Math.atan2(origin.y - cy, origin.x - cx) + (random() - 0.5) * (1.9 * this.config.radialSpread);
      const force = (290 + random() * 520) * this.config.explosionForce; const depth = (random() * 2 - 1) * this.config.depthIntensity;
      const sizeRange = this.config.maxBanknoteSize - this.config.minBanknoteSize; const size = this.config.minBanknoteSize + sizeRange * (this.config.sizeVariation ? Math.pow(random(), 0.8) : 0.5);
      const sprite = this.notePool.pop() || new Sprite(); sprite.texture = index % 2 ? this.backTexture : this.frontTexture; sprite.anchor.set(0.5); sprite.width = size * 2.25; sprite.height = size; sprite.position.set(origin.x, origin.y); sprite.alpha = 0; sprite.visible = true; sprite.rotation = 0; sprite.skew.set(0); sprite.tint = 0xffffff; this.noteLayer.addChild(sprite);
      const side = random() < 0.5 ? -1 : 1;
      this.notes.push({ sprite, origin, start: { x: side < 0 ? -size * 3 : WIDTH + size * 3, y: random() * HEIGHT }, exit: { x: origin.x + side * (100 + random() * 420), y: HEIGHT + 180 + random() * 360 }, vx: Math.cos(angle) * force + this.config.directionalBias * 260, vy: Math.sin(angle) * force - this.config.upwardVelocity * (220 + random() * 210), depth, size, seed: random(), phase: random() * Math.PI * 2 });
    });
  }

  private createParticles(points: Point[]) {
    if (!this.config.burstParticles) return; const random = seededRandom(778); const count = Math.round(12 + this.config.particleDensity * 96);
    for (let i = 0; i < count; i++) {
      const origin = points[Math.floor(random() * points.length)]; const angle = random() * Math.PI * 2; const speed = 180 + random() * 680; const size = 1 + random() * 4;
      const graphic = this.particlePool.pop() || new Graphics(); graphic.clear().circle(0, 0, size).fill({ color: random() > 0.38 ? 0xffd45a : 0xffffff, alpha: 0.9 }); graphic.visible = false; this.particleLayer.addChild(graphic);
      this.particles.push({ graphic, origin, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, seed: random() });
    }
  }

  private renderNote(note: MoneyNote, x: number, y: number, scale: number, flip: number, rotation: number, alpha: number) {
    note.sprite.position.set(x, y); note.sprite.rotation = rotation; note.sprite.alpha = alpha;
    const facing = Math.cos(flip); const texture = facing >= 0 ? this.frontTexture : this.backTexture; note.sprite.texture = texture;
    const textureHeight = Math.max(1, texture.height); const textureWidth = Math.max(1, texture.width); const aspect = textureWidth / textureHeight;
    note.sprite.scale.set((note.size * aspect / textureWidth) * Math.max(0.035, Math.abs(facing)) * scale, (note.size / textureHeight) * (1 + Math.sin(flip * 0.53 + note.phase) * 0.11) * scale);
    const light = Math.max(0.42, Math.min(1, 0.58 + Math.abs(facing) * 0.42 * this.config.lightingIntensity + note.depth * 0.08)); const channel = Math.round(light * 255); note.sprite.tint = (channel << 16) | (channel << 8) | Math.min(255, channel + 10);
    note.sprite.skew.x = Math.sin(flip * 0.37 + note.phase) * 0.16 * this.config.flutter;
  }

  private renderForward(seconds: number) {
    const phases = moneyPhaseTimings(this.config); this.callbacks.onProgress(seconds);
    if (seconds < phases.transform) {
      this.setState('TRANSFORMING'); const p = seconds / phases.transform; this.cameraLayer.visible = false; this.frozen.visible = true; this.frozen.alpha = Math.max(0, 1 - p * 1.25);
      this.noteLayer.visible = true; this.notes.forEach(note => { const jitter = (1 - p) * 5; this.renderNote(note, note.origin.x + Math.sin(note.phase * 7) * jitter, note.origin.y + Math.cos(note.phase * 5) * jitter, (0.25 + p * 0.75) * (1 + note.depth * 0.18), note.phase + p * 0.8, (note.seed - 0.5) * 0.18, Math.min(1, p * 3)); });
      this.renderFlash(p); this.renderParticles(p * 0.15);
    } else if (seconds < phases.explode) {
      this.setState('EXPLODING'); this.cameraLayer.visible = false; this.frozen.visible = false; const p = (seconds - phases.transform) / (phases.explode - phases.transform); const t = p * 0.55;
      this.blurFilter.strength = this.config.motionBlur * 5 * Math.sin(Math.PI * p);
      this.notes.forEach(note => { const depthScale = 1 + note.depth * p * 0.68; this.renderNote(note, note.origin.x + note.vx * t, note.origin.y + note.vy * t + 80 * t * t, depthScale, note.phase + p * (4 + note.seed * 5) * this.config.rotationSpeed, (note.seed - 0.5) * p * 5, 1); });
      this.renderFlash(1 + p); this.renderParticles(p);
    } else if (seconds < phases.rain) {
      this.setState('FALLING'); this.cameraLayer.visible = false; this.frozen.visible = false; const p = (seconds - phases.explode) / (phases.rain - phases.explode); const t = 0.55 + p * 2.05; const drag = Math.max(0.18, 1 - this.config.airResistance * t * 0.32);
      this.blurFilter.strength = this.config.motionBlur * 0.8;
      this.notes.forEach(note => {
        const flutterX = Math.sin(t * (5 + note.seed * 6) + note.phase) * (12 + 32 * this.config.flutter); const wind = this.config.horizontalWind * 170 * t;
        const x = note.origin.x + note.vx * t * drag + flutterX + wind; const y = note.origin.y + note.vy * t * drag + 0.5 * (360 * this.config.gravity) * t * t * this.config.fallingSpeed;
        const perspective = 1 + note.depth * 0.52 + Math.sin(t * 1.8 + note.phase) * 0.05; this.renderNote(note, x, y, Math.max(0.35, perspective), note.phase + t * (5 + note.seed * 7) * this.config.rotationSpeed, (note.seed - 0.5) * t * 4, 1);
      });
      this.renderParticles(1 + p);
    } else if (seconds < phases.end) {
      this.setState('FALLING'); const p = (seconds - phases.rain) / (phases.end - phases.rain); const eased = p * p * (1.25 + this.config.exitAcceleration * 0.75);
      this.notes.forEach(note => { const fromX = note.sprite.position.x; const fromY = note.sprite.position.y; const x = fromX + (note.exit.x - fromX) * Math.min(1, eased); const y = fromY + (note.exit.y - fromY) * Math.min(1, eased); this.renderNote(note, x, y, Math.max(0.3, 1 + note.depth * 0.45), note.phase + p * 14, note.sprite.rotation + p * 2, p > 0.9 ? (1 - p) * 10 : 1); });
      this.particles.forEach(particle => { particle.graphic.visible = false; }); this.flash.visible = false;
    } else this.finishHidden();
  }

  private renderFlash(progress: number) {
    if (!this.config.goldenFlash || progress >= 1.45) { this.flash.visible = false; return; }
    const alpha = progress < 1 ? Math.sin(progress * Math.PI) : Math.max(0, 1.45 - progress) * 0.5;
    this.flash.clear().circle(WIDTH * this.config.subjectX, HEIGHT * (this.config.subjectY - 0.42), 120 + progress * 380).fill({ color: 0xffd35a, alpha: alpha * 0.18 }).circle(WIDTH * this.config.subjectX, HEIGHT * (this.config.subjectY - 0.42), 30 + progress * 190).fill({ color: 0xffffff, alpha: alpha * 0.16 }); this.flash.visible = alpha > 0;
  }

  private renderParticles(progress: number) {
    this.particles.forEach(particle => { const t = Math.min(1.8, progress) * (0.35 + particle.seed * 0.35); particle.graphic.visible = progress > 0 && progress < 1.8; particle.graphic.position.set(particle.origin.x + particle.vx * t, particle.origin.y + particle.vy * t + 210 * t * t); particle.graphic.alpha = Math.max(0, 1 - progress / 1.8) * (0.45 + particle.seed * 0.55); });
  }

  moneyExplosion() {
    if (!this.initialized || this.busy || !this.config.enabled || this.disposed || this.state !== 'VISIBLE') return false;
    try { this.capture(); } catch (error) { this.callbacks.onError((error as Error).message); this.resetMoneyTransition(); return false; }
    if (this.config.sound) this.audio.unlock(); this.audio.explosion(this.config); this.audio.flutter(this.config, this.config.duration);
    this.app.start(); this.setState('TRANSFORMING'); const clock = { seconds: 0 };
    this.animation = gsap.to(clock, { seconds: this.config.duration, duration: this.config.duration, ease: 'none', onUpdate: () => this.renderForward(clock.seconds), onComplete: () => { this.animation = undefined; this.finishHidden(); } });
    return true;
  }

  async moneyReconstruction() {
    if (!this.initialized || this.busy || !this.config.enabled || this.disposed || this.state !== 'HIDDEN') return false;
    this.setState('RECONSTRUCTING');
    try {
      if (this.video) { await this.video.play(); await new Promise<void>(resolve => { let done = false; const finish = () => { if (!done) { done = true; resolve(); } }; if ('requestVideoFrameCallback' in this.video!) this.video!.requestVideoFrameCallback(finish); setTimeout(finish, 150); }); }
      if (this.disposed || this.state !== 'RECONSTRUCTING') return false; this.capture();
    } catch (error) { this.callbacks.onError((error as Error).message); this.finishHidden(); return false; }
    this.cameraLayer.visible = false; this.noteLayer.visible = true; this.app.start(); if (this.config.sound) this.audio.unlock(); this.audio.flutter(this.config, this.config.reconstructionDuration);
    const clock = { progress: 0 };
    this.animation = gsap.to(clock, { progress: 1, duration: this.config.reconstructionDuration, ease: 'none', onUpdate: () => {
      const p = clock.progress; this.callbacks.onProgress(p * this.config.reconstructionDuration);
      if (p < 0.72) {
        const q = 1 - Math.pow(1 - p / 0.72, 3); this.notes.forEach(note => { const arc = Math.sin(q * Math.PI) * (70 + note.seed * 100); const x = note.start.x + (note.origin.x - note.start.x) * q; const y = note.start.y + (note.origin.y - note.start.y) * q - arc; this.renderNote(note, x, y, 1 + note.depth * (1 - q) * 0.7, note.phase + (1 - q) * 10, (note.seed - 0.5) * (1 - q) * 5, Math.min(1, p * 8)); });
      } else {
        const q = (p - 0.72) / 0.28; this.cameraLayer.visible = true; this.cameraLayer.alpha = q; this.notes.forEach(note => this.renderNote(note, note.origin.x, note.origin.y, 1, note.phase + q, (note.seed - 0.5) * 0.15, 1 - q)); this.renderFlash(q);
      }
    }, onComplete: () => { this.animation = undefined; this.resetMoneyTransition(); } });
    return true;
  }

  toggleMoneyTransition() { return this.state === 'HIDDEN' ? this.moneyReconstruction() : this.moneyExplosion(); }
  previewTransition() { if (this.busy || !this.config.enabled) return false; this.resetMoneyTransition(); return this.moneyExplosion(); }

  resetMoneyTransition() {
    this.animation?.kill(); this.animation = undefined; this.audio.stop(); this.clearEffects(); this.currentState = 'VISIBLE'; this.callbacks.onState('VISIBLE'); this.callbacks.onProgress(0); this.captureReady = false;
    if (!this.initialized || this.disposed) return; this.cameraLayer.alpha = 1; this.cameraLayer.visible = this.config.enabled; this.frozen.visible = false; this.noteLayer.visible = false; this.particleLayer.visible = false; this.flash.visible = false; this.blurFilter.strength = 0; if (this.video && this.config.enabled) void this.video.play().catch(() => undefined); this.app.start();
  }

  private setState(state: MoneyTransitionState) { if (this.currentState === state) return; this.currentState = state; this.callbacks.onState(state); }
  private finishHidden() {
    this.animation?.kill(); this.animation = undefined; this.audio.stop(); this.cameraLayer.visible = false; this.frozen.visible = false; this.noteLayer.visible = false; this.particleLayer.visible = false; this.flash.visible = false; this.blurFilter.strength = 0; this.video?.pause(); this.setState('HIDDEN'); this.callbacks.onProgress(this.config.duration);
    if (this.config.cleanup) { this.clearEffects(); this.captureTexture?.destroy(true); this.captureTexture = undefined; this.captureReady = false; }
    this.app.render(); this.app.stop(); this.reportMetrics();
  }

  private clearEffects() {
    this.notes.forEach(note => { note.sprite.visible = false; note.sprite.filters = null; this.notePool.push(note.sprite); });
    this.particles.forEach(particle => { particle.graphic.visible = false; this.particlePool.push(particle.graphic); });
    this.notes = []; this.particles = []; this.noteLayer.removeChildren(); this.particleLayer.removeChildren(); this.noteLayer.visible = true; this.particleLayer.visible = true; this.reportMetrics();
  }

  inspectOutput() {
    if (!this.initialized || this.disposed) return null;
    const { pixels, width, height } = this.app.renderer.extract.pixels({ target: this.app.stage, frame: new Rectangle(0, 0, WIDTH, HEIGHT), resolution: 0.5 }); let visiblePixels = 0; let greenPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) { if (pixels[i + 3] > 3) visiblePixels++; if (pixels[i + 3] > 127 && pixels[i + 1] > Math.max(pixels[i], pixels[i + 2]) * 1.5) greenPixels++; }
    return { visiblePixels, greenPixels, width, height, banknotes: this.notes.length, particles: this.particles.length, cornerAlpha: [pixels[3], pixels[(width - 1) * 4 + 3], pixels[(height - 1) * width * 4 + 3], pixels[(width * height - 1) * 4 + 3]] };
  }

  destroy() {
    this.disposed = true; this.sourceVersion++; this.textureVersion++; this.animation?.kill(); this.audio.destroy(); this.releaseSource(); this.clearEffects(); this.notePool.forEach(sprite => sprite.destroy()); this.particlePool.forEach(graphic => graphic.destroy()); this.notePool = []; this.particlePool = []; this.captureTexture?.destroy(true); this.ownedTextures.forEach(texture => texture.destroy(true)); this.ownedTextures = [];
    if (this.initialized) { this.app.canvas.removeEventListener('webglcontextlost', this.onContextLost); this.app.canvas.removeEventListener('webglcontextrestored', this.onContextRestored); this.app.destroy(true, { children: true }); }
  }
}
