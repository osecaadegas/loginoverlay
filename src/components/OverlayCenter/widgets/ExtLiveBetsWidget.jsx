/**
 * Extension Live Bets — Overlay Widget
 * Shows active bet/prediction with odds bars on stream (realtime)
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';

export default function ExtLiveBetsWidget({ config = {}, widgetData = {} }) {
  const [bet, setBet] = useState(null);
  const [entries, setEntries] = useState([]);
  const broadcasterId = widgetData.userId || config.broadcasterId;

  useEffect(() => {
    if (!broadcasterId) return;
    loadBet();

    const channel = supabase
      .channel('ext-bets-' + broadcasterId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ext_live_bets',
        filter: `broadcaster_id=eq.${broadcasterId}`,
      }, () => loadBet())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ext_live_bet_entries',
      }, () => loadBet())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [broadcasterId]);

  const loadBet = async () => {
    // Get most recent open or locked bet
    const { data: bets } = await supabase
      .from('ext_live_bets')
      .select('*')
      .eq('broadcaster_id', broadcasterId)
      .in('status', ['open', 'locked', 'resolved'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (bets?.[0]) {
      setBet(bets[0]);
      const { data: ents } = await supabase
        .from('ext_live_bet_entries')
        .select('*')
        .eq('bet_id', bets[0].id);
      setEntries(ents || []);
    } else {
      setBet(null);
      setEntries([]);
    }
  };

  if (!bet) return null;

  const options = Array.isArray(bet.options) ? bet.options : [];
  // Calculate odds per option
  const totalPool = entries.reduce((s, e) => s + (e.amount || 0), 0);
  const optionPools = options.map((_, idx) =>
    entries.filter(e => e.option_index === idx).reduce((s, e) => s + (e.amount || 0), 0)
  );
  const maxPool = Math.max(...optionPools, 1);

  const fg = config.textColor || '#ffffff';
  const bg = config.bgColor || 'rgba(15,23,42,0.92)';
  const accent = config.accentColor || '#9146FF';
  const font = config.fontFamily || "'Inter', sans-serif";
  const sz = config.fontSize || 14;

  const optColors = config.optionColors || ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7'];

  return (
    <div style={{
      fontFamily: font,
      fontSize: sz,
      color: fg,
      background: bg,
      borderRadius: config.borderRadius || 12,
      padding: 12,
      minWidth: 260,
      border: `1px solid rgba(255,255,255,0.06)`,
    }}>
      {/* Title */}
      <div style={{
        fontSize: sz + 2,
        fontWeight: 700,
        marginBottom: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{ color: accent }}>💰</span>
        <span>{bet.title}</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: sz - 3,
          padding: '2px 6px',
          borderRadius: 4,
          background: bet.status === 'open' ? 'rgba(34,197,94,0.15)' :
            bet.status === 'locked' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
          color: bet.status === 'open' ? '#22c55e' :
            bet.status === 'locked' ? '#f59e0b' : '#818cf8',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}>
          {bet.status}
        </span>
      </div>

      {/* Pool info */}
      <div style={{
        fontSize: sz - 2,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 8,
      }}>
        {entries.length} bets · {totalPool.toLocaleString()} pts in pool
      </div>

      {/* Option bars */}
      {options.map((opt, idx) => {
        const pool = optionPools[idx];
        const pct = totalPool > 0 ? ((pool / totalPool) * 100) : 0;
        const color = optColors[idx % optColors.length];
        const isWinner = bet.status === 'resolved' && bet.winning_option === idx;

        return (
          <div key={idx} style={{
            marginBottom: 4,
            borderRadius: 6,
            overflow: 'hidden',
            border: isWinner ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '5px 8px',
              position: 'relative',
            }}>
              {/* Bar background */}
              <div style={{
                position: 'absolute',
                left: 0, top: 0, bottom: 0,
                width: `${pct}%`,
                background: `${color}22`,
                transition: 'width 0.5s ease',
              }} />

              <span style={{ position: 'relative', flex: 1, fontWeight: 600, fontSize: sz - 1 }}>
                {isWinner ? '🏆 ' : ''}{typeof opt === 'string' ? opt : opt.label || `Option ${idx + 1}`}
              </span>
              <span style={{
                position: 'relative',
                fontSize: sz - 2,
                fontWeight: 700,
                color,
              }}>
                {pct.toFixed(0)}%
              </span>
              <span style={{
                position: 'relative',
                fontSize: sz - 3,
                marginLeft: 6,
                color: 'rgba(255,255,255,0.4)',
              }}>
                {pool.toLocaleString()} pts
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
