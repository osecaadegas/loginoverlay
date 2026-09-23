export const SLOT_BINGO_LABELS = Object.freeze([
  "100x+", "RETRIG", "4 SCAT", "<20x", "500x+",
  "NATURAL", "10 DEAD", "200x+", "BONUS BUY", "BEST WIN",
  "50x BASE", "2 RETRIG", "FREE", "1000x+", "WORST",
  "TEASE", "PROFIT", "BE HIT", "MAX WIN", "3 <50x",
  "WILD LINE", "BIG MULTI", "FEATURE", "DEAD SPIN", "COLLECT",
]);

const DEFAULT_COMPLETED = new Set([
  0, 1, 3, 5, 6, 7, 10, 11, 12, 13, 15, 16, 17, 18, 19, 21, 24,
]);

export const DEFAULT_SLOT_BINGO_SQUARES = Object.freeze(
  SLOT_BINGO_LABELS.map((label, index) => Object.freeze({
    id: index === 12 ? "free" : `square-${index + 1}`,
    label,
    completed: DEFAULT_COMPLETED.has(index),
    free: index === 12,
  })),
);

export const SLOT_BINGO_DEFAULT_CONFIG = Object.freeze({
  displayStyle: "premium_slot_bingo",
  title: "SLOT BINGO",
  footerMode: "bingo",
  showProgress: true,
  showFooter: true,
  squares: DEFAULT_SLOT_BINGO_SQUARES,
  backgroundColor: "#07050d",
  panelColor: "#110c1e",
  cardColor: "#171426",
  borderColor: "#7247d9",
  accentColor: "#ffbf3f",
  secondaryColor: "#a855f7",
  completedColor: "#ffb21f",
  textColor: "#f7f3ff",
  mutedColor: "#a9a2be",
  borderRadius: 26,
  cardRadius: 12,
  cardGap: 8,
  padding: 16,
  glowIntensity: 46,
  fontFamily: "'Rajdhani', sans-serif",
  titleSize: 34,
  squareTextSize: 17,
  footerSize: 28,
});

const BINGO_LINES = Object.freeze([
  [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24], [4, 8, 12, 16, 20],
]);

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function normalizeSlotBingoSquares(squares) {
  const source = Array.isArray(squares) ? squares : [];
  return DEFAULT_SLOT_BINGO_SQUARES.map((fallback, index) => {
    const square = source[index] && typeof source[index] === "object" ? source[index] : {};
    const isFree = index === 12;
    return {
      id: fallback.id,
      label: isFree
        ? "FREE"
        : String(square.label ?? fallback.label).trim().slice(0, 18) || fallback.label,
      completed: isFree || square.completed === true,
      free: isFree,
    };
  });
}

export function normalizeSlotBingoConfig(config = {}) {
  const merged = { ...SLOT_BINGO_DEFAULT_CONFIG, ...config };
  return {
    ...merged,
    displayStyle: "premium_slot_bingo",
    title: String(merged.title || "SLOT BINGO").trim().slice(0, 32) || "SLOT BINGO",
    footerMode: merged.footerMode === "lines" ? "lines" : "bingo",
    showProgress: merged.showProgress !== false,
    showFooter: merged.showFooter !== false,
    squares: normalizeSlotBingoSquares(merged.squares),
    borderRadius: clampNumber(merged.borderRadius, 0, 72, 26),
    cardRadius: clampNumber(merged.cardRadius, 0, 40, 12),
    cardGap: clampNumber(merged.cardGap, 2, 24, 8),
    padding: clampNumber(merged.padding, 8, 40, 16),
    glowIntensity: clampNumber(merged.glowIntensity, 0, 100, 46),
    titleSize: clampNumber(merged.titleSize, 18, 56, 34),
    squareTextSize: clampNumber(merged.squareTextSize, 9, 28, 17),
    footerSize: clampNumber(merged.footerSize, 16, 44, 28),
  };
}

export function countSlotBingoLines(squares) {
  const normalized = normalizeSlotBingoSquares(squares);
  return BINGO_LINES.filter((line) => line.every((index) => normalized[index].completed)).length;
}

export function countCompletedSlotBingoSquares(squares) {
  return normalizeSlotBingoSquares(squares).filter((square) => square.completed).length;
}
