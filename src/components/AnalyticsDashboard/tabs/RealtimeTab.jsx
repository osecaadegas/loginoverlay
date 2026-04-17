/**
 * RealtimeTab.jsx — Live activity feed.
 */
import React, { useState, useEffect, useRef } from 'react';

export default function RealtimeTab({ analytics }) {
  const [data, setData] = useState(null);
  const timer = useRef(null);

  const load = async () => {
    const result = await analytics.fetchRealtime();
    if (result) setData(result);
  };

  useEffect(() => {
    load();
    timer.current = setInterval(load, 10000); // Refresh every 10s
    return () => clearInterval(timer.current);
  }, []);

  if (!data) return <div className="an-tab__loading">Connecting to live feed...</div>;

  return (
    <div className="an-tab">
      {/* Active Count */}
      <div className="an-realtime-header">
        <div className="an-realtime-pulse" />
        <span className="an-realtime-count">{data.activeCount}</span>
        <span className="an-realtime-label">active visitors right now</span>
      </div>

      <div className="an-realtime-grid">
        {/* Active Sessions */}
        <div className="an-card">
          <h3 className="an-card__title">Active Sessions</h3>
          <div className="an-realtime-list">
            {(data.activeSessions || []).map(s => (
              <div key={s.id} className={`an-realtime-item ${s.is_suspicious ? 'an-realtime-item--suspicious' : ''}`}>
                <div className="an-realtime-item__user">
                  {s.analytics_visitors?.twitch_avatar && (
                    <img src={s.analytics_visitors.twitch_avatar} alt="" className="an-realtime-item__avatar" />
                  )}
                  <span>{s.analytics_visitors?.twitch_username || 'Anonymous'}</span>
                </div>
                <div className="an-realtime-item__meta">
                  <span>{s.country || '?'}</span>
                  <span>{s.browser}</span>
                  <span>{s.device_type}</span>
                </div>
                <div className="an-realtime-item__time">
                  {timeAgo(s.started_at)}
                </div>
              </div>
            ))}
            {data.activeSessions?.length === 0 && (
              <p className="an-tab__empty">No active sessions</p>
            )}
          </div>
        </div>

        {/* Recent Events */}
        <div className="an-card">
          <h3 className="an-card__title">Recent Events</h3>
          <div className="an-realtime-list">
            {(data.recentEvents || []).map(e => (
              <div key={e.id} className={`an-realtime-event ${e.is_suspicious ? 'an-realtime-event--suspicious' : ''}`}>
                <span className={`an-event-badge an-event-badge--${e.event_type}`}>
                  {e.event_type}
                </span>
                <span className="an-realtime-event__detail">
                  {e.page_url || e.element_text || e.offer_id || '-'}
                </span>
                <span className="an-realtime-event__time">
                  {timeAgo(e.created_at)}
                </span>
              </div>
            ))}
            {data.recentEvents?.length === 0 && (
              <p className="an-tab__empty">No recent events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
