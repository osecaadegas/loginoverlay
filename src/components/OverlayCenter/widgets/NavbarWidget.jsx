import React from 'react';

export default function NavbarWidget({ config }) {
  const c = config || {};
  return (
    <div className="overlay-navbar">
      <div className="overlay-navbar-name">{c.streamerName || 'Streamer'}</div>
      {c.motto && <div className="overlay-navbar-motto">{c.motto}</div>}
      {c.displayMode && c.displayMode !== 'none' && (
        <div className="overlay-navbar-mode">{c.displayMode}</div>
      )}
    </div>
  );
}
