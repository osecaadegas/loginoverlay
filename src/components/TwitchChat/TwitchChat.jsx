import { useState, useEffect } from 'react';
import './TwitchChat.css';
import useDraggable from '../../hooks/useDraggable';

const TwitchChat = ({ channel, position = 'bottom-right', width = 350, height = 500 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [chatChannel, setChatChannel] = useState(() => localStorage.getItem('twitchChannel') || channel || '');
  const [isEditing, setIsEditing] = useState(false);
  const draggableRef = useDraggable(isVisible, 'twitchchat');

  useEffect(() => {
    const handleStreamerNameChange = (e) => {
      setChatChannel(e.detail.name);
    };

    window.addEventListener('streamerNameChanged', handleStreamerNameChange);
    return () => window.removeEventListener('streamerNameChanged', handleStreamerNameChange);
  }, []);

  const positionStyles = {
    'top-left': { top: '6rem', left: '2rem' },
    'top-right': { top: '6rem', right: '2rem' },
    'bottom-left': { bottom: '2rem', left: '2rem' },
    'bottom-right': { bottom: '2rem', right: '2rem' },
    'left': { top: '50%', left: '2rem', transform: 'translateY(-50%)' },
    'right': { top: '50%', right: '2rem', transform: 'translateY(-50%)' },
    'bottom': { bottom: '2rem', left: '50%', transform: 'translateX(-50%)' }
  };

  if (!isVisible) {
    return (
      <button 
        className="twitch-chat-toggle-btn"
        style={positionStyles[position]}
        onClick={() => setIsVisible(true)}
      >
        💬 Show Twitch Chat
      </button>
    );
  }

  return (
    <div 
      className="twitch-chat-container"
      ref={draggableRef}
      style={{ 
        width: `${width}px`,
        height: `${height}px`
      }}
    >
      <div className="twitch-chat-header">
        <div className="drag-handle-icon drag-handle">⋮⋮</div>
        <span className="twitch-chat-title">
          {isEditing ? (
            <input
              type="text"
              value={chatChannel}
              onChange={(e) => {
                const newChannel = e.target.value;
                setChatChannel(newChannel);
                localStorage.setItem('twitchChannel', newChannel);
                localStorage.setItem('streamerName', newChannel);
                window.dispatchEvent(new CustomEvent('streamerNameChanged', { detail: { name: newChannel } }));
              }}
              onBlur={() => setIsEditing(false)}
              onKeyPress={(e) => e.key === 'Enter' && setIsEditing(false)}
              placeholder="Enter Twitch channel"
              autoFocus
              className="channel-input"
            />
          ) : (
            <span onClick={() => setIsEditing(true)} style={{ cursor: 'pointer' }}>
              {chatChannel || 'Click to set channel'}
            </span>
          )}
        </span>
        <button className="chat-close-btn" onClick={() => setIsVisible(false)}>
          ✕
        </button>
      </div>
      {chatChannel ? (
        <iframe
          src={`https://www.twitch.tv/embed/${chatChannel}/chat?parent=${window.location.hostname}&darkpopout`}
          width="100%"
          height="100%"
          frameBorder="0"
          title="Twitch Chat"
        />
      ) : (
        <div className="chat-placeholder">
          <div className="placeholder-icon">💬</div>
          <div className="placeholder-text">Click above to set Twitch channel</div>
        </div>
      )}
    </div>
  );
};

export default TwitchChat;
