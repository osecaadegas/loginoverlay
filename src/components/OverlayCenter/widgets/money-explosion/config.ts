export type MoneyTransitionState = 'VISIBLE' | 'TRANSFORMING' | 'EXPLODING' | 'FALLING' | 'HIDDEN' | 'RECONSTRUCTING';
export type MoneyAction = 'moneyExplosion' | 'moneyReconstruction' | 'toggleMoneyTransition' | 'resetMoneyTransition' | 'preview';
export type MoneyQuality = 'Low' | 'Medium' | 'High' | 'Ultra';
export type MoneyTriggerMode = 'manual' | 'on_load' | 'loop';
export type BanknoteStyle = 'dollar' | 'euro' | 'custom';

export interface MoneyExplosionConfig {
  displayStyle: 'money_explosion';
  enabled: boolean;
  source: string;
  sourceLabel: string;
  mirror: boolean;
  chromaColor: string;
  tolerance: number;
  softness: number;
  spill: number;
  subjectScale: number;
  subjectX: number;
  subjectY: number;
  duration: number;
  reconstructionDuration: number;
  triggerMode: MoneyTriggerMode;
  triggerDelay: number;
  hiddenDuration: number;
  banknoteStyle: BanknoteStyle;
  customFrontTexture: string;
  customBackTexture: string;
  banknoteCount: number;
  minBanknoteSize: number;
  maxBanknoteSize: number;
  sizeVariation: number;
  explosionForce: number;
  radialSpread: number;
  directionalBias: number;
  upwardVelocity: number;
  depthIntensity: number;
  motionBlur: number;
  gravity: number;
  airResistance: number;
  flutter: number;
  rotationSpeed: number;
  horizontalWind: number;
  fallingSpeed: number;
  exitAcceleration: number;
  goldenFlash: boolean;
  burstParticles: boolean;
  lightingIntensity: number;
  particleDensity: number;
  sound: boolean;
  explosionSound: boolean;
  flutterSound: boolean;
  explosionVolume: number;
  flutterVolume: number;
  quality: MoneyQuality;
  autoQuality: boolean;
  resolution: number;
  cleanup: boolean;
}

export const DEFAULT_MONEY_EXPLOSION_CONFIG: MoneyExplosionConfig = {
  displayStyle: 'money_explosion', enabled: true, source: 'default', sourceLabel: '', mirror: false,
  chromaColor: '#00ff00', tolerance: 0.28, softness: 0.12, spill: 0.85,
  subjectScale: 1.08, subjectX: 0.5, subjectY: 1,
  duration: 3, reconstructionDuration: 3, triggerMode: 'manual', triggerDelay: 0.8, hiddenDuration: 2.5,
  banknoteStyle: 'dollar', customFrontTexture: '', customBackTexture: '', banknoteCount: 180,
  minBanknoteSize: 34, maxBanknoteSize: 76, sizeVariation: 0.72,
  explosionForce: 1.15, radialSpread: 0.78, directionalBias: 0, upwardVelocity: 0.72,
  depthIntensity: 0.75, motionBlur: 0.32,
  gravity: 1, airResistance: 0.2, flutter: 0.72, rotationSpeed: 0.8,
  horizontalWind: 0, fallingSpeed: 1, exitAcceleration: 1,
  goldenFlash: true, burstParticles: true, lightingIntensity: 0.7, particleDensity: 0.55,
  sound: false, explosionSound: true, flutterSound: true, explosionVolume: 0.72, flutterVolume: 0.35,
  quality: 'High', autoQuality: true, resolution: 1, cleanup: true,
};

export const MONEY_QUALITY_PRESETS: Record<MoneyQuality, Pick<MoneyExplosionConfig, 'resolution' | 'banknoteCount' | 'particleDensity'>> = {
  Low: { resolution: 0.5, banknoteCount: 70, particleDensity: 0.25 },
  Medium: { resolution: 0.75, banknoteCount: 130, particleDensity: 0.4 },
  High: { resolution: 1, banknoteCount: 180, particleDensity: 0.55 },
  Ultra: { resolution: 1.25, banknoteCount: 320, particleDensity: 0.8 },
};

const ranges: Partial<Record<keyof MoneyExplosionConfig, [number, number]>> = {
  tolerance: [0.01, 0.8], softness: [0.01, 0.4], spill: [0, 1], subjectScale: [0.3, 1.8], subjectX: [0, 1], subjectY: [0.3, 1.2],
  duration: [1.5, 6], reconstructionDuration: [1.5, 6], triggerDelay: [0, 30], hiddenDuration: [0.25, 60], banknoteCount: [50, 400],
  minBanknoteSize: [16, 100], maxBanknoteSize: [24, 160], sizeVariation: [0, 1], explosionForce: [0.2, 3], radialSpread: [0, 1],
  directionalBias: [-1, 1], upwardVelocity: [0, 2], depthIntensity: [0, 1], motionBlur: [0, 1], gravity: [0.1, 2.5],
  airResistance: [0, 0.75], flutter: [0, 2], rotationSpeed: [0, 2], horizontalWind: [-1, 1], fallingSpeed: [0.25, 2],
  exitAcceleration: [0.25, 3], lightingIntensity: [0, 1], particleDensity: [0, 1], explosionVolume: [0, 1], flutterVolume: [0, 1], resolution: [0.5, 1.5],
};

const enums: Partial<Record<keyof MoneyExplosionConfig, string[]>> = {
  displayStyle: ['money_explosion'], triggerMode: ['manual', 'on_load', 'loop'], banknoteStyle: ['dollar', 'euro', 'custom'], quality: ['Low', 'Medium', 'High', 'Ultra'],
};

const safeImage = (value: unknown) => typeof value === 'string' && (value === '' || /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)) && value.length <= 2_100_000;

export function sanitizeMoneyExplosionConfig(input: unknown): MoneyExplosionConfig {
  const result = { ...DEFAULT_MONEY_EXPLOSION_CONFIG };
  if (!input || typeof input !== 'object') return result;
  for (const key of Object.keys(result) as (keyof MoneyExplosionConfig)[]) {
    const value = (input as Record<string, unknown>)[key];
    const fallback = result[key];
    if (typeof value !== typeof fallback) continue;
    if (key === 'customFrontTexture' || key === 'customBackTexture') {
      if (safeImage(value)) (result as unknown as Record<string, unknown>)[key] = value;
      continue;
    }
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
  result.banknoteCount = Math.round(result.banknoteCount);
  result.minBanknoteSize = Math.round(result.minBanknoteSize);
  result.maxBanknoteSize = Math.max(result.minBanknoteSize, Math.round(result.maxBanknoteSize));
  return result;
}

export function moneyPhaseTimings(config: MoneyExplosionConfig) {
  const factor = config.duration / 3;
  return { transform: 0.35 * factor, explode: 0.85 * factor, rain: 2.7 * factor, end: config.duration };
}
