export type IntegrationMode = 'browser' | 'obs';
export type TransitionState = 'VISIBLE' | 'FREEZING' | 'FROZEN' | 'SHATTERING' | 'HIDDEN' | 'RECONSTRUCTING';
export type TransitionAction = 'freezeAndShatter' | 'reconstructWebcam' | 'toggleWebcamTransition' | 'resetWebcamTransition';
export type Direction = 'outward' | 'downward' | 'left' | 'right' | 'vortex';
export type Quality = 'Low' | 'Medium' | 'High' | 'Ultra';
export type TriggerMode = 'manual' | 'on_load' | 'loop';

export interface WidgetConfig {
  displayStyle: 'freeze_shatter';
  enabled: boolean;
  mode: IntegrationMode;
  source: string;
  sourceLabel: string;
  mirror: boolean;
  chromaColor: string;
  tolerance: number;
  softness: number;
  spill: number;
  duration: number;
  freezeDuration: number;
  fractureDelay: number;
  shatterDuration: number;
  reconstructionDuration: number;
  easing: 'cinematic' | 'smooth' | 'linear' | 'snappy';
  iceColor: string;
  frost: number;
  crystals: number;
  cracks: number;
  reflections: number;
  mist: number;
  glow: number;
  fragmentCount: number;
  variation: number;
  explosion: number;
  gravity: number;
  rotation: number;
  drag: number;
  direction: Direction;
  lifetime: number;
  sound: boolean;
  formationSound: 'crystalline' | 'deep' | 'none';
  crackingSound: 'sharp' | 'deep' | 'none';
  shatterSound: 'glass' | 'heavy' | 'none';
  formationVolume: number;
  crackingVolume: number;
  shatterVolume: number;
  quality: Quality;
  autoQuality: boolean;
  maxParticles: number;
  resolution: number;
  cleanup: boolean;
  triggerMode: TriggerMode;
  triggerDelay: number;
  hiddenDuration: number;
  subjectScale: number;
  subjectX: number;
  subjectY: number;
  obsUrl: string;
  obsScene: string;
  obsSource: string;
}

export const DEFAULT_CONFIG: WidgetConfig = {
  displayStyle: 'freeze_shatter', enabled: true, mode: 'browser', source: 'default', sourceLabel: '', mirror: false,
  chromaColor: '#00ff00', tolerance: 0.28, softness: 0.12, spill: 0.85,
  duration: 2.5, freezeDuration: 0.5, fractureDelay: 0.6, shatterDuration: 0.95,
  reconstructionDuration: 2.5, easing: 'cinematic',
  iceColor: '#9be8f5', frost: 0.72, crystals: 0.65, cracks: 0.7,
  reflections: 0.65, mist: 0.35, glow: 0.15,
  fragmentCount: 110, variation: 0.5, explosion: 1, gravity: 0.65,
  rotation: 0.7, drag: 0.25, direction: 'outward', lifetime: 1.1,
  sound: false, formationSound: 'crystalline', crackingSound: 'sharp', shatterSound: 'glass',
  formationVolume: 0.6, crackingVolume: 0.7, shatterVolume: 0.75,
  quality: 'High', autoQuality: true, maxParticles: 180, resolution: 1, cleanup: true,
  triggerMode: 'manual', triggerDelay: 0.8, hiddenDuration: 2.5,
  subjectScale: 1.08, subjectX: 0.5, subjectY: 1,
  obsUrl: 'ws://127.0.0.1:4455', obsScene: '', obsSource: '',
};

export const QUALITY_PRESETS: Record<Quality, Pick<WidgetConfig, 'resolution' | 'maxParticles' | 'fragmentCount'>> = {
  Low: { resolution: 0.5, maxParticles: 50, fragmentCount: 45 },
  Medium: { resolution: 0.75, maxParticles: 100, fragmentCount: 80 },
  High: { resolution: 1, maxParticles: 180, fragmentCount: 110 },
  Ultra: { resolution: 1.5, maxParticles: 300, fragmentCount: 150 },
};

const ranges: Partial<Record<keyof WidgetConfig, [number, number]>> = {
  tolerance: [0.01, 0.8], softness: [0.01, 0.4], spill: [0, 1],
  duration: [0.5, 5], freezeDuration: [0.05, 2], fractureDelay: [0, 2],
  shatterDuration: [0.1, 3], reconstructionDuration: [0.5, 5],
  frost: [0, 1], crystals: [0, 1], cracks: [0, 1], reflections: [0, 1], mist: [0, 1], glow: [0, 1],
  fragmentCount: [30, 200], variation: [0, 1], explosion: [0.1, 3], gravity: [0, 2],
  rotation: [0, 2], drag: [0, 1], lifetime: [0.2, 2],
  formationVolume: [0, 1], crackingVolume: [0, 1], shatterVolume: [0, 1],
  maxParticles: [30, 400], resolution: [0.5, 1.5], subjectScale: [0.3, 1.8],
  subjectX: [0, 1], subjectY: [0.3, 1.2],
  triggerDelay: [0, 30], hiddenDuration: [0.25, 60],
};

const enums: Partial<Record<keyof WidgetConfig, string[]>> = {
  displayStyle: ['freeze_shatter'],
  mode: ['browser', 'obs'], easing: ['cinematic', 'smooth', 'linear', 'snappy'],
  direction: ['outward', 'downward', 'left', 'right', 'vortex'], quality: ['Low', 'Medium', 'High', 'Ultra'],
  triggerMode: ['manual', 'on_load', 'loop'],
  formationSound: ['crystalline', 'deep', 'none'], crackingSound: ['sharp', 'deep', 'none'],
  shatterSound: ['glass', 'heavy', 'none'],
};

// Validate imported and persisted settings instead of trusting local storage or URLs.
export function sanitizeConfig(input: unknown): WidgetConfig {
  const result = { ...DEFAULT_CONFIG };
  if (!input || typeof input !== 'object') return result;
  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof WidgetConfig)[]) {
    const value = (input as Record<string, unknown>)[key];
    const fallback = DEFAULT_CONFIG[key];
    if (typeof value !== typeof fallback) continue;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) continue;
      const range = ranges[key];
      (result as unknown as Record<string, unknown>)[key] = range ? Math.max(range[0], Math.min(range[1], value)) : value;
    } else if (typeof value === 'string') {
      if (enums[key] && !enums[key]!.includes(value)) continue;
      if (key.toLowerCase().includes('color') && !/^#[0-9a-f]{6}$/i.test(value)) continue;
      (result as unknown as Record<string, unknown>)[key] = value.slice(0, 300);
    } else (result as unknown as Record<string, unknown>)[key] = value;
  }
  result.fragmentCount = Math.round(result.fragmentCount);
  result.maxParticles = Math.round(result.maxParticles);
  return result;
}

export const STORAGE_KEY = 'streamerscenter:freeze-shatter:v1';

export function loadConfig(): WidgetConfig {
  try {
    const encoded = new URLSearchParams(location.search).get('config');
    if (encoded) return sanitizeConfig(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded), character => character.charCodeAt(0)))));
    return sanitizeConfig(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch { return { ...DEFAULT_CONFIG }; }
}

export function getOutputUrl(config: WidgetConfig): string {
  const url = new URL(location.origin + location.pathname);
  url.searchParams.set('output', '1');
  url.searchParams.set('config', btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(config)))));
  return url.toString();
}

export function phaseTimings(config: WidgetConfig) {
  const sum = config.freezeDuration + config.fractureDelay + config.shatterDuration + 0.45;
  const factor = config.duration / sum;
  return {
    freeze: config.freezeDuration * factor,
    frozen: (config.freezeDuration + config.fractureDelay) * factor,
    fracture: (config.freezeDuration + config.fractureDelay + 0.25) * factor,
    shatter: (sum - 0.2) * factor,
    end: config.duration,
  };
}
