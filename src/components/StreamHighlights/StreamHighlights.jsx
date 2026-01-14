import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../config/supabaseClient';
import './StreamHighlights.css';

export default function StreamHighlights() {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);
  const scrollContainerRef = useRef(null);
  const videoRefs = useRef({});

  useEffect(() => {
    loadHighlights();

    // REPLACED REALTIME WITH POLLING TO REDUCE EGRESS
    console.warn('StreamHighlights: Realtime disabled for egress reduction. Using polling instead.');
    
    // Poll every 30 seconds (highlights don't change frequently)
    const highlightsInterval = setInterval(() => {
      loadHighlights();
    }, 30000);

    return () => {
      clearInterval(highlightsInterval);
    };
  }, []);

  const loadHighlights = async () => {
    try {
      const { data, error } = await supabase
        .from('stream_highlights')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHighlights(data || []);
    } catch (err) {
      console.error('Error loading highlights:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = async (highlightId) => {
    setHoveredId(highlightId);
    const video = videoRefs.current[highlightId];
    if (video) {
      video.muted = true;
      try {
        await video.play();
      } catch (err) {
        console.error('Error playing video:', err);
      }
    }
  };

  const handleMouseLeave = (highlightId) => {
    setHoveredId(null);
    const video = videoRefs.current[highlightId];
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  };

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 250;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return <div className="highlights-loading">Loading highlights...</div>;
  }

  if (highlights.length === 0) {
    return null;
  }

  return (
    <div className="stream-highlights">
      <div className="highlights-header">
        <div className="highlights-header-left">
          <h2>🎬 Stream Highlights</h2>
          <p>Hover to preview · Click to watch full</p>
        </div>
        <div className="scroll-buttons">
          <button className="scroll-btn" onClick={() => scroll('left')}>‹</button>
          <button className="scroll-btn" onClick={() => scroll('right')}>›</button>
        </div>
      </div>

      <div className="highlights-grid" ref={scrollContainerRef}>
        {highlights.map(highlight => {
          // Use video_url from database - should be like "video1", "video2", etc.
          const videoName = highlight.video_url.replace('.mp4', '').replace('.webm', '');
          const videoPath = `/highlights/${videoName}.mp4`;

          return (
            <div 
              key={highlight.id} 
              className="highlight-card"
            >
              <div className="highlight-video-container">
                <video 
                  key={videoPath}
                  src={videoPath}
                  autoPlay
                  loop
                  playsInline
                  muted
                  preload="auto"
                  className="highlight-video"
                  onError={(e) => console.error('Video load error:', videoPath, e)}
                />
                {highlight.thumbnail_url && (
                  <img 
                    src={highlight.thumbnail_url} 
                    alt={highlight.title}
                    className="highlight-thumbnail-img"
                  />
                )}
                {highlight.duration && (
                  <div className="highlight-duration">{highlight.duration}</div>
                )}
              </div>
              <div className="highlight-info">
                <h3>{highlight.title}</h3>
                <div className="highlight-stats">
                  <span className="view-count">👁️ {highlight.view_count || 0}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
