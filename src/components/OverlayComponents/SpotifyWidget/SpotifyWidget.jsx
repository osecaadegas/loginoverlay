import { useEffect, useState } from "react";
import './SpotifyWidget.css';

const CLIENT_ID = '308c74484b8f4878bc0ae17d2500d41c';
const REDIRECT_URI = window.location.hostname.includes('localhost') 
  ? 'http://localhost:5173'
  : 'https://reactoverlay.vercel.app/api/auth/callback/spotify';
const SCOPES = 'user-read-currently-playing user-read-playback-state';

function SpotifyWidget() {
  const [track, setTrack] = useState(null);
  const [accessToken, setAccessToken] = useState(() => {
    return localStorage.getItem('spotify-access-token') || '';
  });

  // Handle OAuth callback
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        setAccessToken(token);
        try {
          localStorage.setItem('spotify-access-token', token);
        } catch (e) {
          console.warn('localStorage not available, using session only');
        }
        window.location.hash = '';
      }
    }
  }, []);

  const handleLogin = () => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;
    window.location.href = authUrl;
  };

  const fetchCurrentSong = async () => {
    if (!accessToken) return;

    try {
      const res = await fetch(
        "https://api.spotify.com/v1/me/player/currently-playing",
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (res.status === 204) {
        setTrack(null);
        return;
      }

      if (res.status === 401) {
        console.error('Invalid Spotify token - please login again');
        try {
          localStorage.removeItem('spotify-access-token');
        } catch (e) {
          console.warn('localStorage not available');
        }
        setAccessToken('');
        setTrack(null);
        return;
      }

      const data = await res.json();

      setTrack({
        name: data.item?.name,
        artist: data.item?.artists?.map(a => a.name).join(", "),
        image: data.item?.album?.images[0].url
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCurrentSong();
    const interval = setInterval(fetchCurrentSong, 5000);
    return () => clearInterval(interval);
  }, [accessToken]);

  if (!accessToken) {
    return (
      <button className="spotify-login-btn" onClick={handleLogin}>
        🎵 Connect Spotify
      </button>
    );
  }

  if (!track) {
    return (
      <div className="spotify-widget nothing-playing">
        Nothing playing
      </div>
    );
  }

  return (
    <div className="spotify-widget">
      <img
        src={track.image}
        alt="Album cover"
        className="spotify-album-art"
      />

      <div className="spotify-track-info">
        <div className="spotify-track-name">
          {track.name}
        </div>

        <div className="spotify-track-artist">
          {track.artist}
        </div>
      </div>
    </div>
  );
}

export default SpotifyWidget;
