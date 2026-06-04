import { useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';

/**
 * Config panel for the Penalty King overlay widget.
 * The streamer_id is auto-filled from the logged-in user — no manual input needed.
 */
export default function PenaltyKingConfig({ config = {}, onChange }) {
  const { user } = useAuth();

  // Auto-inject the logged-in user's ID whenever it's available
  useEffect(() => {
    if (user?.id && config.streamer_id !== user.id) {
      if (onChange) onChange({ ...config, streamer_id: user.id });
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 10px',
        background: 'rgba(34,197,94,0.1)',
        border: '1px solid rgba(34,197,94,0.25)',
        borderRadius: '6px',
        fontSize: '0.78rem',
        color: '#4ade80',
      }}>
        <span>✓</span>
        <span>Linked to your account{user?.email ? ` (${user.email})` : ''}</span>
      </div>
    </div>
  );
}
