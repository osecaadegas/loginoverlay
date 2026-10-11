import React from 'react';
import { useOverlayAssetAccess } from '../../../hooks/useOverlayAssetAccess';

export default function OverlayAssetGate({ userId, config, runtime, children }) {
  const access = useOverlayAssetAccess(userId);
  const blocked = access.blocked(config);
  if (!blocked) return children;
  if (runtime === 'obs') return null;
  return <div role="status" style={{ padding: 12, color: '#bdd5e5', fontSize: 13 }}>
    {access.error ? <><span>Overlay access could not be checked.</span> <button onClick={access.retry}>Retry</button></>
      : access.loading ? 'Checking overlay access…' : `${blocked.label} requires an exclusive overlay role. Choose another asset or contact an administrator.`}
  </div>;
}
