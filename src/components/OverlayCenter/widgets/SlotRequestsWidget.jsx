/**
 * SlotRequestsWidget.jsx - Main dispatcher for the Slot Requests widget.
 *
 * Responsibilities:
 *   1. Read normalized request data from the shared data adapter.
 *   2. Delegate rendering to the active display style component.
 *
 * Twitch IRC listening remains app-level in useSlotRequestListener.js. No
 * presentation style should open its own database, chat, or socket listener.
 */
import React from 'react';
import SlotRequestsMinimal from './SlotRequestsMinimal';
import SlotRequestsCardStack from './SlotRequestsCardStack';
import SlotRequestsCompactOverlay from './SlotRequestsCompactOverlay';
import SlotRequestsCompactEditable from './slot-requests/styles/compact-editable/SlotRequestsCompactEditable';
import { useSlotRequestsData } from './slot-requests/shared/useSlotRequestsData';

export default function SlotRequestsWidget({ config, userId }) {
  const c = config || {};
  const { requests } = useSlotRequestsData({ config: c, userId });
  const ds = c.displayStyle || 'v1_minimal';

  if (ds === 'v2_card_stack') {
    return <SlotRequestsCardStack config={c} requests={requests} />;
  }
  if (ds === 'v3_compact') {
    return <SlotRequestsCompactOverlay config={c} requests={requests} />;
  }
  if (ds === 'v3_compact_editable') {
    return <SlotRequestsCompactEditable config={c} requests={requests} />;
  }

  return <SlotRequestsMinimal config={c} requests={requests} />;
}
