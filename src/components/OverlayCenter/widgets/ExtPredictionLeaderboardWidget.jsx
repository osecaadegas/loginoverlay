/**
 * Extension Prediction Leaderboard — Overlay Widget
 * Shows top bonus-hunt predictors on stream (realtime from Supabase)
 */
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function ExtPredictionLeaderboardWidget({ config = {}, widgetData = {} }) {
  const [leaders, setLeaders] = useState([]);
  const broadcasterId = widgetData.userId || config.broadcasterId;

  useEffect(() => {
    if (!broadcasterId) return;
    loadLeaderboard();

    const channel = supabase
      .channel('ext-lb-' + broadcasterId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ext_predictor_leaderboard',
        filter: `broadcaster_id=eq.${broadcasterId}`,
      }, () => loadLeaderboard())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [broadcasterId]);

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from('ext_predictor_leaderboard')
      .select('*')
      .eq('broadcaster_id', broadcasterId)
      .order('total_wins', { ascending: false })
      .limit(config.maxEntries || 10);
    setLeaders(data || []);
  };

  const fg = config.textColor || '#ffffff';
  const bg = config.bgColor || 'rgba(15,23,42,0.92)';
  const accent = config.accentColor || '#9146FF';
  const font = config.fontFamily || "'Inter', sans-serif";
  const sz = config.fontSize || 14;

  if (leaders.length === 0) return null;

  return (
    <div style={{
      fontFamily: font,
      fontSize: sz,
      color: fg,
      background: bg,
      borderRadius: config.borderRadius || 12,
      padding: 12,
      minWidth: 220,
      border: `1px solid rgba(255,255,255,0.06)`,
    }}>
      {config.showTitle !== false && (
        <div style={{
          fontSize: sz + 2,
          fontWeight: 700,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: accent,
        }}>
          🎯 {config.title || 'Prediction Leaderboard'}
        </div>
      )}

      {leaders.map((l, i) => (
        <div key={l.id} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 6px',
          marginBottom: 2,
          borderRadius: 6,
          background: i === 0 ? 'rgba(255,215,0,0.1)' : i === 1 ? 'rgba(192,192,192,0.06)' : 'transparent',
        }}>
          <span style={{
            width: 22, textAlign: 'center', fontWeight: 800,
            color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.4)',
            fontSize: sz - 1,
          }}>
            {i <= 2 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
          </span>
          <span style={{ flex: 1, fontWeight: 600, fontSize: sz - 1 }}>
            {l.twitch_display_name}
          </span>
          <span style={{ fontSize: sz - 2, color: accent, fontWeight: 700 }}>
            {l.total_wins}W
          </span>
          {l.current_streak > 1 && (
            <span style={{ fontSize: sz - 3, color: '#f59e0b' }}>
              🔥{l.current_streak}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
