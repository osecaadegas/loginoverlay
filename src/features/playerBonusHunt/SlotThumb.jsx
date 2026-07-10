import { useState } from 'react';

export default function SlotThumb({ src, name, size = 'md' }) {
  const [failed, setFailed] = useState(!src);
  return (
    <div className={`pbh-slot-thumb pbh-slot-thumb--${size}`}>
      {!failed && src ? (
        <img src={src} alt={name ? `${name} slot artwork` : 'Slot artwork'} onError={() => setFailed(true)} />
      ) : (
        <span>{(name || '?').slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
}
