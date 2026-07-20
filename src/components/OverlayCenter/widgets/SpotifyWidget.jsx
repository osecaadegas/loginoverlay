import React, { useEffect, useState, useRef } from 'react';
import { fetchNowPlaying, serverRefreshToken } from '../../../utils/spotifyAuth';
import { subElementStyle, subValue } from './shared/appearanceStyles';

/* ────────────── helpers ────────────── */
function marquee(text, max = 28) {
  return text && text.length > max ? text : text;
}

const SPOTIFY_GREEN = '#1DB954';

function spotifyAccent(c) {
  return subValue(c, 'playbackState', 'accentColor', c.accentColor || SPOTIFY_GREEN);
}

function spotifyText(c, fallback = '#fff') {
  return subValue(c, 'trackTitle', 'textColor', c.textColor || fallback);
}

function spotifyMuted(c, fallback = '#ffffffcc') {
  return subValue(c, 'artistName', 'textColor', c.mutedColor || fallback);
}

function spotifyArtRadius(c, fallback = 12) {
  return subValue(c, 'albumArt', 'radius', fallback);
}

function numericSubValue(config, elementId, property, fallback) {
  const value = Number(subValue(config, elementId, property, fallback));
  return Number.isFinite(value) ? value : fallback;
}

function spotifyAlbumArtStyle(c, fallbackSize, fallbackRadius, fallback = {}) {
  const size = numericSubValue(c, 'albumArt', 'imageSize', fallbackSize);
  return subElementStyle(c, 'albumArt', {
    width: size,
    height: size,
    borderRadius: spotifyArtRadius(c, fallbackRadius),
    flexShrink: 0,
    ...fallback,
  });
}

function spotifyAlbumArtPercent(c, fallbackPercent) {
  const percent = numericSubValue(
    c,
    'albumArt',
    'sizePercent',
    numericSubValue(c, 'albumArt', 'imageSize', fallbackPercent),
  );
  return Math.max(12, Math.min(percent, 92));
}

/* ═══════════════════════════════════════════════════════
   Spotify Now Playing Widget — 6 embedded styles
   ═══════════════════════════════════════════════════════ */
function SpotifyWidget({ config, widgetId, userId }) {
  const c = config || {};
  const [nowPlaying, setNowPlaying] = useState(null);
  const tokenRef  = useRef(c.spotify_access_token);
  const expiresRef = useRef(c.spotify_expires_at);

  useEffect(() => {
    tokenRef.current  = c.spotify_access_token;
    expiresRef.current = c.spotify_expires_at;
  }, [c.spotify_access_token, c.spotify_expires_at]);

  /* ── Polling with server-side token refresh ── */
  useEffect(() => {
    if (!tokenRef.current) return;
    let stopped = false;

    const doRefresh = async () => {
      if (!userId) return false;
      try {
        const fresh = await serverRefreshToken(userId);
        tokenRef.current  = fresh.access_token;
        expiresRef.current = fresh.expires_at;
        return true;
      } catch { return false; }
    };

    const poll = async () => {
      if (stopped) return;
      let token = tokenRef.current;
      if (!token) return;

      // Proactive refresh if token is about to expire (within 60s)
      if (expiresRef.current && Date.now() > expiresRef.current - 60000) {
        const ok = await doRefresh();
        if (ok) token = tokenRef.current;
      }

      try {
        const np = await fetchNowPlaying(token);
        if (!stopped) setNowPlaying(np);
      } catch (err) {
        // 401 = token expired → force refresh and retry once
        if (err?.status === 401) {
          const ok = await doRefresh();
          if (ok && !stopped) {
            try {
              const np = await fetchNowPlaying(tokenRef.current);
              if (!stopped) setNowPlaying(np);
            } catch { /* give up this cycle */ }
          }
        }
      }
    };

    poll();
    const id = setInterval(poll, 8000);
    return () => { stopped = true; clearInterval(id); };
  }, [c.spotify_access_token, widgetId, userId]);

  /* ── Manual fallback ── */
  const baseData = nowPlaying
    ? nowPlaying
    : (c.manualArtist || c.manualTrack)
      ? { artist: c.manualArtist || '', track: c.manualTrack || '', isPlaying: true, albumArt: c.manualAlbumArt || '' }
      : null;
  const customAlbumArt = subValue(c, 'albumArt', 'imageUrl', '');
  const data = baseData && customAlbumArt ? { ...baseData, albumArt: customAlbumArt } : baseData;

  const style = c.displayStyle || 'album_card';

  if (!data) {
    return null;
  }

  switch (style) {
    case 'mini_player':  return <MiniPlayer data={data} c={c} />;
    case 'vinyl':        return <VinylSpin data={data} c={c} />;
    case 'glass':        return <GlassCard data={data} c={c} />;
    case 'wave':         return <WaveStyle data={data} c={c} />;
    case 'neon':         return <NeonStyle data={data} c={c} />;
    case 'metal':        return <MetalPlayer data={data} c={c} />;
    case 'compact_bar':  return <CompactBar data={data} c={c} />;
    case 'album_card':
    default:             return <AlbumCard data={data} c={c} />;
  }
}

/* ══════════════════════════════════════════════════════════
   STYLE 1: Album Card — large art with info overlay
   ══════════════════════════════════════════════════════════ */
function AlbumCard({ data, c }) {
  const accent = spotifyAccent(c);
  const titleColor = spotifyText(c);
  const artistColor = spotifyMuted(c);
  const artRadius = spotifyArtRadius(c);
  const bgColor = subValue(c, 'container', 'background', c.bgColor || '#0a0a0f');
  const showAlbumArt = subValue(c, 'albumArt', 'visible', true) !== false;
  const imageFit = subValue(c, 'albumArt', 'imageFit', 'cover');
  const albumSizePercent = spotifyAlbumArtPercent(c, 42);
  const albumBorderColor = subValue(c, 'albumArt', 'borderColor', 'transparent');
  const albumBorderWidth = numericSubValue(c, 'albumArt', 'borderWidth', 0);
  const albumShadow = subValue(c, 'albumArt', 'shadow', `0 8px 32px rgba(0,0,0,0.6), 0 0 40px ${accent}33`);
  const playbackColor = subValue(c, 'playbackState', 'accentColor', accent);
  const playbackTextColor = subValue(c, 'playbackState', 'textColor', '#ffffff99');
  const playbackEnabled = subValue(c, 'playbackState', 'animationEnabled', true) !== false;
  const playbackDuration = numericSubValue(c, 'playbackState', 'animationDuration', 1.5);
  const spotifyIconColor = subValue(c, 'spotifyBadge', 'accentColor', accent);
  const containerStyle = subElementStyle(c, 'container', {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    background: bgColor,
    fontFamily: c.fontFamily || "'Inter', 'Segoe UI', sans-serif",
  });
  return (
    <div className="oc-spotify oc-spotify--album-card" style={containerStyle}>
      {showAlbumArt && data.albumArt && (
        <img src={data.albumArt} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: imageFit, filter: 'brightness(0.45) blur(2px)', zIndex: 0,
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
        {showAlbumArt && data.albumArt && (
          <div style={{
            ...subElementStyle(c, 'albumArt', {}),
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -60%)',
            width: `${albumSizePercent}%`, height: undefined, aspectRatio: '1', borderRadius: artRadius,
            border: albumBorderWidth > 0 ? `${albumBorderWidth}px solid ${albumBorderColor}` : undefined,
            boxShadow: albumShadow,
            overflow: 'hidden',
          }}>
            <img src={data.albumArt} alt="" style={{ width: '100%', height: '100%', objectFit: imageFit }} />
          </div>
        )}
        <div style={{
          ...subElementStyle(c, 'trackTitle', {
            fontSize: 18,
            fontWeight: 700,
            color: titleColor,
            lineHeight: 1.2,
          }),
          color: titleColor,
          textShadow: '0 2px 8px rgba(0,0,0,0.7)',
        }}>
          {data.track}
        </div>
        <div style={{
          ...subElementStyle(c, 'artistName', {
            fontSize: 14,
            fontWeight: 600,
            color: artistColor,
            lineHeight: 1.2,
          }),
          color: artistColor,
          marginTop: 3,
          textShadow: '0 1px 6px rgba(0,0,0,0.6)',
        }}>
          {data.artist}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: data.isPlaying ? playbackColor : '#666',
            boxShadow: data.isPlaying ? `0 0 8px ${playbackColor}` : 'none',
            animation: data.isPlaying && playbackEnabled ? `spotifyPulse ${playbackDuration}s ease-in-out infinite` : 'none',
          }} />
          <span style={{
            ...subElementStyle(c, 'playbackState', {
              fontSize: 13,
              fontWeight: 600,
              color: playbackTextColor,
            }),
            color: playbackTextColor,
            textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}>
            {data.isPlaying ? 'Now Playing' : 'Paused'}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={spotifyIconColor} style={{ marginLeft: 'auto' }}>
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
  const accent = spotifyAccent(c);
  const titleColor = spotifyText(c);
  const artistColor = spotifyMuted(c, '#b3b3b3');
  const bgColor = subValue(c, 'container', 'background', c.bgColor || 'linear-gradient(135deg, #181818, #121212)');
  const showAlbumArt = subValue(c, 'albumArt', 'visible', true) !== false;
  const imageFit = subValue(c, 'albumArt', 'imageFit', 'cover');
  const equalizerColor = subValue(c, 'equalizer', 'accentColor', accent);
  const equalizerEnabled = subValue(c, 'equalizer', 'animationEnabled', true) !== false;
  const equalizerDuration = numericSubValue(c, 'equalizer', 'animationDuration', 0.4);
  const containerStyle = subElementStyle(c, 'container', {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 12px',
    background: bgColor,
    borderRadius: 12,
    border: '1px solid #ffffff12',
    fontFamily: c.fontFamily || "'Inter', 'Segoe UI', sans-serif",
    overflow: 'hidden',
  });
  return (
    <div className="oc-spotify oc-spotify--mini" style={containerStyle}>
      {showAlbumArt && data.albumArt ? (
        <img src={data.albumArt} alt="" style={{
          ...spotifyAlbumArtStyle(c, 44, 6, {
            objectFit: imageFit,
          }),
          objectFit: imageFit,
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }} />
      ) : showAlbumArt ? (
        <div style={{
          ...spotifyAlbumArtStyle(c, 44, 6, {
            background: '#282828',
          }),
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>🎵</div>
      ) : null}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          ...subElementStyle(c, 'trackTitle', {
            fontSize: 15,
            fontWeight: 700,
            color: titleColor,
            lineHeight: 1.2,
          }),
          color: titleColor,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}>{data.track}</div>
        <div style={{
          ...subElementStyle(c, 'artistName', {
            fontSize: 13,
            fontWeight: 600,
            color: artistColor,
            lineHeight: 1.2,
          }),
          color: artistColor,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          textShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}>{data.artist}</div>
      </div>

      {/* Equalizer bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18, flexShrink: 0 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: 3, borderRadius: 1.5, background: equalizerColor,
            animation: data.isPlaying && equalizerEnabled ? `spotifyEq ${equalizerDuration + i * 0.15}s ease-in-out infinite alternate` : 'none',
            height: data.isPlaying && equalizerEnabled ? undefined : 4,
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
  const accent = spotifyAccent(c);
  const bgColor = subValue(c, 'container', 'background', c.bgColor || 'radial-gradient(ellipse at 50% 40%, #1a1a2e, #0a0a12)');
  const titleColor = spotifyText(c);
  const artistColor = spotifyMuted(c, accent);
  const showAlbumArt = subValue(c, 'albumArt', 'visible', true) !== false;
  const imageFit = subValue(c, 'albumArt', 'imageFit', 'cover');
  const artRadius = spotifyArtRadius(c, '50%');
  const labelSizePercent = spotifyAlbumArtPercent(c, 38);
  const albumArtElementStyle = subElementStyle(c, 'albumArt', {});
  const recordSizePercent = numericSubValue(c, 'vinylRecord', 'sizePercent', 55);
  const recordColor = subValue(c, 'vinylRecord', 'background', '#111');
  const recordAccent = subValue(c, 'vinylRecord', 'accentColor', accent);
  const recordEnabled = subValue(c, 'vinylRecord', 'animationEnabled', true) !== false;
  const recordDuration = numericSubValue(c, 'vinylRecord', 'animationDuration', 3);
  const idleDuration = Math.max(recordDuration * 2.5, 8);
  const containerStyle = subElementStyle(c, 'container', {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    background: bgColor,
    borderRadius: 16,
    fontFamily: c.fontFamily || "'Inter', 'Segoe UI', sans-serif",
    overflow: 'hidden',
    position: 'relative',
  });
  return (
    <div className="oc-spotify oc-spotify--vinyl" style={containerStyle}>
      {/* Vinyl record */}
      <div style={{
        ...subElementStyle(c, 'vinylRecord', {
          width: `${recordSizePercent}%`,
          borderRadius: '50%',
          background: `conic-gradient(from 0deg, ${recordColor} 0%, #222 10%, ${recordColor} 20%, #1a1a1a 30%, ${recordColor} 40%, #222 50%, ${recordColor} 60%, #1a1a1a 70%, ${recordColor} 80%, #222 90%, ${recordColor} 100%)`,
          boxShadow: '0 4px 30px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.4)',
        }),
        width: `${recordSizePercent}%`, aspectRatio: '1', borderRadius: '50%', position: 'relative',
        boxShadow: '0 4px 30px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.4)',
        animation: recordEnabled ? `spotifyVinylSpin ${data.isPlaying ? recordDuration : idleDuration}s linear infinite` : 'none',
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
          ...albumArtElementStyle,
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${labelSizePercent}%`, height: undefined, aspectRatio: '1', borderRadius: artRadius,
          overflow: 'hidden', border: albumArtElementStyle.border || `2px solid ${recordAccent}44`,
          boxShadow: albumArtElementStyle.boxShadow || `0 0 20px ${recordAccent}22`,
        }}>
          {showAlbumArt && data.albumArt ? (
            <img src={data.albumArt} alt="" style={{ width: '100%', height: '100%', objectFit: imageFit }} />
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
          ...subElementStyle(c, 'trackTitle', {
            fontSize: 16,
            fontWeight: 700,
            color: titleColor,
            lineHeight: 1.2,
          }),
          color: titleColor,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220,
          textShadow: '0 2px 8px rgba(0,0,0,0.6)',
        }}>{data.track}</div>
        <div style={{
          ...subElementStyle(c, 'artistName', {
            fontSize: 13,
            fontWeight: 600,
            color: artistColor,
            lineHeight: 1.2,
          }),
          color: artistColor, marginTop: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220,
          textShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}>{data.artist}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STYLE 4: Glass — frosted glass card
   ══════════════════════════════════════════════════════════ */
function GlassCard({ data, c }) {
  const accent = spotifyAccent(c);
  const bgColor = subValue(c, 'container', 'background', c.bgColor || 'rgba(20,20,50,0.85)');
  const titleColor = spotifyText(c);
  const artistColor = spotifyMuted(c, 'rgba(255,255,255,0.75)');
  const showAlbumArt = subValue(c, 'albumArt', 'visible', true) !== false;
  const imageFit = subValue(c, 'albumArt', 'imageFit', 'cover');
  const playbackColor = subValue(c, 'playbackState', 'accentColor', accent);
  const playbackTextColor = subValue(c, 'playbackState', 'textColor', 'rgba(255,255,255,0.55)');
  const playbackEnabled = subValue(c, 'playbackState', 'animationEnabled', true) !== false;
  const playbackDuration = numericSubValue(c, 'playbackState', 'animationDuration', 1.2);
  const contentGap = subValue(c, 'container', 'gap', 14);
  const contentPadding = subValue(c, 'container', 'padding', 14);
  const contentPaddingStyle = typeof contentPadding === 'number' ? `${contentPadding}px 18px` : contentPadding;
  const containerStyle = subElementStyle(c, 'container', {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    fontFamily: c.fontFamily || "'Inter', 'Segoe UI', sans-serif",
  });
  const overlayStyle = subElementStyle(c, 'container', {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    background: bgColor,
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 18,
  });
  return (
    <div className="oc-spotify oc-spotify--glass" style={containerStyle}>
      {/* Blurred background */}
      {showAlbumArt && data.albumArt && (
        <img src={data.albumArt} alt="" style={{
          position: 'absolute', inset: -20, width: 'calc(100% + 40px)', height: 'calc(100% + 40px)',
          objectFit: imageFit, filter: 'blur(30px) brightness(0.4) saturate(1.8)', zIndex: 0,
        }} />
      )}
      {(!showAlbumArt || !data.albumArt) && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          zIndex: 0,
        }} />
      )}

      {/* Glass overlay */}
      <div style={overlayStyle} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 2, width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', gap: contentGap, padding: contentPaddingStyle,
      }}>
        {showAlbumArt && data.albumArt && (
          <div style={{
            ...spotifyAlbumArtStyle(c, 72, 12, {
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
            }),
            aspectRatio: '1',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            <img src={data.albumArt} alt="" style={{ width: '100%', height: '100%', objectFit: imageFit }} />
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            ...subElementStyle(c, 'trackTitle', {
              fontSize: 17,
              fontWeight: 700,
              color: titleColor,
              lineHeight: 1.2,
            }),
            color: titleColor,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
          }}>{data.track}</div>
          <div style={{
            ...subElementStyle(c, 'artistName', {
              fontSize: 14,
              fontWeight: 600,
              color: artistColor,
              lineHeight: 1.2,
            }),
            color: artistColor,
            marginTop: 3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            textShadow: '0 1px 6px rgba(0,0,0,0.5)',
          }}>{data.artist}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: data.isPlaying ? playbackColor : '#666',
              boxShadow: data.isPlaying ? `0 0 6px ${playbackColor}` : 'none',
              animation: data.isPlaying && playbackEnabled ? `spotifyPulse ${playbackDuration}s ease-in-out infinite` : 'none',
            }} />
            <span style={{
              ...subElementStyle(c, 'playbackState', {
                fontSize: 12,
                fontWeight: 600,
                color: playbackTextColor,
              }),
              color: playbackTextColor,
              textTransform: 'uppercase', letterSpacing: '0.1em', textShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }}>
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
  const accent = spotifyAccent(c);
  const bars = 24;
  const bgColor = subValue(c, 'container', 'background', c.bgColor || '#0d0d14');
  const titleColor = spotifyText(c);
  const artistColor = spotifyMuted(c, accent);
  const showAlbumArt = subValue(c, 'albumArt', 'visible', true) !== false;
  const imageFit = subValue(c, 'albumArt', 'imageFit', 'cover');
  const waveformColor = subValue(c, 'waveform', 'accentColor', accent);
  const waveformEnabled = subValue(c, 'waveform', 'animationEnabled', true) !== false;
  const waveformDuration = numericSubValue(c, 'waveform', 'animationDuration', 0.32);
  const equalizerColor = subValue(c, 'equalizer', 'accentColor', accent);
  const equalizerEnabled = subValue(c, 'equalizer', 'animationEnabled', true) !== false;
  const equalizerDuration = numericSubValue(c, 'equalizer', 'animationDuration', 0.4);
  const containerStyle = subElementStyle(c, 'container', {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
    background: bgColor,
    fontFamily: c.fontFamily || "'Inter', 'Segoe UI', sans-serif",
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    gap: 12,
  });
  return (
    <div className="oc-spotify oc-spotify--wave" style={containerStyle}>
      {/* Waveform background */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center', gap: 2,
        padding: '0 8px 8px', opacity: 0.18, zIndex: 0,
      }}>
        {Array.from({ length: bars }, (_, i) => (
          <div key={i} style={{
            flex: 1, borderRadius: 2, background: waveformColor,
            animation: data.isPlaying && waveformEnabled
              ? `spotifyWave ${waveformDuration + (i % 5) * 0.06}s ease-in-out infinite alternate`
              : 'none',
            height: data.isPlaying && waveformEnabled ? undefined : '12%',
            animationDelay: `${i * 0.05}s`,
          }} />
        ))}
      </div>

      {/* Album art */}
      {showAlbumArt && data.albumArt && (
        <div style={{
          ...spotifyAlbumArtStyle(c, 50, 8, {
            boxShadow: `0 0 16px ${accent}33`,
          }),
          overflow: 'hidden', position: 'relative', zIndex: 1, flexShrink: 0,
        }}>
          <img src={data.albumArt} alt="" style={{ width: '100%', height: '100%', objectFit: imageFit }} />
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{
          ...subElementStyle(c, 'trackTitle', {
            fontSize: 16,
            fontWeight: 700,
            color: titleColor,
            lineHeight: 1.2,
          }),
          color: titleColor,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          textShadow: '0 1px 6px rgba(0,0,0,0.5)',
        }}>{data.track}</div>
        <div style={{
          ...subElementStyle(c, 'artistName', {
            fontSize: 13,
            fontWeight: 600,
            color: artistColor,
            lineHeight: 1.2,
          }),
          color: artistColor, marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          textShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}>{data.artist}</div>
      </div>

      {/* Play indicator */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 2, height: 20, flexShrink: 0,
        position: 'relative', zIndex: 1,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 3, borderRadius: 1.5, background: equalizerColor,
            animation: data.isPlaying && equalizerEnabled ? `spotifyEq ${equalizerDuration + i * 0.12}s ease-in-out infinite alternate` : 'none',
            height: data.isPlaying && equalizerEnabled ? undefined : 4,
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
  const accent = spotifyAccent(c);
  const bgColor = subValue(c, 'container', 'background', c.bgColor || '#050510');
  const titleColor = spotifyText(c);
  const artistColor = spotifyMuted(c, accent);
  const showAlbumArt = subValue(c, 'albumArt', 'visible', true) !== false;
  const imageFit = subValue(c, 'albumArt', 'imageFit', 'cover');
  const playbackTextColor = subValue(c, 'playbackState', 'textColor', `${accent}99`);
  const playbackEnabled = subValue(c, 'playbackState', 'animationEnabled', true) !== false;
  const playbackDuration = numericSubValue(c, 'playbackState', 'animationDuration', 1.1);
  const containerStyle = subElementStyle(c, 'container', {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    background: bgColor,
    border: `1px solid ${accent}44`,
    boxShadow: `0 0 20px ${accent}22, inset 0 0 30px ${accent}08`,
    fontFamily: c.fontFamily || "'Inter', 'Segoe UI', sans-serif",
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 16px',
  });
  return (
    <div className="oc-spotify oc-spotify--neon" style={containerStyle}>
      {/* Neon glow corners */}
      <div style={{
        position: 'absolute', top: -1, left: -1, right: -1, bottom: -1,
        borderRadius: 16, pointerEvents: 'none',
        boxShadow: `0 0 15px ${accent}33, 0 0 45px ${accent}11`,
      }} />

      {/* Album art with neon border */}
      {showAlbumArt && data.albumArt ? (
        <div style={{
          ...spotifyAlbumArtStyle(c, 56, 10, {
            borderColor: accent,
            borderWidth: 2,
            boxShadow: `0 0 12px ${accent}66, 0 0 4px ${accent}44`,
          }),
          overflow: 'hidden', flexShrink: 0,
          position: 'relative', zIndex: 1,
        }}>
          <img src={data.albumArt} alt="" style={{ width: '100%', height: '100%', objectFit: imageFit }} />
        </div>
      ) : showAlbumArt ? (
        <div style={{
          ...spotifyAlbumArtStyle(c, 56, 10, {
            borderColor: accent,
            borderWidth: 2,
            background: '#111',
            boxShadow: `0 0 12px ${accent}66`,
          }),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, position: 'relative', zIndex: 1,
        }}>🎵</div>
      ) : null}

      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{
          ...subElementStyle(c, 'trackTitle', {
            fontSize: 17,
            fontWeight: 700,
            color: titleColor,
            lineHeight: 1.2,
          }),
          color: titleColor,
          textShadow: `0 0 10px ${accent}88, 0 0 3px ${accent}44`,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{data.track}</div>
        <div style={{
          ...subElementStyle(c, 'artistName', {
            fontSize: 14,
            fontWeight: 600,
            color: artistColor,
            lineHeight: 1.2,
          }),
          color: artistColor, marginTop: 3,
          textShadow: `0 0 8px ${accent}44`,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{data.artist}</div>
        <div style={{
          ...subElementStyle(c, 'playbackState', {
            fontSize: 12,
            fontWeight: 600,
            color: playbackTextColor,
          }),
          color: playbackTextColor, marginTop: 4,
          textTransform: 'uppercase', letterSpacing: '0.15em',
          animation: data.isPlaying && playbackEnabled ? `spotifyPulse ${playbackDuration}s ease-in-out infinite` : 'none',
        }}>
          {data.isPlaying ? '▶ PLAYING' : '⏸ PAUSED'}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STYLE 7: Metal — brushed steel card
   ══════════════════════════════════════════════════════════ */
function MetalPlayer({ data, c }) {
  const accent = spotifyAccent(c);
  const bgColor = subValue(c, 'container', 'background', c.bgColor || 'linear-gradient(145deg, #2a2d33 0%, #1a1c20 40%, #2e3238 100%)');
  const titleColor = spotifyText(c, '#e8ecf4');
  const artistColor = spotifyMuted(c, '#8a94a8');
  const showAlbumArt = subValue(c, 'albumArt', 'visible', true) !== false;
  const imageFit = subValue(c, 'albumArt', 'imageFit', 'cover');
  const playbackColor = subValue(c, 'playbackState', 'accentColor', accent || '#8a9aaa');
  const playbackTextColor = subValue(c, 'playbackState', 'textColor', artistColor);
  const equalizerColor = subValue(c, 'equalizer', 'accentColor', playbackColor);
  const equalizerEnabled = subValue(c, 'equalizer', 'animationEnabled', true) !== false;
  const equalizerDuration = numericSubValue(c, 'equalizer', 'animationDuration', 0.4);
  const containerStyle = subElementStyle(c, 'container', {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: bgColor,
    borderRadius: 12,
    border: '1px solid rgba(200,210,225,0.18)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
    fontFamily: c.fontFamily || "'Inter', 'Segoe UI', sans-serif",
    overflow: 'hidden',
  });
  return (
    <div className="oc-spotify oc-spotify--metal" style={containerStyle}>
      {showAlbumArt && data.albumArt ? (
        <div style={{
          ...spotifyAlbumArtStyle(c, 52, 8, {
            border: '1px solid rgba(200,210,225,0.15)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 8px rgba(0,0,0,0.35)',
          }),
          overflow: 'hidden', flexShrink: 0,
        }}>
          <img src={data.albumArt} alt="" style={{ width: '100%', height: '100%', objectFit: imageFit }} />
        </div>
      ) : showAlbumArt ? (
        <div style={{
          ...spotifyAlbumArtStyle(c, 52, 8, {
            background: 'linear-gradient(135deg, #555a65, #3a3e48)',
            border: '1px solid rgba(200,210,225,0.15)',
          }),
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>🎵</div>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          ...subElementStyle(c, 'trackTitle', {
            fontSize: 16,
            fontWeight: 700,
            color: titleColor,
            lineHeight: 1.2,
          }),
          color: titleColor,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{data.track}</div>
        <div style={{
          ...subElementStyle(c, 'artistName', {
            fontSize: 13,
            fontWeight: 600,
            color: artistColor,
            lineHeight: 1.2,
          }),
          color: artistColor, marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{data.artist}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: data.isPlaying ? playbackColor : '#555',
            boxShadow: data.isPlaying ? `0 0 6px ${playbackColor}88` : 'none',
          }} />
          <span style={{
            ...subElementStyle(c, 'playbackState', {
              fontSize: 12,
              fontWeight: 600,
              color: playbackTextColor,
            }),
            color: playbackTextColor, textTransform: 'uppercase', letterSpacing: '0.14em',
          }}>{data.isPlaying ? 'Now Playing' : 'Paused'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18, flexShrink: 0 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: 3, borderRadius: 1.5,
            background: equalizerColor,
            animation: data.isPlaying && equalizerEnabled ? `spotifyEq ${equalizerDuration + i * 0.15}s ease-in-out infinite alternate` : 'none',
            height: data.isPlaying && equalizerEnabled ? undefined : 4,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STYLE 8: Compact Bar — teal card with progress bar & equalizer
   Matches the "Still D.R.E." screenshot aesthetic.
   ══════════════════════════════════════════════════════════ */
function CompactBar({ data, c }) {
  const accent = spotifyAccent(c);

  // Local progress ticker — advances every second while playing
  const [progress, setProgress] = useState(data.progressMs || 0);
  const trackKey = data.track + data.artist;

  useEffect(() => {
    setProgress(data.progressMs || 0);
  }, [trackKey, data.progressMs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!data.isPlaying) return;
    const id = setInterval(() => {
      setProgress(p => {
        const next = p + 1000;
        return data.durationMs > 0 ? Math.min(next, data.durationMs) : next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [data.isPlaying, data.durationMs, trackKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = data.durationMs > 0 ? Math.min(100, (progress / data.durationMs) * 100) : 0;
  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const bgColor = subValue(c, 'container', 'background', c.bgColor || 'linear-gradient(135deg, #0a1f1f 0%, #0d2828 100%)');
  const titleColor = subValue(c, 'trackTitle', 'textColor', c.textColor || '#fff');
  const artistColor = subValue(c, 'artistName', 'textColor', accent);
  const showAlbumArt = subValue(c, 'albumArt', 'visible', true) !== false;
  const imageFit = subValue(c, 'albumArt', 'imageFit', 'cover');
  const progressBackground = subValue(c, 'progressBar', 'background', c.progressBgColor || 'rgba(255,255,255,0.1)');
  const progressFill = subValue(c, 'progressBar', 'fillColor', c.progressColor || accent);
  const progressRadius = subValue(c, 'progressBar', 'radius', 2);
  const spotifyIconColor = subValue(c, 'spotifyBadge', 'accentColor', accent);
  const listenerIconColor = subValue(c, 'listenerBadge', 'textColor', 'rgba(255,255,255,0.25)');
  const equalizerColor = subValue(c, 'equalizer', 'accentColor', accent);
  const equalizerEnabled = subValue(c, 'equalizer', 'animationEnabled', true) !== false;
  const equalizerDuration = numericSubValue(c, 'equalizer', 'animationDuration', 0.35);
  const containerStyle = subElementStyle(c, 'container', {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    background: bgColor,
    borderRadius: 12,
    border: `1px solid ${accent}22`,
    boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
    fontFamily: c.fontFamily || "'Inter', 'Segoe UI', sans-serif",
    overflow: 'hidden',
  });

  return (
    <div className="oc-spotify oc-spotify--compact-bar" style={containerStyle}>
      {/* Album art + bottom icons */}
      {showAlbumArt && (
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {data.albumArt ? (
          <img src={data.albumArt} alt="" style={{
            ...spotifyAlbumArtStyle(c, 44, 7, {
              objectFit: imageFit,
            }),
            objectFit: imageFit,
            flexShrink: 0,
            boxShadow: '0 2px 10px rgba(0,0,0,0.6)',
            display: 'block',
          }} />
        ) : (
          <div style={{
            ...spotifyAlbumArtStyle(c, 44, 7, {
              background: '#1a3333',
            }),
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🎵</div>
        )}
        {/* Spotify + listener icons */}
        <div style={{ display: 'flex', gap: 3, marginTop: 3, alignItems: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill={spotifyIconColor} style={{ opacity: 0.7 }}>
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <svg width="9" height="9" viewBox="0 0 24 24" fill={listenerIconColor}>
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
        </div>
      </div>
      )}

      {/* Track info + progress bar */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{
          ...subElementStyle(c, 'trackTitle', {
            fontSize: 14,
            fontWeight: 700,
            color: titleColor,
            lineHeight: 1.2,
          }),
          color: titleColor,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{data.track}</div>
        <div style={{
          ...subElementStyle(c, 'artistName', {
            fontSize: 12,
            fontWeight: 500,
            color: artistColor,
            lineHeight: 1.2,
          }),
          color: artistColor,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{data.artist}</div>
        {/* Progress bar row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <div style={{
            ...subElementStyle(c, 'progressBar', {
              flex: 1,
              height: 3,
              borderRadius: progressRadius,
              background: progressBackground,
            }),
            flex: 1, height: 3,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${pct}%`, borderRadius: progressRadius, background: progressFill,
              transition: 'width 1s linear',
            }} />
          </div>
          {data.durationMs > 0 && (
            <span style={{
              ...subElementStyle(c, 'timeLabel', {
                fontSize: 10,
                color: 'rgba(255,255,255,0.45)',
                fontFamily: 'monospace',
              }),
              flexShrink: 0,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {fmt(progress)} / {fmt(data.durationMs)}
            </span>
          )}
        </div>
      </div>

      {/* Equalizer bars */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 2, height: 22, flexShrink: 0,
      }}>
        {[0, 1, 2, 3].map((_, i) => (
          <div key={i} style={{
            width: 3, borderRadius: 1.5, background: equalizerColor,
            height: data.isPlaying && equalizerEnabled ? undefined : [4, 7, 5, 3][i],
            animation: data.isPlaying && equalizerEnabled
              ? `spotifyEq ${equalizerDuration + i * 0.12}s ease-in-out infinite alternate`
              : 'none',
          }} />
        ))}
      </div>
    </div>
  );
}

export default React.memo(SpotifyWidget);
