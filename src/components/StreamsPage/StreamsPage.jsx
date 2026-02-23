import { useState, useEffect, useRef } from 'react';
import './StreamsPage.css';

const TWITCH_CHANNEL = 'osecaadegas95';
const TWITCH_PARENTS = 'www.osecaadegas.pt&parent=osecaadegas.pt&parent=localhost';

export default function StreamsPage() {
  const [highlights, setHighlights] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    // Load local highlight clips
    const localHighlights = Array.from({ length: 13 }, (_, i) => ({
      id: i + 1,
      video_url: `/highlights/video${i + 1}.mp4`,
      title: `Stream Highlight #${i + 1}`
    }));
    setHighlights(localHighlights);
  }, []);

  const scrollClips = (dir) => {
    if (!scrollRef.current) return;
    const amount = 340;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="streams-page">
      <div className="streams-container">

        {/* ── Stream + Chat ── */}
        <section className="streams-player-section">
          <div className="streams-player-row">
            {/* Twitch Player */}
            <div className="streams-video">
              <iframe
                src={`https://player.twitch.tv/?channel=${TWITCH_CHANNEL}&parent=${TWITCH_PARENTS}`}
                allowFullScreen
                title="Twitch Stream"
              />
            </div>

            {/* Twitch Chat */}
            <div className="streams-chat">
              <div className="streams-chat-header">
                <span className="streams-chat-title">Stream Chat</span>
                <span className="streams-chat-badge"><i className="fa-solid fa-users" /></span>
              </div>
              <div className="streams-chat-embed">
                <iframe
                  src={`https://www.twitch.tv/embed/${TWITCH_CHANNEL}/chat?parent=${TWITCH_PARENTS}&darkpopout`}
                  title="Twitch Chat"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Últimas Transmissões / Clips ── */}
        {highlights.length > 0 && (
          <section className="streams-clips-section">
            <div className="streams-clips-header">
              <div className="streams-clips-title-row">
                <span className="streams-clips-bar"></span>
                <h2 className="streams-clips-title">Últimas Transmissões</h2>
              </div>
              <div className="streams-clips-nav">
                <button onClick={() => scrollClips('left')} className="streams-clips-arrow">
                  <i className="fa-solid fa-chevron-left" />
                </button>
                <button onClick={() => scrollClips('right')} className="streams-clips-arrow">
                  <i className="fa-solid fa-chevron-right" />
                </button>
              </div>
            </div>

            <div className="streams-clips-track" ref={scrollRef}>
              {highlights.map((clip) => (
                <div key={clip.id} className="streams-clip-card">
                  <div className="streams-clip-thumb" onClick={() => setPlayingId(playingId === clip.id ? null : clip.id)}>
                    {playingId === clip.id ? (
                      <video
                        src={clip.video_url}
                        autoPlay
                        controls
                        className="streams-clip-video"
                      />
                    ) : (
                      <>
                        <video
                          src={clip.video_url}
                          muted
                          playsInline
                          preload="metadata"
                          className="streams-clip-video"
                        />
                        <div className="streams-clip-play">
                          <i className="fa-solid fa-play" />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="streams-clip-info">
                    <span className="streams-clip-name">{clip.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
