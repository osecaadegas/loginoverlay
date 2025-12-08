import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './WidgetsPage.css';

export default function WidgetsPage() {
  const navigate = useNavigate();

  const widgets = [
    {
      id: 'spotify',
      name: 'Spotify Widget',
      icon: '🎵',
      description: 'Display your currently playing Spotify track',
      path: '/overlay/widgets/spotify',
      available: true
    },
    {
      id: 'twitch-chat',
      name: 'Twitch Chat',
      icon: '💬',
      description: 'Show Twitch chat on your overlay',
      path: '/overlay/widgets/twitch-chat',
      available: false
    },
    {
      id: 'timer',
      name: 'Timer Widget',
      icon: '⏱️',
      description: 'Add countdown or stopwatch timer',
      path: '/overlay/widgets/timer',
      available: false
    },
    {
      id: 'donation-goal',
      name: 'Donation Goal',
      icon: '🎯',
      description: 'Track donation goals and progress',
      path: '/overlay/widgets/donation-goal',
      available: false
    }
  ];

  return (
    <div className="widgets-page">
      <div className="widgets-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>Overlay Widgets</h1>
        <p>Customize your stream with interactive widgets</p>
      </div>

      <div className="widgets-grid">
        {widgets.map(widget => (
          <div key={widget.id} className={`widget-card ${!widget.available ? 'disabled' : ''}`}>
            <div className="widget-icon">{widget.icon}</div>
            <h3>{widget.name}</h3>
            <p>{widget.description}</p>
            {widget.available ? (
              <button 
                className="widget-configure-btn"
                onClick={() => navigate(widget.path)}
              >
                Configure
              </button>
            ) : (
              <button className="widget-configure-btn disabled" disabled>
                Coming Soon
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
