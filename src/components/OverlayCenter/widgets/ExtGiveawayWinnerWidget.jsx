/**
 * Extension Giveaway Winner — Overlay Widget
 * Animated winner announcement that appears on stream
 */
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function ExtGiveawayWinnerWidget({ config = {}, widgetData = {} }) {
  const [winner, setWinner] = useState(null);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);
  const broadcasterId = widgetData.userId || config.broadcasterId;

  useEffect(() => {
    if (!broadcasterId) return;

    const channel = supabase
      .channel('ext-giveaway-winner-' + broadcasterId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ext_giveaway_winners',
      }, async (payload) => {
        // Check this winner is for our broadcaster
        const { data: giveaway } = await supabase
          .from('ext_giveaways')
          .select('broadcaster_id, prize_name')
          .eq('id', payload.new.giveaway_id)
          .single();

        if (giveaway?.broadcaster_id === broadcasterId) {
          showWinner({
            name: payload.new.twitch_display_name,
            prize: giveaway.prize_name,
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [broadcasterId]);

  const showWinner = (w) => {
    setWinner(w);
    setVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, (config.displayDuration || 8) * 1000);
  };

  if (!visible || !winner) return null;

  const fg = config.textColor || '#ffffff';
  const bg = config.bgColor || 'rgba(15,23,42,0.95)';
  const accent = config.accentColor || '#ffd700';
  const font = config.fontFamily || "'Inter', sans-serif";
  const sz = config.fontSize || 18;

  return (
    <div style={{
      fontFamily: font,
      color: fg,
      background: bg,
      borderRadius: config.borderRadius || 16,
      padding: '20px 28px',
      textAlign: 'center',
      minWidth: 300,
      border: `2px solid ${accent}`,
      boxShadow: `0 0 30px ${accent}44, 0 0 60px ${accent}22`,
      animation: 'extGiveawayFadeIn 0.6s ease',
    }}>
      <style>{`
        @keyframes extGiveawayFadeIn {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes extTrophyBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @keyframes extConfetti {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(100px) rotate(720deg); }
        }
      `}</style>

      {/* Trophy */}
      <div style={{
        fontSize: 48,
        animation: 'extTrophyBounce 0.8s ease infinite',
        marginBottom: 8,
      }}>🏆</div>

      {/* Title */}
      <div style={{
        fontSize: sz - 4,
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: accent,
        fontWeight: 700,
        marginBottom: 4,
      }}>
        {config.winnerTitle || 'GIVEAWAY WINNER'}
      </div>

      {/* Winner name */}
      <div style={{
        fontSize: sz + 8,
        fontWeight: 900,
        background: `linear-gradient(135deg, ${accent}, #ffffff)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: 8,
      }}>
        {winner.name}
      </div>

      {/* Prize */}
      {winner.prize && (
        <div style={{
          fontSize: sz - 2,
          color: 'rgba(255,255,255,0.7)',
        }}>
          Won: <strong style={{ color: accent }}>{winner.prize}</strong>
        </div>
      )}

      {/* Confetti particles */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        borderRadius: config.borderRadius || 16,
      }}>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${10 + Math.random() * 80}%`,
            top: '-10px',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: ['#ffd700', '#ff6b6b', '#6366f1', '#22c55e', '#f59e0b'][i % 5],
            animation: `extConfetti ${1.5 + Math.random() * 1.5}s ease ${Math.random() * 0.5}s forwards`,
          }} />
        ))}
      </div>
    </div>
  );
}
