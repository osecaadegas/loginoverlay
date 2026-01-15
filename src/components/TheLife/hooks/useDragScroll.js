import { useRef, useState, useEffect } from 'react';

/**
 * Custom hook for horizontal drag-to-scroll functionality
 * @param {React.RefObject} scrollRef - Reference to the scrollable container
 * @returns {Object} - Mouse event handlers to apply to the container
 */
export function useDragScroll(scrollRef) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e) => {
    if (!scrollRef.current) return;
    
    // Don't start drag if clicking on a button or interactive element
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
  };

  const handleMouseUp = () => {
    if (!scrollRef.current) return;
    setIsDragging(false);
    scrollRef.current.style.cursor = 'grab';
    scrollRef.current.style.userSelect = '';
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseLeave = () => {
    if (!scrollRef.current) return;
    setIsDragging(false);
    scrollRef.current.style.cursor = 'grab';
    scrollRef.current.style.userSelect = '';
  };

  // Set initial cursor style
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
    }
  }, [scrollRef]);

  return {
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    isDragging
  };
}
