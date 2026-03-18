/**
 * SaltyWordsConfig.jsx — Streamer control panel for Salty Words game.
 * Add words, open/close betting, select the winning word.
 * Listens to Twitch chat so the live preview also shows vote counts.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import useTwitchChat from '../../../hooks/useTwitchChat';
import TabBar from './shared/TabBar';
import { makePerStyleSetters } from './shared/perStyleConfig';
import { SALTY_WORDS_STYLE_KEYS } from './styleKeysRegistry';

export default function SaltyWordsConfig({ config, onChange }) {
  const c = config || {};
  const currentStyle = c.displayStyle || 'v1';
  const { set, setMulti } = makePerStyleSetters(onChange, c, currentStyle, SALTY_WORDS_STYLE_KEYS);
  const [tab, setTab] = useState('game');
  const [newWord, setNewWord] = useState('');

  const words = c.words || [];
  const status = c.gameStatus || 'idle';
  const history = c.saltyHistory || [];
  const chatBettingEnabled = !!c.chatBettingEnabled;

  /* ── Chat bet accumulation (same pattern as CoinFlip) ── */
  const wordsRef = useRef(words);
  const votersRef = useRef(new Set(c._voters || []));
  const pendingRef = useRef({});
  useEffect(() => { wordsRef.current = words; }, [words]);
  useEffect(() => { votersRef.current = new Set(c._voters || []); }, [c._voters]);

  // Flush pending chat votes into config every 1.5s
  useEffect(() => {
    const timer = setInterval(() => {
      const pending = { ...pendingRef.current };
      if (Object.keys(pending).length === 0) return;
      pendingRef.current = {};
      const curWords = [...wordsRef.current];
      const curVoters = new Set(votersRef.current);
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
      onChange({ ...config, words: curWords, _voters: [...curVoters] });
    }, 1500);
    return () => clearInterval(timer);
  });

  /* ── Chat message handler: viewers type the word (or !bet <word>) ── */
  const handleChatMessage = useCallback((msg) => {
    if (!chatBettingEnabled || status !== 'open') return;
    const user = msg.username;
    if (!user) return;
    if (votersRef.current.has(user) || pendingRef.current[user] !== undefined) return;

    const txt = (msg.message || '').trim().toLowerCase();
    const curWords = wordsRef.current;
    const betMatch = txt.match(/^!bet\s+(.+)$/);
    const lookup = betMatch ? betMatch[1].trim() : txt;

    const idx = curWords.findIndex(w => (w.text || '').toLowerCase() === lookup);
    if (idx === -1) return;
    pendingRef.current[user] = idx;
  }, [chatBettingEnabled, status]);

  const chatActive = chatBettingEnabled && status === 'open' && !!c.twitchEnabled && !!c.twitchChannel;
  useTwitchChat(chatActive ? c.twitchChannel : '', handleChatMessage);

  /* ── Word management ── */
  const addWord = () => {
    const w = newWord.trim();
    if (w && words.length < 12) {
      set('words', [...words, { text: w, bets: 0 }]);
      setNewWord('');
    }
  };
  const removeWord = (idx) => {
    set('words', words.filter((_, i) => i !== idx));
  };
  const updateWord = (idx, text) => {
    const updated = [...words];
    updated[idx] = { ...updated[idx], text };
    set('words', updated);
  };

  /* ── Game actions ── */
  const openBets = () => {
    if (words.length < 2) return;
    setMulti({
      gameStatus: 'open',
      selectedWord: null,
      _voters: [],
      words: words.map(w => ({ ...w, bets: 0 })),
    });
  };
  const selectWord = (idx) => {
    const totalBets = words.reduce((s, w) => s + (w.bets || 0), 0);
    const entry = {
      word: words[idx]?.text || '',
      wordCount: words.length,
      pool: totalBets,
      time: new Date().toLocaleTimeString(),
    };
    setMulti({
      gameStatus: 'result',
      selectedWord: idx,
      saltyHistory: [entry, ...history].slice(0, 20),
    });
  };
  const resetGame = () => setMulti({
    gameStatus: 'idle', selectedWord: null, _voters: [],
    words: words.map(w => ({ ...w, bets: 0 })),
  });
  const clearAll = () => setMulti({
    gameStatus: 'idle', selectedWord: null, _voters: [], words: [],
  });

  const totalBets = words.reduce((s, w) => s + (w.bets || 0), 0);
  const totalVoters = (c._voters || []).length;

  const tabs = [
    { id: 'game', label: '🎮 Game' },
    { id: 'words', label: '📝 Words' },
    { id: 'chat', label: '💬 Chat' },
    { id: 'style', label: '🎨 Style' },
    { id: 'history', label: '📜 History' },
  ];

  return (
    <div className="cg-config">
      <TabBar tabs={tabs} active={tab} onChange={setTab} variant="cg" />

      {/* ═══ GAME TAB ═══ */}
      {tab === 'game' && (
        <div className="cg-config__section">
          <label className="cg-config__field">
            <span>Game Title</span>
            <input value={c.title || ''} onChange={e => set('title', e.target.value)} placeholder="Salty Words" />
          </label>

          <div className="cg-config__status-card">
            <div className="cg-config__status-row">
              <span className="cg-config__status-label">Status</span>
              <span className={`cg-config__status-badge cg-config__status-badge--${status}`}>
                {status === 'idle' ? '⏸ Idle' : status === 'open' ? '🟢 Bets Open' : '🏆 Result'}
              </span>
            </div>
            <div className="cg-config__status-row">
              <span>Words</span>
              <span style={{ fontWeight: 700 }}>{words.length}</span>
            </div>
            <div className="cg-config__status-row">
              <span>Total Votes</span>
              <span style={{ fontWeight: 700, color: '#f59e0b' }}>
                {totalBets.toLocaleString()}
              </span>
            </div>
            {totalVoters > 0 && (
              <div className="cg-config__status-row">
                <span>Unique Voters</span>
                <span style={{ fontWeight: 700 }}>{totalVoters}</span>
              </div>
            )}
          </div>

          <div className="cg-config__actions">
            {status === 'idle' && (
              <button className="cg-config__btn cg-config__btn--primary" onClick={openBets}
                disabled={words.length < 2}>
                🟢 Open Bets {words.length < 2 && '(need 2+ words)'}
              </button>
            )}
            {status === 'open' && (
              <>
                <p className="cg-config__hint">
                  {chatBettingEnabled && c.twitchEnabled && c.twitchChannel
                    ? `💬 Listening to #${c.twitchChannel} — viewers type a word to vote`
                    : 'Click a word to select the winner:'}
                </p>
                <div className="cg-config__word-select">
                  {words.map((w, i) => (
                    <button key={i} className="cg-config__btn cg-config__btn--accent" onClick={() => selectWord(i)}>
                      👑 {w.text} ({w.bets || 0})
                    </button>
                  ))}
                </div>
                <button className="cg-config__btn cg-config__btn--muted" onClick={resetGame}>
                  ⏸ Cancel
                </button>
              </>
            )}
            {status === 'result' && (
              <button className="cg-config__btn cg-config__btn--primary" onClick={resetGame}>
                🔄 New Round
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ WORDS TAB ═══ */}
      {tab === 'words' && (
        <div className="cg-config__section">
          <p className="cg-config__hint">Add up to 12 words for viewers to bet on. The streamer picks the winning word.</p>
          <div className="cg-config__add-row">
            <input value={newWord} onChange={e => setNewWord(e.target.value)} placeholder="Enter a word..."
              maxLength={30} onKeyDown={e => e.key === 'Enter' && addWord()} />
            <button className="cg-config__btn cg-config__btn--primary" onClick={addWord}
              disabled={!newWord.trim() || words.length >= 12}>
              + Add
            </button>
          </div>
          <div className="cg-config__word-list">
            {words.map((w, i) => (
              <div key={i} className="cg-config__word-item">
                <span className="cg-config__word-num">{i + 1}</span>
                <input value={w.text} onChange={e => updateWord(i, e.target.value)} className="cg-config__word-input" />
                <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 36, textAlign: 'right' }}>{w.bets || 0} votes</span>
                <button className="cg-config__symbol-remove" onClick={() => removeWord(i)}>✕</button>
              </div>
            ))}
          </div>
          {words.length > 0 && (
            <button className="cg-config__btn cg-config__btn--muted" onClick={clearAll}>
              🗑️ Clear All Words
            </button>
          )}
        </div>
      )}

      {/* ═══ CHAT TAB ═══ */}
      {tab === 'chat' && (
        <div className="cg-config__section">
          <p className="cg-config__hint">
            When enabled, viewers vote by typing a word from the list in chat (or <code>!bet word</code>). One vote per viewer per round.
          </p>

          <label className="cg-config__toggle">
            <input type="checkbox" checked={chatBettingEnabled} onChange={e => set('chatBettingEnabled', e.target.checked)} />
            <span>Enable Chat Voting</span>
          </label>

          {chatBettingEnabled && (
            <>
              <label className="cg-config__toggle">
                <input type="checkbox" checked={!!c.twitchEnabled} onChange={e => set('twitchEnabled', e.target.checked)} />
                <span>Twitch Chat</span>
              </label>
              {c.twitchEnabled && (
                <label className="cg-config__field">
                  <span>Twitch Channel</span>
                  <input value={c.twitchChannel || ''} onChange={e => set('twitchChannel', e.target.value.toLowerCase().trim())}
                    placeholder="your_channel" />
                </label>
              )}

              {chatActive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4ade80', marginTop: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                  Connected to #{c.twitchChannel}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ STYLE TAB ═══ */}
      {tab === 'style' && (
        <div className="cg-config__section">
          <div className="cg-config__color-row">
            <label className="cg-config__color">
              <span>Accent</span>
              <input type="color" value={c.accentColor || '#f59e0b'} onChange={e => set('accentColor', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Text</span>
              <input type="color" value={c.textColor || '#ffffff'} onChange={e => set('textColor', e.target.value)} />
            </label>
            <label className="cg-config__color">
              <span>Card Bg</span>
              <input type="color" value={c.cardBg || '#1e293b'} onChange={e => set('cardBg', e.target.value)} />
            </label>
          </div>
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {tab === 'history' && (
        <div className="cg-config__section">
          {history.length === 0 ? (
            <p className="cg-config__hint">No rounds yet.</p>
          ) : (
            <div className="cg-config__history">
              {history.map((h, i) => (
                <div key={i} className="cg-config__history-row">
                  <span style={{ fontWeight: 700, color: '#f59e0b' }}>👑 {h.word}</span>
                  <span className="cg-config__history-pool">{h.pool?.toLocaleString() || 0} votes</span>
                  <span className="cg-config__history-time">{h.time}</span>
                </div>
              ))}
            </div>
          )}
          {history.length > 0 && (
            <button className="cg-config__btn cg-config__btn--muted" onClick={() => set('saltyHistory', [])}>
              🗑️ Clear History
            </button>
          )}
        </div>
      )}
    </div>
  );
}
