import React, { useEffect, useState } from 'react';
import { DEFAULT_SLOT_IMAGE } from '../../../utils/slotUtils';

export default function SlotImage({ src, alt, className, ...props }) {
  const [currentSrc, setCurrentSrc] = useState(src || DEFAULT_SLOT_IMAGE);

  useEffect(() => {
    setCurrentSrc(src || DEFAULT_SLOT_IMAGE);
  }, [src]);

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt || 'Slot image'}
      className={className}
      draggable={false}
      onError={() => {
        if (currentSrc !== DEFAULT_SLOT_IMAGE) setCurrentSrc(DEFAULT_SLOT_IMAGE);
      }}
    />
  );
}
