/**
 * Extension Slot Picker — Overlay Widget
 * Shows community-voted slot suggestions on stream (realtime)
 */
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function ExtSlotPickerWidget({ config = {}, widgetData = {} }) {
  const [suggestions, setSuggestions] = useState([]);
  const broadcasterId = widgetData.userId || config.broadcasterId;

  useEffect(() => {
    if (!broadcasterId) return;
    loadSuggestions();

    const channel = supabase
      .channel('ext-picks-' + broadcasterId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ext_slot_suggestions',
        filter: `broadcaster_id=eq.${broadcasterId}`,
      }, () => loadSuggestions())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [broadcasterId]);

  const loadSuggestions = async () => {
    const { data } = await supabase
      .from('ext_slot_suggestions')
      .select('*')
      .eq('broadcaster_id', broadcasterId)
      .in('status', ['approved', 'locked'])
      .order('votes', { ascending: false })
      .limit(config.maxEntries || 8);
    setSuggestions(data || []);
  };

  if (suggestions.length === 0) return null;

  const fg = config.textColor || '#ffffff';
  const bg = config.bgColor || 'rgba(15,23,42,0.92)';
  const accent = config.accentColor || '#9146FF';
  const font = config.fontFamily || "'Inter', sans-serif";
  const sz = config.fontSize || 13;
  const maxVotes = Math.max(...suggestions.map(s => s.votes), 1);

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
          color: accent,
        }}>
          🎰 {config.title || 'Community Picks'}
        </div>
      )}

      {suggestions.map((s, i) => (
        <div key={s.id} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 0',
          marginBottom: 2,
          position: 'relative',
        }}>
          {/* Vote bar */}
          <div style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            width: `${(s.votes / maxVotes) * 100}%`,
            background: `${accent}15`,
            borderRadius: 4,
            transition: 'width 0.5s ease',
          }} />

          {s.image_url && (
            <img src={s.image_url} alt="" style={{
              position: 'relative',
              width: 28, height: 28,
              borderRadius: 4, objectFit: 'cover',
            }} />
          )}

          <div style={{ position: 'relative', flex: 1 }}>
            <div style={{ fontWeight: 600 }}>
              {s.status === 'locked' ? '🔒 ' : ''}{s.slot_name}
            </div>
            {s.provider && (
              <div style={{ fontSize: sz - 2, color: 'rgba(255,255,255,0.4)' }}>
                {s.provider}
              </div>
            )}
          </div>

          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            fontSize: sz - 1,
            fontWeight: 700,
            color: accent,
          }}>
            <span>👍</span>
            <span>{s.votes}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
