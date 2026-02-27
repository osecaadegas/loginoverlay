import React from 'react';

export default function CurrentSlotWidget({ config, theme }) {
  const c = config || {};
  const currency = c.currency || '€';

  return (
    <div className={`oc-widget-inner oc-currentslot ${!c.slotName ? 'oc-currentslot--empty' : ''}`}>
      {!c.slotName && <span className="oc-widget-empty">No slot selected</span>}
      {c.imageUrl && (
        <div className="oc-cs-img">
          <img src={c.imageUrl} alt={c.slotName} loading="lazy" />
        </div>
      )}
      <div className="oc-cs-info">
        <h3 className="oc-cs-name">{c.slotName}</h3>
        {c.provider && <span className="oc-cs-provider">{c.provider}</span>}
        <div className="oc-cs-meta">
          {c.betSize > 0 && <span className="oc-cs-bet">Bet: {currency}{c.betSize}</span>}
          {c.rtp && <span className="oc-cs-rtp">RTP: {c.rtp}%</span>}
        </div>
      </div>
    </div>
  );
}
