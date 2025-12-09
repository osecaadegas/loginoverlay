import { useEffect, useRef } from 'react';

const useDraggable = (enabled = true, storageKey = null) => {
  const elementRef = useRef(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    const handleMouseDown = (e) => {
      // Only drag if clicking the header or non-interactive area
      if (e.target.closest('button, input, select, textarea, a')) {
        return;
      }

      if (e.target.closest('.drag-handle') || !e.target.closest('.no-drag')) {
        isDragging.current = true;
        const rect = element.getBoundingClientRect();
        startPos.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        element.style.cursor = 'grabbing';
        e.preventDefault();
      }
    };

    const handleMouseMove = (e) => {
      if (!isDragging.current) return;

      currentPos.current = {
        x: e.clientX - startPos.current.x,
        y: e.clientY - startPos.current.y
      };

      // Keep within viewport bounds
      const maxX = window.innerWidth - element.offsetWidth;
      const maxY = window.innerHeight - element.offsetHeight;
      
      const x = Math.max(0, Math.min(currentPos.current.x, maxX));
      const y = Math.max(0, Math.min(currentPos.current.y, maxY));

      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.transform = 'none';
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        element.style.cursor = 'grab';
        
        // Save position to localStorage
        if (storageKey) {
          const position = {
            left: element.style.left,
            top: element.style.top
          };
          localStorage.setItem(`panel-position-${storageKey}`, JSON.stringify(position));
        }
      }
    };

    element.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Initialize position styles
    element.style.position = 'fixed';
    element.style.cursor = 'grab';
    
    // Try to restore position from localStorage or center the element
    requestAnimationFrame(() => {
      let positionRestored = false;
      
      if (storageKey) {
        const savedPosition = localStorage.getItem(`panel-position-${storageKey}`);
        if (savedPosition) {
          try {
            const { left, top } = JSON.parse(savedPosition);
            if (left && top) {
              element.style.left = left;
              element.style.top = top;
              element.style.transform = 'none';
              positionRestored = true;
            }
          } catch (e) {
            console.warn('Failed to restore panel position:', e);
          }
        }
      }
      
      // Center on first render if not already positioned and no saved position
      if (!positionRestored) {
        const x = (window.innerWidth - element.offsetWidth) / 2;
        const y = (window.innerHeight - element.offsetHeight) / 2;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.style.transform = 'none';
      }
    });

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enabled, storageKey]);

  return elementRef;
};

export default useDraggable;
