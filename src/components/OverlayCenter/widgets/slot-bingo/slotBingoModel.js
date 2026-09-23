export const SLOT_BINGO_LABELS = Object.freeze([
  "100x+", "RETRIG", "4 SCAT", "<20x", "500x+",
  "NATURAL", "10 DEAD", "200x+", "BONUS BUY", "BEST WIN",
  "50x BASE", "2 RETRIG", "FREE", "1000x+", "WORST",
  "TEASE", "PROFIT", "BE HIT", "MAX WIN", "3 <50x",
  "WILD LINE", "BIG MULTI", "FEATURE", "DEAD SPIN", "COLLECT",
]);

export const SLOT_BINGO_COLUMNS = 5;
export const SLOT_BINGO_ROW_OPTIONS = Object.freeze([3, 5]);

export const SLOT_BINGO_DEFAULT_MULTIPLIERS = Object.freeze([
  100, 10, 25, 20, 500,
  15, 5, 200, 25, 50,
  50, 10, 0, 1000, 5,
  10, 25, 10, 5000, 50,
  50, 100, 25, 5, 50,
]);

const DEFAULT_COMPLETED = new Set([
  0, 1, 3, 5, 6, 7, 10, 11, 12, 13, 15, 16, 17, 18, 19, 21, 24,
]);

export const DEFAULT_SLOT_BINGO_SQUARES = Object.freeze(
  SLOT_BINGO_LABELS.map((label, index) => Object.freeze({
    id: index === 12 ? "free" : `square-${index + 1}`,
    label,
    multiplier: SLOT_BINGO_DEFAULT_MULTIPLIERS[index],
    completed: DEFAULT_COMPLETED.has(index),
    free: index === 12,
  })),
);

export const SLOT_BINGO_DEFAULT_CONFIG = Object.freeze({
  displayStyle: "premium_slot_bingo",
  title: "SLOT BINGO",
  boardRows: 5,
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

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function normalizeSlotBingoRows(value) {
  return Number(value) === 3 ? 3 : 5;
}

export function getSlotBingoSquareCount(boardRows = 5) {
  return normalizeSlotBingoRows(boardRows) * SLOT_BINGO_COLUMNS;
}

export function normalizeSlotBingoSquares(squares, boardRows = 5) {
  const rows = normalizeSlotBingoRows(boardRows);
  const source = Array.isArray(squares) ? squares : [];
  const targetFreeIndex = Math.floor(getSlotBingoSquareCount(rows) / 2);
  const defaultSquares = DEFAULT_SLOT_BINGO_SQUARES.map((square) => ({ ...square }));
  if (targetFreeIndex !== 12) {
    [defaultSquares[targetFreeIndex], defaultSquares[12]] = [defaultSquares[12], defaultSquares[targetFreeIndex]];
  }
  const working = defaultSquares.map((fallback, index) => ({
    ...fallback,
    ...(source[index] && typeof source[index] === "object" ? source[index] : {}),
  }));
  let currentFreeIndex = working.findIndex((square) => square.free === true);
  if (currentFreeIndex < 0) {
    currentFreeIndex = working.findIndex((square) => String(square.label || "").trim().toUpperCase() === "FREE");
  }
  if (currentFreeIndex >= 0 && currentFreeIndex !== targetFreeIndex) {
    [working[currentFreeIndex], working[targetFreeIndex]] = [working[targetFreeIndex], working[currentFreeIndex]];
  }

  return working.map((square, index) => {
    const isFree = index === targetFreeIndex;
    const fallback = defaultSquares[index];
    return {
      id: isFree ? "free" : `square-${index + 1}`,
      label: isFree
        ? "FREE"
        : String(square.label ?? fallback.label).trim().slice(0, 18) || fallback.label,
      multiplier: clampNumber(square.multiplier, 0, 100000, fallback.multiplier),
      completed: isFree || square.completed === true,
      free: isFree,
    };
  });
}

export function normalizeSlotBingoConfig(config = {}) {
  const merged = { ...SLOT_BINGO_DEFAULT_CONFIG, ...config };
  const boardRows = normalizeSlotBingoRows(merged.boardRows);
  return {
    ...merged,
    displayStyle: "premium_slot_bingo",
    title: String(merged.title || "SLOT BINGO").trim().slice(0, 32) || "SLOT BINGO",
    boardRows,
    footerMode: merged.footerMode === "lines" ? "lines" : "bingo",
    showProgress: merged.showProgress !== false,
    showFooter: merged.showFooter !== false,
    squares: normalizeSlotBingoSquares(merged.squares, boardRows),
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

function getSlotBingoLines(boardRows = 5) {
  const rows = normalizeSlotBingoRows(boardRows);
  const horizontal = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: SLOT_BINGO_COLUMNS }, (_, column) => row * SLOT_BINGO_COLUMNS + column),
  );
  const vertical = Array.from({ length: SLOT_BINGO_COLUMNS }, (_, column) =>
    Array.from({ length: rows }, (_, row) => row * SLOT_BINGO_COLUMNS + column),
  );
  const diagonals = rows === 3
    ? [[0, 7, 14], [4, 7, 10]]
    : [[0, 6, 12, 18, 24], [4, 8, 12, 16, 20]];
  return [...horizontal, ...vertical, ...diagonals];
}

export function countSlotBingoLines(squares, boardRows = 5) {
  const normalized = normalizeSlotBingoSquares(squares, boardRows);
  return getSlotBingoLines(boardRows).filter((line) => line.every((index) => normalized[index].completed)).length;
}

export function countCompletedSlotBingoSquares(squares, boardRows = 5) {
  return normalizeSlotBingoSquares(squares, boardRows)
    .slice(0, getSlotBingoSquareCount(boardRows))
    .filter((square) => square.completed).length;
}

export function formatSlotBingoMultiplier(value) {
  const multiplier = clampNumber(value, 0, 100000, 0);
  return `${Number.isInteger(multiplier) ? multiplier : Number(multiplier.toFixed(2))}x`;
}
