/**
 * SaltyWordsWidget.jsx — OBS overlay for Salty Words community game.
 * Displays a grid of words with vote/bet counts. Streamer picks the word,
 * viewers who bet on it win.
 *
 * Chat integration: viewers type a word (or !bet <word>) in Twitch chat
 * to increment that word's counter live.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import useTwitchChat from '../../../hooks/useTwitchChat';
import { supabase } from '../../../config/supabaseClient';

function SaltyWordsWidget({ config, widgetId }) {
  const c = config || {};
  const isMetal = (c.displayStyle || 'v1') === 'metal';
  const words = c.words || [];
  const status = c.gameStatus || 'idle'; // idle | open | reveal | result
  const selectedWord = c.selectedWord || null;
  const accent = c.accentColor || '#f59e0b';
  const font = c.fontFamily || "'Inter', sans-serif";
  const title = c.title || 'Salty Words';
  const chatBettingEnabled = !!c.chatBettingEnabled;
  const totalBets = words.reduce((sum, w) => sum + (w.bets || 0), 0);

  /* ── Chat bet accumulation ── */
  const wordsRef = useRef(words);
  const pendingRef = useRef({}); // { username: wordIndex }
  const votersRef = useRef(new Set(c._voters || []));
  useEffect(() => { wordsRef.current = words; }, [words]);
  useEffect(() => { votersRef.current = new Set(c._voters || []); }, [c._voters]);

  // Flush pending bets to Supabase every 1.5s
  useEffect(() => {
    if (!widgetId) return;
    const timer = setInterval(async () => {
      const pending = { ...pendingRef.current };
      if (Object.keys(pending).length === 0) return;
      pendingRef.current = {};
      try {
        const { data } = await supabase
          .from('overlay_widgets')
          .select('config')
          .eq('id', widgetId)
          .single();
        if (!data) return;
        const cfg = data.config || {};
        const curWords = [...(cfg.words || [])];
        const curVoters = new Set(cfg._voters || []);
        let changed = false;
        for (const [user, idx] of Object.entries(pending)) {
          if (curVoters.has(user)) continue;
          if (curWords[idx]) {
            curWords[idx] = { ...curWords[idx], bets: (curWords[idx].bets || 0) + 1 };
            curVoters.add(user);
            changed = true;
          }
        }
        if (!changed) return;
        await supabase
          .from('overlay_widgets')
          .update({ config: { ...cfg, words: curWords, _voters: [...curVoters] }, updated_at: new Date().toISOString() })
          .eq('id', widgetId);
      } catch (err) {
        console.error('[SaltyWordsWidget] flush bets failed:', err);
        pendingRef.current = { ...pending, ...pendingRef.current };
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [widgetId]);

  /* ── Chat message handler ── */
  const handleChatMessage = useCallback((msg) => {
    if (!chatBettingEnabled || status !== 'open') return;
    const user = msg.username;
    if (!user) return;
    // One vote per user per round
    if (votersRef.current.has(user) || pendingRef.current[user] !== undefined) return;

    const txt = (msg.message || '').trim().toLowerCase();
    const curWords = wordsRef.current;

    // Match: !bet <word> OR just the word itself
    const betMatch = txt.match(/^!bet\s+(.+)$/);
    const lookup = betMatch ? betMatch[1].trim() : txt;

    const idx = curWords.findIndex(w => (w.text || '').toLowerCase() === lookup);
    if (idx === -1) return;

    pendingRef.current[user] = idx;
  }, [chatBettingEnabled, status]);

  const listenTwitch = chatBettingEnabled && status === 'open' && !!c.twitchEnabled && !!c.twitchChannel;
  useTwitchChat(listenTwitch ? c.twitchChannel : '', handleChatMessage);

  return (
    <div className="cg-salty" style={{
      '--accent': accent,
      fontFamily: font,
      ...(isMetal && {
        background: 'linear-gradient(145deg, #2a2d33 0%, #1a1c20 40%, #2e3238 100%)',
        border: '1px solid rgba(200,210,225,0.18)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        borderRadius: 10,
        color: '#d4d8e0',
      }),
    }}>
      {/* Title */}
      <div className="cg-salty__header">
        <span className="cg-salty__title" style={isMetal ? {
          background: 'linear-gradient(90deg, #c8ccd4, #e8ecf4, #a0a8b8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '0.14em',
        } : undefined}>{title}</span>
        <span className={`cg-salty__status cg-salty__status--${status}`} style={isMetal ? {
          background: 'linear-gradient(135deg, #555a65, #3a3e48)',
          color: '#a8b0c0',
          border: '1px solid rgba(200,210,225,0.2)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        } : undefined}>
          {status === 'idle' && '⏸ Waiting'}
          {status === 'open' && '🟢 Bets Open'}
          {status === 'reveal' && '👀 Revealing...'}
          {status === 'result' && '🏆 Result!'}
        </span>
      </div>

      {/* Word grid */}
      <div className="cg-salty__grid">
        {words.map((w, i) => {
          const isSelected = selectedWord === i;
          const percent = totalBets > 0 ? Math.round(((w.bets || 0) / totalBets) * 100) : 0;
          return (
            <div
              key={i}
              className={`cg-salty__word ${isSelected ? 'cg-salty__word--selected' : ''} ${status === 'result' && !isSelected ? 'cg-salty__word--dimmed' : ''}`}
              style={isMetal ? {
                background: 'linear-gradient(160deg, rgba(180,185,195,0.12) 0%, rgba(120,125,135,0.06) 100%)',
                border: '1px solid rgba(200,210,225,0.12)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 8px rgba(0,0,0,0.35)',
                ...(isSelected && {
                  border: '1px solid rgba(200,210,225,0.3)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.4)',
                }),
              } : undefined}
            >
              <div className="cg-salty__word-bar" style={isMetal ? {
                background: 'linear-gradient(90deg, #606878, #8a95a8, #a0aabb)',
                width: `${percent}%`,
              } : { width: `${percent}%` }} />
              <span className="cg-salty__word-text" style={isMetal ? {
                background: 'linear-gradient(90deg, #c8ccd4, #e8ecf4, #a0a8b8)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              } : undefined}>{w.text || `Word ${i + 1}`}</span>
              <div className="cg-salty__word-meta" style={isMetal ? { color: '#7a8090' } : undefined}>
                <span className="cg-salty__word-bets">{(w.bets || 0).toLocaleString()} votes</span>
                {totalBets > 0 && <span className="cg-salty__word-pct" style={isMetal ? { color: '#a8b0c0' } : undefined}>{percent}%</span>}
              </div>
              {isSelected && (
                <div className="cg-salty__word-crown">👑</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pool info */}
      {totalBets > 0 && (
        <div className="cg-salty__pool" style={isMetal ? {
          background: 'linear-gradient(160deg, rgba(180,185,195,0.08) 0%, rgba(120,125,135,0.04) 100%)',
          border: '1px solid rgba(200,210,225,0.1)',
          color: '#7a8090',
        } : undefined}>
          Total Votes: {totalBets.toLocaleString()}
        </div>
      )}

      {/* Empty state */}
      {words.length === 0 && (
        <div className="cg-salty__empty" style={isMetal ? { color: '#7a8090' } : undefined}>
          No words added yet. Set up the game in the config panel.
        </div>
      )}
    </div>
  );
}

export default React.memo(SaltyWordsWidget);
