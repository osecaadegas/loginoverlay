/**
 * SpotifyCallback.jsx — Receives the Spotify OAuth redirect,
 * posts the auth code back to the opener window, and closes.
 */
import { useEffect } from 'react';

export default function SpotifyCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (window.opener) {
      window.opener.postMessage(
        { type: 'spotify-callback', code, error },
        window.location.origin
      );
      setTimeout(() => window.close(), 300);
    } else {
      // Fallback: store in sessionStorage and redirect
      if (code) sessionStorage.setItem('spotify_auth_code', code);
      if (error) sessionStorage.setItem('spotify_auth_error', error);
      window.location.href = '/overlay-center';
    }
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0d0f18', color: '#e2e8f0',
      fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>🎵</div>
        <p>Connecting to Spotify...</p>
        <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 8 }}>
          This window will close automatically.
        </p>
      </div>
    </div>
  );
}
