export const BETTER_HUNT_HORIZONTAL_HEIGHT = 220;

const REQUEST_ROWS = { compact: 3, image: 2, names: 4 };
const REQUEST_PITCH = { compact: 44, image: 56, names: 30 };

export function getHorizontalRequestRows(config = {}) {
  const fallback = REQUEST_ROWS[config.listMode] || REQUEST_ROWS.compact;
  const value = Number(config.requestVisibleRows ?? fallback);
  return Math.round(
    Math.max(1, Math.min(8, Number.isFinite(value) ? value : fallback)),
  );
}

export function getHorizontalRequestPitch(config = {}) {
  const scale = Math.max(1, Math.min(1.35, Number(config.uiScale) || 1));
  return Math.ceil(
    (REQUEST_PITCH[config.listMode] || REQUEST_PITCH.compact) *
      Math.max(1, scale / 1.2),
  );
}

export function getHorizontalHuntMinHeight(config = {}) {
  const scale = Math.max(0.75, Math.min(1.35, Number(config.uiScale) || 1));
  const contentHeight =
    BETTER_HUNT_HORIZONTAL_HEIGHT + Math.ceil(Math.max(0, scale - 1.2) * 100);
  // Include the total-pay footer used before Best/Worst moves into its side column.
  const requestsHeight =
    config.showRequests !== false && config.requestView !== "carousel"
      ? getHorizontalRequestRows(config) * getHorizontalRequestPitch(config) +
        88
      : 0;
  return Math.max(contentHeight, requestsHeight);
}

export function getHorizontalHuntHeight(config = {}) {
  // A separate preference prevents legacy tall panel sizes from defeating Auto.
  const requested = Number(config.horizontalHeight) || 0;
  return Math.min(980, Math.max(getHorizontalHuntMinHeight(config), requested));
}
