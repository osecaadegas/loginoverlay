import React, { useEffect, useState } from 'react';
import { DEFAULT_SLOT_IMAGE } from '../../../utils/slotUtils';

export default function SlotImage({ src, alt, className, fit = 'cover', ...props }) {
  const [currentSrc, setCurrentSrc] = useState(src || DEFAULT_SLOT_IMAGE);
  const { style, ...imgProps } = props;
  const objectFit = style?.objectFit || fit;
  const objectPosition = style?.objectPosition || 'center center';

  useEffect(() => {
    setCurrentSrc(src || DEFAULT_SLOT_IMAGE);
  }, [src]);

  return (
    <img
      {...imgProps}
      src={currentSrc}
      alt={alt || 'Slot image'}
      className={['oc-slot-image-fill', className].filter(Boolean).join(' ')}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        ...style,
        objectFit,
        objectPosition,
      }}
      draggable={false}
      onError={() => {
        if (currentSrc !== DEFAULT_SLOT_IMAGE) setCurrentSrc(DEFAULT_SLOT_IMAGE);
      }}
    />
  );
}
