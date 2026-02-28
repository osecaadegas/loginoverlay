import React from 'react';

export default function RandomSlotPickerWidget({ config }) {
  const c = config || {};
  return (
    <div className={`overlay-random-picker ${c.picking ? 'is-picking' : ''}`} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {c.selectedSlot ? (
        <div className="overlay-random-picker-result">
          {c.selectedSlot.image && <img src={c.selectedSlot.image} alt={c.selectedSlot.name} />}
          <span>{c.selectedSlot.name}</span>
        </div>
      ) : (
        <div className="overlay-random-picker-idle">Random Slot Picker</div>
      )}
    </div>
  );
}
