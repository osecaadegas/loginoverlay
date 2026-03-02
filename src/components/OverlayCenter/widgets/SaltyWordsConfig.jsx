/**
 * SaltyWordsConfig.jsx — Streamer control panel for Salty Words game.
 * Add words, open/close betting, select the winning word.
 */
import React, { useState } from 'react';

export default function SaltyWordsConfig({ config, onChange }) {
  const c = config || {};
  const set = (k, v) => onChange({ ...c, [k]: v });
  const setMulti = (obj) => onChange({ ...c, ...obj });
  const [tab, setTab] = useState('game');
  const [newWord, setNewWord] = useState('');

  const words = c.words || [];
  const status = c.gameStatus || 'idle';
  const history = c.saltyHistory || [];

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
    setMulti({ gameStatus: 'open', selectedWord: null });
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
    gameStatus: 'idle', selectedWord: null,
    words: words.map(w => ({ ...w, bets: 0 })),
  });
  const clearAll = () => setMulti({
    gameStatus: 'idle', selectedWord: null, words: [],
  });

  const tabs = [
    { id: 'game', label: '🎮 Game' },
    { id: 'words', label: '📝 Words' },
    { id: 'style', label: '🎨 Style' },
    { id: 'history', label: '📜 History' },
  ];

  return (
    <div className="cg-config">
      <div className="cg-config__tabs">
        {tabs.map(t => (
          <button key={t.id}
            className={`cg-config__tab ${tab === t.id ? 'cg-config__tab--active' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

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
              <span>Total Pool</span>
              <span style={{ fontWeight: 700, color: '#f59e0b' }}>
                {words.reduce((s, w) => s + (w.bets || 0), 0).toLocaleString()} pts
              </span>
            </div>
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
                <p className="cg-config__hint">Click a word below to select the winner:</p>
                <div className="cg-config__word-select">
                  {words.map((w, i) => (
                    <button key={i} className="cg-config__btn cg-config__btn--accent" onClick={() => selectWord(i)}>
                      👑 {w.text}
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
                  <span className="cg-config__history-pool">{h.pool?.toLocaleString() || 0} pts</span>
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
