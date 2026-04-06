/**
 * noise.js — Cheap pseudo-noise for organic, non-repeating motion
 *
 * Uses layered sine waves with irrational frequency ratios
 * to produce smooth, never-exactly-repeating curves.
 * Much cheaper than Perlin/Simplex, good enough for bone animation.
 */

// Irrational-ish frequency multipliers (golden ratio relatives)
const PHI = 1.6180339887;
const SQRT3 = 1.7320508075;
const SQRT5 = 2.2360679775;

/**
 * 1D noise: returns value in [-1, 1].
 * @param {number} t     — time
 * @param {number} seed  — offset seed (use different values for different bones)
 * @param {number} freq  — base frequency (default 1.0)
 */
export function noise1D(t, seed = 0, freq = 1.0) {
  const s = t * freq + seed;
  return (
    Math.sin(s * 1.0) * 0.4 +
    Math.sin(s * PHI + 1.3) * 0.3 +
    Math.sin(s * SQRT3 + 2.7) * 0.2 +
    Math.sin(s * SQRT5 + 4.1) * 0.1
  );
}

/**
 * 2D noise: returns { x, y } each in [-1, 1].
 */
export function noise2D(t, seed = 0, freq = 1.0) {
  return {
    x: noise1D(t, seed, freq),
    y: noise1D(t, seed + 100, freq * PHI),
  };
}

/**
 * Smooth random timer: returns true approximately every `avgInterval` seconds.
 * Uses noise to jitter the exact timing so it's never predictable.
 */
export function shouldTrigger(timer, avgInterval, dt) {
  // Probability per frame scales with dt
  const chance = dt / avgInterval;
  return Math.random() < chance;
}

/**
 * Weighted random pick from { key: weight } map. Excludes one key.
 */
export function weightedPick(weights, exclude) {
  const entries = Object.entries(weights).filter(([k]) => k !== exclude);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return entries[0]?.[0];
  let r = Math.random() * total;
  for (const [key, weight] of entries) { r -= weight; if (r <= 0) return key; }
  return entries[0]?.[0];
}

/**
 * Smooth lerp toward a target, framerate-independent.
 * @param {number} current
 * @param {number} target
 * @param {number} speed  — higher = faster convergence (typically 2-8)
 * @param {number} dt
 */
export function smoothLerp(current, target, speed, dt) {
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}
