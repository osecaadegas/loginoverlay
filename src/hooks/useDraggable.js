import { useEffect, useRef } from 'react';

const useDraggable = (enabled = true, storageKey = null) => {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;

    const onMouseDown = (e) => {
      // Only start drag from drag-handle
      const dragHandle = e.target.closest('.drag-handle');
      if (!dragHandle) return;

      // Skip buttons and inputs
      if (e.target.closest('button, input, select, textarea')) return;

      isDragging = true;

      // Where did we click inside the element?
      const rect = element.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      element.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      e.preventDefault();
      e.stopPropagation();
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;

      e.preventDefault();

      // New position = mouse position - offset
      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;

      // Constrain vertically only
      const maxY = window.innerHeight - element.offsetHeight;
      const finalY = Math.max(0, Math.min(newY, maxY));

      element.style.left = `${newX}px`;
      element.style.top = `${finalY}px`;
    };

    const onMouseUp = () => {
      if (!isDragging) return;

      isDragging = false;
      element.style.cursor = 'grab';
      document.body.style.userSelect = '';

      // Save position
      if (storageKey) {
        localStorage.setItem(`drag-${storageKey}`, JSON.stringify({
          left: element.style.left,
          top: element.style.top
        }));
      }
    };

    // Setup
    element.style.position = 'fixed';
    element.style.cursor = 'grab';
    element.style.margin = '0';
    element.style.transform = 'none';

    // Initial position
    setTimeout(() => {
      let restored = false;

      if (storageKey) {
        try {
          const saved = localStorage.getItem(`drag-${storageKey}`);
          if (saved) {
            const pos = JSON.parse(saved);
            element.style.left = pos.left;
            element.style.top = pos.top;
            restored = true;
          }
        } catch (e) {}
      }

      if (!restored) {
        const x = Math.max(0, (window.innerWidth - element.offsetWidth) / 2);
        const y = Math.max(0, (window.innerHeight - element.offsetHeight) / 2);
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
      }
    }, 10);

    // Attach listeners
    element.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      element.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [enabled, storageKey]);

  return elementRef;
};

export { useDraggable };
export default useDraggable;
