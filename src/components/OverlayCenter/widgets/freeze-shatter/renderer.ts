import 'pixi.js/unsafe-eval';
import {
  Application, Container, Graphics, Mesh, MeshGeometry, Rectangle, RenderTexture, Sprite, Texture,
  type Filter, type Ticker,
} from 'pixi.js';
import { gsap } from 'gsap';
import { createIceFilter, createKeyFilter, hexRgb } from './shaders';
import { createSilhouetteCells, sampleBody, seededRandom, type Cell } from './geometry';
import { phaseTimings, type WidgetConfig, type TransitionState } from './config';
import { IceAudio } from './audio';
import { TransitionMachine } from './state';

const WIDTH = 1280;
const HEIGHT = 720;

export interface RendererMetrics { fps: number; fragments: number; particles: number; resolution: number; reduced: boolean }
export interface RendererCallbacks {
  onState: (state: TransitionState) => void;
  onProgress: (seconds: number) => void;
  onError: (message: string) => void;
  onReady: () => void;
  onMetrics: (metrics: RendererMetrics) => void;
}

interface Fragment {
  container: Container;
  face: Mesh<MeshGeometry> | Graphics;
  rim: Mesh<MeshGeometry> | Graphics;
  shadow: Mesh<MeshGeometry> | Graphics;
  cell: Cell;
  depth: number;
  phase: number;
}
interface Dust { graphic: Graphics; x: number; y: number; seed: number; size: number }

export class WebcamTransitionRenderer {
  private app = new Application();
  private cameraLayer = new Container();
  private statueLayer = new Container();
  private fractureLines = new Graphics();
  private fractureMask = new Sprite();
  private fragmentLayer = new Container();
  private dustLayer = new Container();
  private frozen = new Sprite();
  private camera?: Sprite;
  private sourceTexture?: Texture;
  private surfaceTexture?: Texture;
  private rawTexture?: RenderTexture;
  private statueTexture?: RenderTexture;
  private keyFilter: Filter;
  private iceFilter: Filter;
  private video?: HTMLVideoElement;
  private stream?: MediaStream;
  private fragments: Fragment[] = [];
  private dust: Dust[] = [];
  private cells: Cell[] = [];
  private machine = new TransitionMachine();
  private animation?: gsap.core.Tween;
  private audio = new IceAudio();
  private initialized = false;
  private disposed = false;
  private captureReady = false;
  private sourceVersion = 0;
  private isScrubbing = false;
  private elapsed = 0;
  private frameCount = 0;
  private metricsAt = performance.now();
  private lowFrames = 0;
  private reduced = false;
  private fps = 0;
  private playedCrack = false;
  private playedShatter = false;
  private config: WidgetConfig;
  private callbacks: RendererCallbacks;

  constructor(config: WidgetConfig, callbacks: RendererCallbacks) {
    this.config = { ...config };
    this.callbacks = callbacks;
    this.keyFilter = createKeyFilter(config);
    this.iceFilter = createIceFilter(config);
  }

  get state() { return this.machine.state; }
  get busy() { return !!this.animation; }

  inspectOutput() {
    if (!this.initialized || this.disposed) return null;
    const { pixels, width, height } = this.app.renderer.extract.pixels({ target: this.app.stage, frame: new Rectangle(0, 0, WIDTH, HEIGHT), resolution: 0.5 });
    let visiblePixels = 0; let partialAlphaPixels = 0; let greenPixels = 0;
    let left = width; let top = height; let right = -1; let bottom = -1;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 3) {
        visiblePixels++;
        const pixel = i / 4; const x = pixel % width; const y = Math.floor(pixel / width);
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      if (pixels[i + 3] > 3 && pixels[i + 3] < 250) partialAlphaPixels++;
      if (pixels[i + 3] > 127 && pixels[i + 1] > Math.max(pixels[i], pixels[i + 2]) * 1.5 && pixels[i + 1] > 80) greenPixels++;
    }
    return {
      visiblePixels, partialAlphaPixels, greenPixels, width, height, bounds: { left, top, right, bottom },
      cornerAlpha: [pixels[3], pixels[(width - 1) * 4 + 3], pixels[(height - 1) * width * 4 + 3], pixels[(width * height - 1) * 4 + 3]],
      fragments: this.fragments.length, particles: this.dust.length,
      captureTextures: Number(!!this.rawTexture) + Number(!!this.statueTexture),
      polygonSizes: this.cells.map(cell => cell.polygon.length),
    };
  }

  private reportMetrics() {
    if (!this.initialized || this.disposed) return;
    this.callbacks.onMetrics({ fps: this.state === 'HIDDEN' ? 0 : this.fps, fragments: this.fragments.length, particles: this.dust.length, resolution: this.app.renderer.resolution, reduced: this.reduced });
  }

  async init(host: HTMLElement, showcase = false, startHidden = false) {
    await this.app.init({
      width: WIDTH, height: HEIGHT, resolution: this.config.resolution,
      backgroundAlpha: 0, antialias: true, preference: 'webgl',
      powerPreference: 'high-performance', autoStart: false,
    });
    if (this.disposed) { this.app.destroy(true, { children: true }); return; }
    this.initialized = true;
    host.appendChild(this.app.canvas);
    this.app.canvas.setAttribute('aria-label', 'Transparent silhouette transition renderer');
    this.app.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.app.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    this.frozen.visible = false;
    this.frozen.filters = [this.iceFilter];
    this.fractureLines.visible = false;
    this.fractureLines.setMask({ mask: this.fractureMask, channel: 'alpha' });
    this.statueLayer.addChild(this.frozen, this.fractureLines, this.fractureMask);
    this.app.stage.addChild(this.cameraLayer, this.statueLayer, this.fragmentLayer, this.dustLayer);
    this.fragmentLayer.sortableChildren = true;
    this.app.ticker.maxFPS = 60;
    this.app.ticker.add(this.tick);
    try {
      const surface = new Image(); surface.src = '/images/widgets/freeze-shatter/ice-surface.jpg'; await surface.decode();
      if (this.disposed) return;
      this.surfaceTexture = Texture.from(surface);
      this.iceFilter.resources.uSurfaceTexture = this.surfaceTexture.source;
    } catch { /* The procedural frost shader remains usable if the surface asset is unavailable. */ }
    await this.setSource(this.config.source);
    if (this.disposed) return;
    if (startHidden) this.finishHidden();
    else if (showcase && this.config.source === 'demo' && this.config.mode === 'browser') this.seek(this.config.duration * 0.345);
    this.app.start();
    if (startHidden) this.app.stop();
    this.callbacks.onReady();
  }

  private handleContextLost = (event: Event) => {
    event.preventDefault();
    this.animation?.kill(); this.animation = undefined;
    this.audio.stop(); this.app.stop();
    this.callbacks.onError('The GPU context was lost. Waiting for your graphics device to recover.');
  };

  private handleContextRestored = () => {
    this.captureReady = false;
    this.resetWebcamTransition();
    this.callbacks.onReady();
  };

  private tick = (ticker: Ticker) => {
    this.iceFilter.resources.iceUniforms.uniforms.uTime = performance.now() / 1000;
    this.frameCount++;
    const now = performance.now();
    if (now - this.metricsAt > 1200) {
      const fps = Math.min(60, Math.round(this.frameCount * 1000 / (now - this.metricsAt)));
      this.fps = fps;
      this.reportMetrics();
      if (this.config.autoQuality && fps < 38 && ticker.deltaMS < 200) this.lowFrames++;
      else this.lowFrames = 0;
      if (this.lowFrames >= 3 && !this.busy && this.app.renderer.resolution > 0.5) {
        this.app.renderer.resolution = Math.max(0.5, this.app.renderer.resolution - 0.25);
        this.app.renderer.resize(WIDTH, HEIGHT);
        this.reduced = true; this.lowFrames = 0;
      }
      this.frameCount = 0; this.metricsAt = now;
    }
  };

  async setSource(source: string) {
    const version = ++this.sourceVersion;
    this.resetWebcamTransition();
    this.releaseSource();
    if (this.config.mode === 'obs') {
      this.cameraLayer.visible = false;
      this.callbacks.onReady();
      return;
    }
    if (source === 'demo') {
      const image = new Image();
      image.src = '/images/widgets/freeze-shatter/demo-streamer.png';
      await image.decode();
      if (this.disposed || version !== this.sourceVersion) return;
      this.sourceTexture = Texture.from(image);
    } else {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera capture requires HTTPS or localhost and a compatible browser.');
      let stream: MediaStream | undefined;
      const videoConstraints = (deviceId?: string) => ({
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60, max: 60 },
      });
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints(source !== 'default' ? source : undefined),
          audio: false,
        });
      } catch (error) {
        const name = error instanceof DOMException ? error.name : '';
        // Camera IDs are browser-profile specific. Resolve the saved camera inside OBS,
        // then use its local default if Chrome's stored ID is unknown there.
        const canUseLocalDefault = source !== 'default' && (name === 'NotFoundError' || name === 'OverconstrainedError');
        if (canUseLocalDefault) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints(), audio: false });
            const savedLabel = this.config.sourceLabel.trim().toLowerCase();
            if (savedLabel) {
              const localDevices = await navigator.mediaDevices.enumerateDevices();
              const matchingDevice = localDevices.find(device =>
                device.kind === 'videoinput' && device.label.trim().toLowerCase() === savedLabel,
              );
              const localDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId;
              if (matchingDevice?.deviceId && matchingDevice.deviceId !== localDeviceId) {
                stream.getTracks().forEach(track => track.stop());
                try {
                  stream = await navigator.mediaDevices.getUserMedia({
                    video: videoConstraints(matchingDevice.deviceId), audio: false,
                  });
                } catch {
                  stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints(), audio: false });
                }
              }
            }
          } catch (fallbackError) {
            error = fallbackError;
            stream = undefined;
          }
        }
        if (!stream) {
          const fallbackName = error instanceof DOMException ? error.name : name;
          this.finishHidden();
          throw new Error(fallbackName === 'NotAllowedError' ? 'Camera permission was denied. Allow access in your browser, then select the camera again.' : fallbackName === 'NotReadableError' ? 'This camera is in use. Disable the other capture or select a virtual camera.' : 'The selected camera is unavailable. Reconnect it or choose another source.');
        }
      }
      if (!stream) throw new Error('The selected camera is unavailable. Reconnect it or choose another source.');
      if (this.disposed || version !== this.sourceVersion) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      const video = document.createElement('video');
      video.srcObject = stream; video.muted = true; video.playsInline = true; video.autoplay = true;
      this.video = video;
      await video.play();
      if (this.disposed || version !== this.sourceVersion) return;
      this.sourceTexture = Texture.from(video);
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (this.disposed || version !== this.sourceVersion) return;
        this.finishHidden();
        this.callbacks.onError('Camera access ended. Reconnect the camera and select it again to recover.');
      }, { once: true });
    }
    this.camera = new Sprite(this.sourceTexture);
    this.camera.filters = [this.keyFilter];
    this.cameraLayer.addChild(this.camera);
    this.layoutCamera();
    this.cameraLayer.visible = this.config.enabled;
    this.app.start();
    this.callbacks.onReady();
  }

  private releaseSource() {
    if (this.video) { this.video.pause(); this.video.srcObject = null; this.video = undefined; }
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined;
    this.camera?.destroy(); this.camera = undefined;
    this.sourceTexture?.destroy(true); this.sourceTexture = undefined;
  }

  private layoutCamera() {
    if (!this.camera || !this.sourceTexture) return;
    const scale = Math.min(WIDTH / this.sourceTexture.width, HEIGHT / this.sourceTexture.height) * this.config.subjectScale;
    this.camera.scale.set((this.config.mirror ? -1 : 1) * scale, scale);
    this.camera.anchor.set(0.5, 1);
    this.camera.position.set(WIDTH * this.config.subjectX, HEIGHT * this.config.subjectY);
  }

  updateConfig(config: WidgetConfig) {
    const previous = this.config;
    this.config = { ...config };
    if (config.sound && !previous.sound) this.audio.unlock();
    if (!config.sound && previous.sound) this.audio.stop();
    const key = this.keyFilter.resources.keyUniforms.uniforms;
    key.uKeyColor = hexRgb(config.chromaColor); key.uTolerance = config.tolerance;
    key.uSoftness = config.softness; key.uSpill = config.spill;
    const ice = this.iceFilter.resources.iceUniforms.uniforms;
    ice.uIceColor = hexRgb(config.iceColor); ice.uFrost = config.frost;
    ice.uCrystals = config.crystals; ice.uCracks = config.cracks;
    ice.uReflections = config.reflections; ice.uGlow = config.glow;
    if (!this.initialized) return;
    if (previous.source !== config.source || previous.mode !== config.mode) {
      void this.setSource(config.source).catch(error => this.callbacks.onError(error.message));
      return;
    }
    if (previous.resolution !== config.resolution) {
      this.app.renderer.resolution = config.resolution;
      this.app.renderer.resize(WIDTH, HEIGHT); this.reduced = false;
    }
    const placementChanged = previous.subjectX !== config.subjectX || previous.subjectY !== config.subjectY || previous.subjectScale !== config.subjectScale || previous.mirror !== config.mirror;
    this.layoutCamera();
    if (!config.enabled) { this.resetWebcamTransition(); this.cameraLayer.visible = false; this.app.render(); this.app.stop(); }
    else if (!previous.enabled) this.resetWebcamTransition();
    else if (this.isScrubbing && !this.busy) {
      if (placementChanged || previous.tolerance !== config.tolerance || previous.softness !== config.softness || previous.spill !== config.spill || previous.chromaColor !== config.chromaColor) this.captureReady = false;
      this.clearFragments();
      this.captureReady = false;
      this.seek(Math.min(this.elapsed, config.duration));
    }
  }

  private capture() {
    if (this.config.mode === 'obs') { this.captureReady = true; this.prepareFallbackCells(); return; }
    if (!this.camera) throw new Error('Choose a webcam or the demo silhouette before running a transition.');
    this.clearFragments();
    const resolution = Math.min(1.5, this.app.renderer.resolution);
    this.rawTexture ??= RenderTexture.create({ width: WIDTH, height: HEIGHT, resolution, dynamic: true });
    this.statueTexture ??= RenderTexture.create({ width: WIDTH, height: HEIGHT, resolution, dynamic: true });
    if (this.rawTexture.source.resolution !== resolution) this.rawTexture.resize(WIDTH, HEIGHT, resolution);
    if (this.statueTexture.source.resolution !== resolution) this.statueTexture.resize(WIDTH, HEIGHT, resolution);
    this.cameraLayer.visible = true;
    this.app.renderer.render({ container: this.cameraLayer, target: this.rawTexture, clear: true });
    this.frozen.texture = this.rawTexture;
    this.frozen.position.set(0); this.frozen.width = WIDTH; this.frozen.height = HEIGHT;
    this.fractureMask.texture = this.rawTexture;
    this.fractureMask.position.set(0); this.fractureMask.width = WIDTH; this.fractureMask.height = HEIGHT;
    const { pixels, width, height } = this.app.renderer.extract.pixels({ target: this.rawTexture });
    const alphaAt = (x: number, y: number) => pixels[(Math.min(height - 1, Math.floor(y * height / HEIGHT)) * width + Math.min(width - 1, Math.floor(x * width / WIDTH))) * 4 + 3];
    const bounds = this.camera.getBounds();
    let samples = 0; let transparent = 0;
    for (let y = Math.max(0, bounds.y) + 1; y < Math.min(HEIGHT, bounds.y + bounds.height); y += 12) {
      for (let x = Math.max(0, bounds.x) + 1; x < Math.min(WIDTH, bounds.x + bounds.width); x += 12) {
        samples++; if (alphaAt(x, y) < 10) transparent++;
      }
    }
    if (samples && transparent / samples < 0.02) throw new Error('No transparent background was found. Use a key screen and adjust chroma settings. An opaque webcam rectangle will never be shattered.');
    this.cells = createSilhouetteCells(WIDTH, HEIGHT, Math.min(this.config.fragmentCount, this.config.maxParticles), alphaAt, this.config.variation);
    if (this.cells.length < 3) throw new Error('No visible silhouette was found. Check the camera and chroma key tolerance.');
    this.fractureLines.clear();
    for (const cell of this.cells) {
      const points = cell.polygon.flatMap(point => [point.x, point.y]);
      this.fractureLines.poly(points, true).stroke({ width: 2.1, color: 0x164254, alpha: 0.8 });
      this.fractureLines.poly(points, true).stroke({ width: 0.65, color: 0xc9f4ff, alpha: 0.9 });
    }
    this.fractureLines.visible = false;
    this.captureReady = true;
    this.cameraLayer.visible = false; this.frozen.visible = true;
    this.iceFilter.resources.iceUniforms.uniforms.uProgress = 0;
    this.iceFilter.resources.iceUniforms.uniforms.uFracture = 0;
    this.createDust();
  }

  private prepareFallbackCells() {
    this.clearFragments();
    const cx = WIDTH * this.config.subjectX;
    const cy = HEIGHT * this.config.subjectY - HEIGHT * this.config.subjectScale * 0.4;
    this.cells = createSilhouetteCells(WIDTH, HEIGHT, Math.min(this.config.fragmentCount, this.config.maxParticles), (x, y) => {
      const d = Math.pow((x - cx) / (140 * this.config.subjectScale), 2) + Math.pow((y - cy) / (230 * this.config.subjectScale), 2);
      return d < 1 && d > 0.55 ? 255 : 0;
    }, this.config.variation);
    this.createDust();
  }

  private prepareFragments() {
    if (this.fragments.length) return;
    if (this.config.mode === 'browser') {
      if (!this.statueTexture) return;
      const ice = this.iceFilter.resources.iceUniforms.uniforms;
      ice.uProgress = 1; ice.uFracture = 1;
      this.frozen.visible = true;
      this.fractureLines.visible = true;
      this.fractureLines.alpha = this.config.cracks;
      this.app.renderer.render({ container: this.statueLayer, target: this.statueTexture, clear: true });
    }
    this.fragments = this.cells.map(cell => {
      const localPoints = cell.polygon.map(point => ({ x: point.x - cell.center.x, y: point.y - cell.center.y }));
      const points = localPoints.flatMap(point => [point.x, point.y]);
      const container = new Container();
      let face: Mesh<MeshGeometry> | Graphics;
      let rim: Mesh<MeshGeometry> | Graphics;
      let shadow: Mesh<MeshGeometry> | Graphics;
      if (this.config.mode === 'browser' && this.statueTexture) {
        const positions = new Float32Array(points);
        const uvs = new Float32Array(cell.polygon.flatMap(point => [point.x / WIDTH, point.y / HEIGHT]));
        const indices = new Uint32Array(Array.from({ length: cell.polygon.length - 2 }, (_, i) => [0, i + 1, i + 2]).flat());
        const geometry = new MeshGeometry({ positions, uvs, indices });
        face = new Mesh({ geometry, texture: this.statueTexture });
        // Texture-backed layers keep the chroma-key alpha. This gives the
        // shard a dark physical edge and a cold glass reflection without ever
        // outlining the transparent portion of a boundary Voronoi cell.
        shadow = new Mesh({ geometry, texture: this.statueTexture });
        shadow.tint = 0x082a3a;
        shadow.alpha = 0.68;
        rim = new Mesh({ geometry, texture: this.statueTexture });
        rim.tint = 0xd7f8ff;
        rim.alpha = 0.11;
        rim.blendMode = 'screen';
      } else {
        const size = 3 + cell.seed * 12;
        face = new Graphics()
          .poly([0, -size, size * 0.45, size * 0.7, -size * 0.75, size * 0.4], true)
          .fill({ color: this.config.iceColor, alpha: 0.86 });
        shadow = new Graphics().poly(points, true).fill({ color: 0x03111c, alpha: 0.72 });
        rim = new Graphics()
          .poly(points, true)
          .fill({ color: 0xbdefff, alpha: 0.045 })
          .stroke({ width: 1.05 + cell.seed * 0.75, color: 0xcaf5ff, alpha: 0.78 });
        rim.blendMode = 'screen';
      }
      shadow.position.set(2.4 + cell.seed * 2.8, 3.2 + cell.seed * 3.6);
      container.addChild(shadow, face, rim);
      container.position.set(cell.center.x, cell.center.y);
      const depth = 0.72 + cell.seed * 0.74;
      container.zIndex = Math.round(depth * 100);
      this.fragmentLayer.addChild(container);
      return { container, face, rim, shadow, cell, depth, phase: cell.seed * Math.PI * 2 };
    });
    this.reportMetrics();
  }

  private createDust() {
    const random = seededRandom(47);
    const count = Math.min(Math.max(0, this.config.maxParticles - this.cells.length), Math.round(this.config.mist * 100));
    for (let i = 0; i < count && this.cells.length; i++) {
      const point = this.cells[Math.floor(random() * this.cells.length)].center;
      const size = 0.8 + random() * 2.5;
      const graphic = new Graphics()
        .poly([0, -size, size * 0.5, size * 0.68, size * 0.12, size, -size * 0.82, size * 0.28], true)
        .fill({ color: i % 4 === 0 ? 0xe8fbff : this.config.iceColor, alpha: 0.72 })
        .stroke({ width: Math.max(0.35, size * 0.16), color: 0xeaffff, alpha: 0.52 });
      graphic.visible = false;
      this.dustLayer.addChild(graphic);
      this.dust.push({ graphic, x: point.x, y: point.y, seed: random(), size });
    }
  }

  private renderDust(progress: number, shattering: boolean) {
    this.dust.forEach(particle => {
      const t = progress * (shattering ? 2 : 0.6);
      particle.graphic.visible = progress > 0 && progress < 1;
      particle.graphic.position.set(particle.x + Math.sin(particle.seed * 20) * t * 100, particle.y - t * (30 + particle.seed * 100) + (shattering ? t * t * 40 : 0));
      particle.graphic.rotation = t * (particle.seed - 0.5) * 5;
      const tumble = Math.abs(Math.cos(t * (6 + particle.seed * 13)));
      particle.graphic.scale.set(0.28 + tumble * 0.72, 0.72 + particle.seed * 0.58);
      particle.graphic.alpha = Math.sin(progress * Math.PI) * this.config.mist * (0.58 + particle.size * 0.12);
    });
  }

  private poseFragment(fragment: Fragment, progress: number, alpha?: number) {
    const body = sampleBody(fragment.cell, progress, WIDTH, HEIGHT, this.config);
    const tumble = Math.cos(progress * (8.5 + fragment.cell.seed * 15) + fragment.phase);
    const pitch = Math.sin(progress * (6.5 + fragment.cell.seed * 11) + fragment.phase * 0.73);
    const perspectiveX = 0.12 + Math.abs(tumble) * 0.88;
    fragment.container.position.set(body.x, body.y);
    fragment.container.rotation = body.rotation + pitch * 0.18;
    fragment.container.skew.set(pitch * 0.12, tumble * 0.075);
    fragment.container.scale.set(body.scale * perspectiveX * fragment.depth, body.scale * (0.86 + fragment.depth * 0.14));
    fragment.container.alpha = alpha ?? body.alpha;
    fragment.shadow.position.set(
      (2.4 + fragment.cell.seed * 2.8) * Math.sign(tumble || 1),
      3.2 + fragment.cell.seed * 3.6,
    );
    fragment.shadow.alpha = 0.38 + (1 - Math.abs(tumble)) * 0.42;
    fragment.rim.alpha = fragment.rim instanceof Mesh
      ? 0.055 + Math.abs(tumble) * 0.14
      : 0.34 + Math.abs(tumble) * 0.62;
  }

  private setState(state: TransitionState, preview = false) {
    if (state === this.state) return;
    if (preview) this.machine.state = state;
    else {
      const order: TransitionState[] = ['VISIBLE', 'FREEZING', 'FROZEN', 'SHATTERING', 'HIDDEN', 'RECONSTRUCTING', 'VISIBLE'];
      const current = order.indexOf(this.state);
      const target = this.state === 'RECONSTRUCTING' && state === 'VISIBLE' ? 6 : order.indexOf(state);
      if (target <= current) return;
      for (let i = current + 1; i <= target; i++) this.machine.transition(order[i]);
    }
    this.callbacks.onState(this.state);
  }

  private renderSequence(seconds: number, preview = false) {
    this.elapsed = seconds;
    const phases = phaseTimings(this.config);
    const ice = this.iceFilter.resources.iceUniforms.uniforms;
    this.callbacks.onProgress(seconds);
    this.cameraLayer.visible = false;
    if (seconds < phases.freeze) {
      this.setState('FREEZING', preview);
      ice.uProgress = Math.min(1, seconds / phases.freeze);
      ice.uFracture = 0;
      this.frozen.visible = this.config.mode === 'browser';
      this.fractureLines.visible = false;
      this.fragmentLayer.visible = false;
      this.renderDust(seconds / phases.fracture, false);
    } else if (seconds < phases.fracture) {
      this.setState('FROZEN', preview);
      ice.uProgress = 1;
      ice.uFracture = Math.max(0, (seconds - phases.frozen) / Math.max(0.01, phases.fracture - phases.frozen));
      this.frozen.visible = this.config.mode === 'browser';
      this.fractureLines.visible = this.config.mode === 'browser' && ice.uFracture > 0;
      this.fractureLines.alpha = this.config.cracks * ice.uFracture;
      this.fragmentLayer.visible = false;
      this.renderDust(seconds / phases.fracture, false);
      if (!preview && seconds >= phases.frozen && !this.playedCrack) { this.audio.play('cracking', this.config); this.playedCrack = true; }
    } else if (seconds < phases.end) {
      this.prepareFragments();
      this.setState('SHATTERING', preview);
      this.frozen.visible = false; this.fragmentLayer.visible = true;
      this.fractureLines.visible = false;
      const p = Math.min(1, (seconds - phases.fracture) / Math.max(0.01, phases.shatter - phases.fracture));
      const eased = this.easeProgress(p);
      this.fragments.forEach(fragment => {
        this.poseFragment(fragment, eased);
      });
      this.renderDust(p, true);
      if (!preview && !this.playedShatter) { this.audio.play('shatter', this.config); this.playedShatter = true; }
    } else this.finishHidden(preview);
  }

  private easeProgress(p: number) {
    if (this.config.easing === 'smooth') return p * p * (3 - 2 * p);
    if (this.config.easing === 'snappy') return 1 - Math.pow(1 - p, 2);
    if (this.config.easing === 'cinematic') return Math.pow(p, 0.85);
    return p;
  }

  freezeAndShatter() {
    if (!this.initialized || this.busy || !this.config.enabled || this.disposed) return false;
    if (this.isScrubbing) this.resetWebcamTransition();
    if (this.state !== 'VISIBLE') return false;
    try { this.capture(); } catch (error) { this.callbacks.onError((error as Error).message); this.resetWebcamTransition(); return false; }
    if (this.config.sound) this.audio.unlock();
    this.audio.play('formation', this.config);
    this.playedCrack = false; this.playedShatter = false;
    this.setState('FREEZING'); this.app.start();
    const clock = { seconds: 0 };
    this.animation = gsap.to(clock, {
      seconds: this.config.duration, duration: this.config.duration, ease: 'none',
      onUpdate: () => this.renderSequence(clock.seconds),
      onComplete: () => { this.animation = undefined; this.finishHidden(); },
    });
    return true;
  }

  async reconstructWebcam() {
    if (!this.initialized || this.busy || !this.config.enabled || this.disposed || this.state !== 'HIDDEN') return false;
    this.setState('RECONSTRUCTING');
    this.isScrubbing = false;
    try {
      if (this.video) {
        await this.video.play();
        // Wait for a new camera frame, never reconstruct a stale frozen portrait.
        await new Promise<void>(resolve => {
          let done = false;
          const finish = () => { if (!done) { done = true; resolve(); } };
          if ('requestVideoFrameCallback' in this.video!) this.video!.requestVideoFrameCallback(finish);
          setTimeout(finish, 150);
        });
      }
      if (this.disposed || this.machine.state !== 'RECONSTRUCTING') return false;
      this.capture(); this.prepareFragments();
    } catch (error) {
      this.callbacks.onError((error as Error).message); this.finishHidden(); return false;
    }
    this.app.start();
    if (this.config.sound) this.audio.unlock();
    this.audio.play('formation', this.config);
    const clock = { progress: 0 };
    this.animation = gsap.to(clock, {
      progress: 1, duration: this.config.reconstructionDuration, ease: 'none',
      onUpdate: () => {
        const p = clock.progress;
        this.callbacks.onProgress(p * this.config.reconstructionDuration);
        if (p < 0.64) {
          this.frozen.visible = false; this.fragmentLayer.visible = true;
          this.fractureLines.visible = false;
          const amount = 1 - this.easeProgress(p / 0.64);
          this.fragments.forEach(fragment => {
            this.poseFragment(fragment, amount * 0.94, Math.min(1, p * 8));
          });
          this.renderDust(p / 0.64, true);
        } else {
          this.fragmentLayer.visible = false; this.frozen.visible = this.config.mode === 'browser';
          const melt = (p - 0.64) / 0.36;
          const uniforms = this.iceFilter.resources.iceUniforms.uniforms;
          uniforms.uProgress = 1 - melt; uniforms.uFracture = Math.max(0, 1 - melt * 2);
          this.fractureLines.visible = this.config.mode === 'browser' && melt < 0.5;
          this.fractureLines.alpha = Math.max(0, 1 - melt * 2) * this.config.cracks;
          this.renderDust(melt, false);
        }
      },
      onComplete: () => { this.animation = undefined; this.resetWebcamTransition(); },
    });
    return true;
  }

  toggleWebcamTransition() { return this.state === 'HIDDEN' ? this.reconstructWebcam() : this.freezeAndShatter(); }

  resetWebcamTransition() {
    this.animation?.kill(); this.animation = undefined;
    this.audio.stop(); this.isScrubbing = false; this.elapsed = 0;
    this.clearFragments();
    this.captureReady = false;
    this.machine.recover();
    this.callbacks.onState('VISIBLE'); this.callbacks.onProgress(0);
    if (!this.initialized || this.disposed) return;
    this.frozen.visible = false;
    this.fractureLines.visible = false;
    this.cameraLayer.visible = this.config.enabled && this.config.mode === 'browser';
    this.fragmentLayer.visible = false;
    if (this.video && this.config.enabled) void this.video.play().catch(() => undefined);
    else this.video?.pause();
    this.app.start();
  }

  seek(seconds: number) {
    if (!this.initialized || this.disposed || this.busy || !this.config.enabled) return;
    this.isScrubbing = true;
    try {
      if (!this.captureReady) this.capture();
      if (seconds <= 0.001) { this.resetWebcamTransition(); return; }
      this.renderSequence(Math.min(this.config.duration, seconds), true);
      this.app.start();
    } catch (error) { this.callbacks.onError((error as Error).message); }
  }

  previewTransition() {
    if (this.busy || !this.config.enabled) return false;
    this.resetWebcamTransition();
    return this.freezeAndShatter();
  }

  private finishHidden(preview = false) {
    this.frozen.visible = false; this.cameraLayer.visible = false;
    this.fractureLines.visible = false;
    this.fragmentLayer.visible = false; this.dustLayer.visible = false;
    this.setState('HIDDEN', preview);
    this.video?.pause();
    if (this.config.cleanup && !preview) {
      this.clearFragments();
      this.frozen.texture = Texture.EMPTY;
      this.fractureMask.texture = Texture.EMPTY;
      this.rawTexture?.destroy(true); this.rawTexture = undefined;
      this.statueTexture?.destroy(true); this.statueTexture = undefined;
      this.captureReady = false;
    }
    this.callbacks.onProgress(this.config.duration);
    this.reportMetrics();
    if (this.initialized && !this.disposed) { this.app.render(); this.app.stop(); }
  }

  private clearFragments() {
    this.fragments.forEach(({ container, face }) => {
      if (face instanceof Mesh) face.geometry.destroy();
      container.destroy({ children: true });
    });
    this.dust.forEach(({ graphic }) => graphic.destroy());
    this.fragments = []; this.dust = []; this.cells = [];
    this.fractureLines.clear(); this.fractureLines.visible = false;
    this.dustLayer.visible = true;
    this.reportMetrics();
  }

  destroy() {
    this.disposed = true; this.sourceVersion++;
    this.animation?.kill(); this.animation = undefined;
    this.audio.destroy(); this.releaseSource();
    this.clearFragments();
    this.frozen.texture = Texture.EMPTY; this.fractureMask.texture = Texture.EMPTY;
    this.iceFilter.resources.uSurfaceTexture = Texture.WHITE.source;
    this.surfaceTexture?.destroy(true);
    this.rawTexture?.destroy(true); this.statueTexture?.destroy(true);
    if (this.initialized) {
      this.app.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
      this.app.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
      this.app.ticker.remove(this.tick);
      this.app.destroy(true, { children: true, texture: false });
    }
    this.keyFilter.destroy(); this.iceFilter.destroy();
  }
}
