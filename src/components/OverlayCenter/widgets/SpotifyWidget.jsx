import React, { useEffect, useState, useRef } from 'react';
import { fetchNowPlaying, refreshSpotifyToken } from '../../../utils/spotifyAuth';

/* ────────────── helpers ────────────── */
function marquee(text, max = 28) {
  return text && text.length > max ? text : text;
}

const SPOTIFY_GREEN = '#1DB954';

/* ═══════════════════════════════════════════════════════
   Spotify Now Playing Widget — 6 embedded styles
   ═══════════════════════════════════════════════════════ */
export default function SpotifyWidget({ config }) {
  const c = config || {};
  const [nowPlaying, setNowPlaying] = useState(null);
  const tokenRef  = useRef(c.spotify_access_token);
  const refreshRef = useRef(c.spotify_refresh_token);
  const expiresRef = useRef(c.spotify_expires_at);

  useEffect(() => {
    tokenRef.current  = c.spotify_access_token;
    refreshRef.current = c.spotify_refresh_token;
    expiresRef.current = c.spotify_expires_at;
  }, [c.spotify_access_token, c.spotify_refresh_token, c.spotify_expires_at]);

  /* ── Polling ── */
  useEffect(() => {
    if (!tokenRef.current) return;

    const poll = async () => {
      let token = tokenRef.current;
      if (expiresRef.current && Date.now() > expiresRef.current - 60000) {
        try {
          const fresh = await refreshSpotifyToken(refreshRef.current);
          token = fresh.access_token;
          tokenRef.current  = fresh.access_token;
          refreshRef.current = fresh.refresh_token;
          expiresRef.current = fresh.expires_at;
        } catch { /* refresh failed */ }
      }
      if (!token) return;
      const np = await fetchNowPlaying(token);
      setNowPlaying(np);
    };

    poll();
    const id = setInterval(poll, 8000);
    return () => clearInterval(id);
  }, [c.spotify_access_token]);

  /* ── Manual fallback ── */
  const data = nowPlaying
    ? nowPlaying
    : (c.manualArtist || c.manualTrack)
      ? { artist: c.manualArtist || '', track: c.manualTrack || '', isPlaying: true, albumArt: c.manualAlbumArt || '' }
      : null;

  const style = c.displayStyle || 'album_card';

  if (!data) {
    return (
      <div className="oc-widget-inner oc-spotify oc-spotify--empty" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="oc-widget-empty" style={{ opacity: 0.5, fontSize: 14 }}>🎵 Waiting for Spotify…</span>
      </div>
    );
  }

  switch (style) {
    case 'mini_player':  return <MiniPlayer data={data} c={c} />;
    case 'vinyl':        return <VinylSpin data={data} c={c} />;
    case 'glass':        return <GlassCard data={data} c={c} />;
    case 'wave':         return <WaveStyle data={data} c={c} />;
    case 'neon':         return <NeonStyle data={data} c={c} />;
    case 'album_card':
    default:             return <AlbumCard data={data} c={c} />;
  }
}

/* ══════════════════════════════════════════════════════════
   STYLE 1: Album Card — large art with info overlay
   ══════════════════════════════════════════════════════════ */
function AlbumCard({ data, c }) {
  const accent = c.accentColor || SPOTIFY_GREEN;
  return (
    <div className="oc-spotify oc-spotify--album-card" style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      borderRadius: 16, background: '#0a0a0f',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {data.albumArt && (
        <img src={data.albumArt} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', filter: 'brightness(0.45) blur(2px)', zIndex: 0,
        }} />
      )}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.85) 100%)',
      }} />
      <div style={{
        position: 'relative', zIndex: 2, width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '16px 18px',
      }}>
        {data.albumArt && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -60%)',
            width: '42%', aspectRatio: '1', borderRadius: 12,
            boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 40px ${accent}33`,
            overflow: 'hidden',
          }}>
            <img src={data.albumArt} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
          {data.track}
        </div>
        <div style={{ fontSize: 12, color: '#ffffffaa', marginTop: 3 }}>
          {data.artist}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: data.isPlaying ? accent : '#666',
            boxShadow: data.isPlaying ? `0 0 8px ${accent}` : 'none',
            animation: data.isPlaying ? 'spotifyPulse 1.5s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: 12, color: '#ffffff88', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {data.isPlaying ? 'Now Playing' : 'Paused'}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={accent} style={{ marginLeft: 'auto' }}>
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STYLE 2: Mini Player — compact horizontal bar
   ══════════════════════════════════════════════════════════ */
function MiniPlayer({ data, c }) {
  const accent = c.accentColor || SPOTIFY_GREEN;
  return (
    <div className="oc-spotify oc-spotify--mini" style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      gap: 10, padding: '6px 12px',
      background: 'linear-gradient(135deg, #181818, #121212)',
      borderRadius: 12, border: '1px solid #ffffff12',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      overflow: 'hidden',
    }}>
      {data.albumArt ? (
        <img src={data.albumArt} alt="" style={{
          width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }} />
      ) : (
        <div style={{
          width: 44, height: 44, borderRadius: 6, flexShrink: 0,
          background: '#282828', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>🎵</div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: '#fff',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{data.track}</div>
        <div style={{
          fontSize: 12, color: '#b3b3b3',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{data.artist}</div>
      </div>

      {/* Equalizer bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18, flexShrink: 0 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: 3, borderRadius: 1.5, background: accent,
            animation: data.isPlaying ? `spotifyEq ${0.4 + i * 0.15}s ease-in-out infinite alternate` : 'none',
            height: data.isPlaying ? undefined : 4,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STYLE 3: Vinyl — spinning record with album art center
   ══════════════════════════════════════════════════════════ */
function VinylSpin({ data, c }) {
  const accent = c.accentColor || SPOTIFY_GREEN;
  const sz = '55%';
  return (
    <div className="oc-spotify oc-spotify--vinyl" style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 10,
      background: 'radial-gradient(ellipse at 50% 40%, #1a1a2e, #0a0a12)',
      borderRadius: 16, fontFamily: "'Inter', 'Segoe UI', sans-serif",
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Vinyl record */}
      <div style={{
        width: sz, aspectRatio: '1', borderRadius: '50%', position: 'relative',
        background: `conic-gradient(from 0deg, #111 0%, #222 10%, #111 20%, #1a1a1a 30%, #111 40%, #222 50%, #111 60%, #1a1a1a 70%, #111 80%, #222 90%, #111 100%)`,
        boxShadow: '0 4px 30px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.4)',
        animation: data.isPlaying ? 'spotifyVinylSpin 3s linear infinite' : 'none',
      }}>
        {/* Grooves */}
        {[30, 38, 46, 54, 62, 70].map(p => (
          <div key={p} style={{
            position: 'absolute', top: `${(100 - p) / 2}%`, left: `${(100 - p) / 2}%`,
            width: `${p}%`, height: `${p}%`, borderRadius: '50%',
            border: '0.5px solid rgba(255,255,255,0.05)',
          }} />
        ))}
        {/* Center label */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '38%', aspectRatio: '1', borderRadius: '50%',
          overflow: 'hidden', border: `2px solid ${accent}44`,
          boxShadow: `0 0 20px ${accent}22`,
        }}>
          {data.albumArt ? (
            <img src={data.albumArt} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%', background: '#222',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>🎵</div>
          )}
        </div>
      </div>

      {/* Track info */}
      <div style={{ textAlign: 'center', padding: '0 16px', zIndex: 1 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#fff',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220,
        }}>{data.track}</div>
        <div style={{
          fontSize: 12, color: accent, marginTop: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220,
        }}>{data.artist}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STYLE 4: Glass — frosted glass card
   ══════════════════════════════════════════════════════════ */
function GlassCard({ data, c }) {
  const accent = c.accentColor || SPOTIFY_GREEN;
  return (
    <div className="oc-spotify oc-spotify--glass" style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      borderRadius: 18,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* Blurred background */}
      {data.albumArt && (
        <img src={data.albumArt} alt="" style={{
          position: 'absolute', inset: -20, width: 'calc(100% + 40px)', height: 'calc(100% + 40px)',
          objectFit: 'cover', filter: 'blur(30px) brightness(0.4) saturate(1.8)', zIndex: 0,
        }} />
      )}
      {!data.albumArt && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          zIndex: 0,
        }} />
      )}

      {/* Glass overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 18,
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 2, width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
      }}>
        {data.albumArt && (
          <div style={{
            width: '30%', maxWidth: 80, aspectRatio: '1', borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0,
          }}>
            <img src={data.albumArt} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: '#fff',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            textShadow: '0 1px 6px rgba(0,0,0,0.5)',
          }}>{data.track}</div>
          <div style={{
          fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{data.artist}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: data.isPlaying ? accent : '#666',
              boxShadow: data.isPlaying ? `0 0 6px ${accent}` : 'none',
            }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {data.isPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STYLE 5: Wave — audio waveform bars behind track info
   ══════════════════════════════════════════════════════════ */
function WaveStyle({ data, c }) {
  const accent = c.accentColor || SPOTIFY_GREEN;
  const bars = 24;
  return (
    <div className="oc-spotify oc-spotify--wave" style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      borderRadius: 14, background: '#0d0d14',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 12,
    }}>
      {/* Waveform background */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center', gap: 2,
        padding: '0 8px 8px', opacity: 0.18, zIndex: 0,
      }}>
        {Array.from({ length: bars }, (_, i) => (
          <div key={i} style={{
            flex: 1, borderRadius: 2, background: accent,
            animation: data.isPlaying
              ? `spotifyWave ${0.3 + Math.random() * 0.5}s ease-in-out infinite alternate`
              : 'none',
            height: data.isPlaying ? undefined : '12%',
            animationDelay: `${i * 0.05}s`,
          }} />
        ))}
      </div>

      {/* Album art */}
      {data.albumArt && (
        <div style={{
          width: 50, height: 50, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
          boxShadow: `0 0 16px ${accent}33`, position: 'relative', zIndex: 1,
        }}>
          <img src={data.albumArt} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#fff',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{data.track}</div>
        <div style={{
          fontSize: 12, color: accent, marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{data.artist}</div>
      </div>

      {/* Play indicator */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 2, height: 20, flexShrink: 0,
        position: 'relative', zIndex: 1,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 3, borderRadius: 1.5, background: accent,
            animation: data.isPlaying ? `spotifyEq ${0.35 + i * 0.12}s ease-in-out infinite alternate` : 'none',
            height: data.isPlaying ? undefined : 4,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STYLE 6: Neon — glowing neon effect
   ══════════════════════════════════════════════════════════ */
function NeonStyle({ data, c }) {
  const accent = c.accentColor || SPOTIFY_GREEN;
  return (
    <div className="oc-spotify oc-spotify--neon" style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      borderRadius: 16, background: '#050510',
      border: `1px solid ${accent}44`,
      boxShadow: `0 0 20px ${accent}22, inset 0 0 30px ${accent}08`,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
    }}>
      {/* Neon glow corners */}
      <div style={{
        position: 'absolute', top: -1, left: -1, right: -1, bottom: -1,
        borderRadius: 16, pointerEvents: 'none',
        boxShadow: `0 0 15px ${accent}33, 0 0 45px ${accent}11`,
      }} />

      {/* Album art with neon border */}
      {data.albumArt ? (
        <div style={{
          width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
          border: `2px solid ${accent}`,
          boxShadow: `0 0 12px ${accent}66, 0 0 4px ${accent}44`,
          position: 'relative', zIndex: 1,
        }}>
          <img src={data.albumArt} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <div style={{
          width: 56, height: 56, borderRadius: 10, flexShrink: 0,
          border: `2px solid ${accent}`, background: '#111',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 12px ${accent}66`,
          fontSize: 24, position: 'relative', zIndex: 1,
        }}>🎵</div>
      )}

      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 15, fontWeight: 700,
          color: '#fff',
          textShadow: `0 0 8px ${accent}88, 0 0 2px ${accent}44`,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{data.track}</div>
        <div style={{
          fontSize: 12, color: accent, marginTop: 3,
          textShadow: `0 0 6px ${accent}44`,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{data.artist}</div>
        <div style={{
          fontSize: 11, color: `${accent}99`, marginTop: 4,
          textTransform: 'uppercase', letterSpacing: '0.15em',
        }}>
          {data.isPlaying ? '▶ PLAYING' : '⏸ PAUSED'}
        </div>
      </div>
    </div>
  );
}
