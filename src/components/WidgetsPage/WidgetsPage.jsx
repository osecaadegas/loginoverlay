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
      path: '/overlay/widgets/spotify'
    },
    {
      id: 'twitch-chat',
      name: 'Twitch Chat',
      icon: '💬',
      description: 'Show Twitch chat on your overlay',
      path: '/overlay/widgets/twitch-chat'
    },
    {
      id: 'timer',
      name: 'Timer Widget',
      icon: '⏱️',
      description: 'Add countdown or stopwatch timer',
      path: '/overlay/widgets/timer'
    },
    {
      id: 'donation-goal',
      name: 'Donation Goal',
      icon: '🎯',
      description: 'Track donation goals and progress',
      path: '/overlay/widgets/donation-goal'
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
          <div key={widget.id} className="widget-card">
            <div className="widget-icon">{widget.icon}</div>
            <h3>{widget.name}</h3>
            <p>{widget.description}</p>
            <button 
              className="widget-configure-btn"
              onClick={() => navigate(widget.path)}
            >
              Configure
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
