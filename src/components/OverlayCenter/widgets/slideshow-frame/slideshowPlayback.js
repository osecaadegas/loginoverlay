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
