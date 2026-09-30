export const DEFAULT_VIDEO_END_HOLD_MS = 5_000;

export function resolveVideoEndHoldMs(value) {
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds)) return DEFAULT_VIDEO_END_HOLD_MS;
  return Math.min(30_000, Math.max(0, Math.round(milliseconds)));
}

export function shouldUseSlideTimer({
  autoplay,
  connectFourActive,
  itemCount,
  activeType,
}) {
  return (
    autoplay !== false &&
    connectFourActive !== true &&
    itemCount > 1 &&
    activeType !== "video"
  );
}

export function shouldAdvanceCompletedVideo({
  autoplay,
  connectFourActive,
  itemCount,
}) {
  return autoplay !== false && connectFourActive !== true && itemCount > 1;
}

export function shouldLoopVideo({ itemCount, videoLoop }) {
  return itemCount <= 1 && videoLoop !== false;
}
