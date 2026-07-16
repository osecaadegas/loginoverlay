import { useCallback, useEffect, useRef, useState } from 'react';

export function useSlotRequestCarousel({ total = 0, autoSpeed = 3000, autoplay = true } = {}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef(null);
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeSpeed = Math.max(800, Number(autoSpeed) || 3000);

  const clearTimer = useCallback(() => {
    if (!timerRef.current) return;
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const advance = useCallback(() => {
    if (safeTotal <= 0) return;
    setActiveIdx(previous => (previous + 1) % safeTotal);
  }, [safeTotal]);

  const resetInterval = useCallback(() => {
    clearTimer();
    if (!autoplay || safeTotal <= 1) return;
    timerRef.current = setInterval(advance, safeSpeed);
  }, [advance, autoplay, clearTimer, safeSpeed, safeTotal]);

  const selectIndex = useCallback((index) => {
    if (safeTotal <= 0) return;
    const next = Math.min(safeTotal - 1, Math.max(0, Number(index) || 0));
    setActiveIdx(next);
    resetInterval();
  }, [resetInterval, safeTotal]);

  useEffect(() => {
    resetInterval();
    return clearTimer;
  }, [clearTimer, resetInterval]);

  useEffect(() => {
    if (activeIdx >= safeTotal && safeTotal > 0) setActiveIdx(0);
  }, [activeIdx, safeTotal]);

  return {
    activeIdx,
    setActiveIdx: selectIndex,
    selectIndex,
    resetInterval,
  };
}

export default useSlotRequestCarousel;
