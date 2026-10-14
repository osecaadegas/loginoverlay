import type { Direction, WidgetConfig } from './config';

export interface Point { x: number; y: number }
export interface Cell { center: Point; polygon: Point[]; seed: number }
export interface Body { x: number; y: number; rotation: number; scale: number; alpha: number }

export function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function clipPolygon(polygon: Point[], normalX: number, normalY: number, offset: number): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const da = a.x * normalX + a.y * normalY - offset;
    const db = b.x * normalX + b.y * normalY - offset;
    if (da <= 0.0001) result.push(a);
    if ((da < 0) !== (db < 0)) {
      const t = da / (da - db);
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return result;
}

/** Convex Voronoi cells, with every seed sampled from the actual captured alpha. */
export function createSilhouetteCells(
  width: number, height: number, count: number,
  alphaAt: (x: number, y: number) => number,
  variation = 0.5, seed = 941,
): Cell[] {
  const random = seededRandom(seed);
  const points: Point[] = [];
  const minDistance = Math.sqrt(width * height / Math.max(count, 1)) * (0.12 + (1 - variation) * 0.22);
  for (let attempts = 0; points.length < count && attempts < count * 350; attempts++) {
    const point = { x: random() * width, y: random() * height };
    if (alphaAt(point.x, point.y) < 32) continue;
    if (points.some(p => Math.hypot(p.x - point.x, p.y - point.y) < minDistance)) continue;
    points.push(point);
  }
  return points.map((point, index) => {
    // Seeds only exist inside the keyed silhouette. Starting every Voronoi
    // cell at the full viewport made boundary cells stretch into enormous
    // transparent triangles whose lit rims crossed the entire OBS source.
    // A local clipping envelope keeps fragments physically believable while
    // still overlapping enough to cover the captured body.
    const reach = Math.max(44, Math.min(132, Math.sqrt(width * height / Math.max(count, 1)) * 1.08));
    let polygon: Point[] = [
      { x: Math.max(0, point.x - reach), y: Math.max(0, point.y - reach) },
      { x: Math.min(width, point.x + reach), y: Math.max(0, point.y - reach) },
      { x: Math.min(width, point.x + reach), y: Math.min(height, point.y + reach) },
      { x: Math.max(0, point.x - reach), y: Math.min(height, point.y + reach) },
    ];
    for (let j = 0; j < points.length && polygon.length; j++) {
      if (index === j) continue;
      const other = points[j];
      const nx = other.x - point.x;
      const ny = other.y - point.y;
      const offset = (other.x * other.x + other.y * other.y - point.x * point.x - point.y * point.y) / 2;
      polygon = clipPolygon(polygon, nx, ny, offset);
    }
    return { center: point, polygon, seed: random() };
  }).filter(cell => cell.polygon.length >= 3);
}

export function initialVelocity(center: Point, width: number, height: number, seed: number, direction: Direction) {
  let dx = (center.x - width * 0.5) / width;
  let dy = (center.y - height * 0.55) / height;
  const distance = Math.hypot(dx, dy) || 0.01;
  dx /= distance;
  dy /= distance;
  if (direction === 'downward') { dx *= 0.4; dy = 0.6 + seed; }
  if (direction === 'left') { dx = -1 - seed * 0.5; dy *= 0.5; }
  if (direction === 'right') { dx = 1 + seed * 0.5; dy *= 0.5; }
  if (direction === 'vortex') { const x = dx; dx = -dy * 1.4; dy = x * 1.4 - 0.4; }
  return { x: dx * (220 + seed * 320), y: dy * (180 + seed * 260) - 110 };
}

// Analytic integration makes seeking and reverse reconstruction deterministic.
export function sampleBody(cell: Cell, progress: number, width: number, height: number, config: WidgetConfig): Body {
  const p = Math.max(0, Math.min(1, progress));
  const t = p * config.shatterDuration;
  const velocity = initialVelocity(cell.center, width, height, cell.seed, config.direction);
  const drag = config.drag * 3;
  const displacement = drag > 0.001 ? (1 - Math.exp(-drag * t)) / drag : t;
  const lifetimeProgress = p / Math.min(1, config.lifetime / Math.max(0.1, config.shatterDuration));
  return {
    x: cell.center.x + velocity.x * displacement * config.explosion,
    y: cell.center.y + velocity.y * displacement * config.explosion + config.gravity * 420 * t * t,
    rotation: (cell.seed - 0.5) * config.rotation * 14 * t,
    scale: Math.max(0.2, 1 + (cell.seed - 0.45) * t * 0.8),
    alpha: p >= 1 ? 0 : Math.max(0, Math.min(1, (1 - lifetimeProgress) / 0.33)),
  };
}

export function polygonArea(points: Point[]) {
  return Math.abs(points.reduce((area, p, i) => {
    const n = points[(i + 1) % points.length];
    return area + p.x * n.y - n.x * p.y;
  }, 0)) / 2;
}
