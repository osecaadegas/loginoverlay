const BETTER_WIDGET_NUDGES = Object.freeze({
  ArrowLeft: Object.freeze({ x: -1, y: 0 }),
  ArrowRight: Object.freeze({ x: 1, y: 0 }),
  ArrowUp: Object.freeze({ x: 0, y: -1 }),
  ArrowDown: Object.freeze({ x: 0, y: 1 }),
});

export function normalizeBetterCoordinate(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function getBetterWidgetNudge(key) {
  return BETTER_WIDGET_NUDGES[key] || null;
}
