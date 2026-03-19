/**
 * Stats Panel — Streamer Stats Dashboard
 * - Session stats: biggest win, total profit/loss, slots played
 * - Historical stats across streams
 * - Favourite slots leaderboard
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getSessionStats, getAllTimeStats, getSessionHistory, getFavouriteSlots } from '../extApi';

export default function StatsPanel() {
  const [subTab, setSubTab] = useState('session'); // session | alltime | history | slots
  const [session, setSession] = useState(null);
  const [allTime, setAllTime] = useState(null);
  const [history, setHistory] = useState([]);
  const [favSlots, setFavSlots] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const [sessRes, statsRes, histRes, slotsRes] = await Promise.all([
        getSessionStats(),
        getAllTimeStats(),
        getSessionHistory(),
        getFavouriteSlots(),
      ]);
      setSession(sessRes.session);
      setAllTime(statsRes.stats);
      setHistory(histRes.sessions || []);
      setFavSlots(slotsRes.favourite_slots || []);
    } catch (err) {
      console.error('Stats load error:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const fmt = (v) => {
    const n = parseFloat(v) || 0;
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(2);
  };

  const pnl = (wagered, won) => {
    const w = parseFloat(wagered) || 0;
    const wn = parseFloat(won) || 0;
    return wn - w;
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {[
          { id: 'session', label: '📺 Live' },
          { id: 'alltime', label: '📊 All-Time' },
          { id: 'history', label: '📅 History' },
          { id: 'slots', label: '🎰 Fav Slots' },
        ].map(t => (
          <button
            key={t.id}
            className={`ext-btn ext-btn-sm ${subTab === t.id ? 'ext-btn-primary' : 'ext-btn-ghost'}`}
            onClick={() => setSubTab(t.id)}
            style={{ flex: 1 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* LIVE SESSION */}
      {subTab === 'session' && (
        session ? (
          <div>
            <div style={{
              textAlign: 'center',
              padding: '6px 0 10px',
              fontSize: 11,
              color: 'var(--ext-success)',
              fontWeight: 600,
            }}>
              🔴 LIVE SESSION
            </div>

            <div className="ext-stats-grid">
              <div className="ext-stat-card">
                <div className="ext-stat-value" style={{
                  color: pnl(session.total_wagered, session.total_won) >= 0
                    ? 'var(--ext-success)' : 'var(--ext-danger)',
                }}>
                  {pnl(session.total_wagered, session.total_won) >= 0 ? '+' : ''}
                  {session.currency}{fmt(pnl(session.total_wagered, session.total_won))}
                </div>
                <div className="ext-stat-label">Profit/Loss</div>
              </div>

              <div className="ext-stat-card">
                <div className="ext-stat-value">
                  {session.currency}{fmt(session.biggest_win)}
                </div>
                <div className="ext-stat-label">Biggest Win</div>
              </div>

              <div className="ext-stat-card">
                <div className="ext-stat-value">{session.biggest_multiplier || 0}x</div>
                <div className="ext-stat-label">Best Multi</div>
              </div>

              <div className="ext-stat-card">
                <div className="ext-stat-value">{session.slots_played || 0}</div>
                <div className="ext-stat-label">Slots Played</div>
              </div>

              <div className="ext-stat-card">
                <div className="ext-stat-value">
                  {session.currency}{fmt(session.total_wagered)}
                </div>
                <div className="ext-stat-label">Total Wagered</div>
              </div>

              <div className="ext-stat-card">
                <div className="ext-stat-value">
                  {session.currency}{fmt(session.total_won)}
                </div>
                <div className="ext-stat-label">Total Won</div>
              </div>
            </div>

            {session.biggest_win_slot && (
              <div style={{
                marginTop: 10,
                padding: '8px 10px',
                background: 'rgba(255,215,0,0.08)',
                borderRadius: 6,
                fontSize: 12,
                textAlign: 'center',
              }}>
                🏆 Best: <strong>{session.biggest_win_slot}</strong> — {session.currency}{fmt(session.biggest_win)}
              </div>
            )}

            {/* Session slots */}
            {session.ext_session_slots?.length > 0 && (
              <>
                <div className="ext-section-title" style={{ marginTop: 12 }}>🎰 Slots This Session</div>
                {session.ext_session_slots
                  .sort((a, b) => (parseFloat(b.biggest_win) || 0) - (parseFloat(a.biggest_win) || 0))
                  .slice(0, 10)
                  .map((slot, i) => (
                    <div key={i} className="ext-slot-card">
                      {slot.image_url ? (
                        <img className="ext-slot-img" src={slot.image_url} alt="" />
                      ) : (
                        <div className="ext-slot-img" style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18,
                        }}>🎰</div>
                      )}
                      <div className="ext-slot-info">
                        <div className="ext-slot-name">{slot.slot_name}</div>
                        <div className="ext-slot-provider">{slot.provider || ''}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 11 }}>
                        <div style={{
                          fontWeight: 700,
                          color: pnl(slot.total_wagered, slot.total_won) >= 0
                            ? 'var(--ext-success)' : 'var(--ext-danger)',
                        }}>
                          {pnl(slot.total_wagered, slot.total_won) >= 0 ? '+' : ''}
                          {fmt(pnl(slot.total_wagered, slot.total_won))}
                        </div>
                        <div style={{ color: 'var(--ext-muted)' }}>
                          {slot.biggest_multiplier ? `${slot.biggest_multiplier}x` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
        ) : (
          <div className="ext-empty">
            <span className="ext-empty-icon">📺</span>
            <span className="ext-empty-text">No live session</span>
            <span className="ext-empty-text">Stats will show when the stream starts</span>
          </div>
        )
      )}

      {/* ALL-TIME */}
      {subTab === 'alltime' && (
        allTime ? (
          <div>
            <div className="ext-stats-grid">
              <div className="ext-stat-card">
                <div className="ext-stat-value">{allTime.total_sessions}</div>
                <div className="ext-stat-label">Sessions</div>
              </div>
              <div className="ext-stat-card">
                <div className="ext-stat-value" style={{
                  color: pnl(allTime.total_wagered, allTime.total_won) >= 0
                    ? 'var(--ext-success)' : 'var(--ext-danger)',
                }}>
                  {pnl(allTime.total_wagered, allTime.total_won) >= 0 ? '+' : ''}
                  {fmt(pnl(allTime.total_wagered, allTime.total_won))}
                </div>
                <div className="ext-stat-label">All-Time P/L</div>
              </div>
              <div className="ext-stat-card">
                <div className="ext-stat-value">{fmt(allTime.biggest_win_ever)}</div>
                <div className="ext-stat-label">Biggest Win</div>
              </div>
              <div className="ext-stat-card">
                <div className="ext-stat-value">{allTime.biggest_multiplier_ever || 0}x</div>
                <div className="ext-stat-label">Best Multi</div>
              </div>
              <div className="ext-stat-card">
                <div className="ext-stat-value">{allTime.total_slots_played}</div>
                <div className="ext-stat-label">Slots Played</div>
              </div>
              <div className="ext-stat-card">
                <div className="ext-stat-value">{allTime.total_bonus_hunts}</div>
                <div className="ext-stat-label">Bonus Hunts</div>
              </div>
            </div>

            {allTime.biggest_win_slot && (
              <div style={{
                marginTop: 10,
                padding: '8px 10px',
                background: 'rgba(255,215,0,0.08)',
                borderRadius: 6,
                fontSize: 12,
                textAlign: 'center',
              }}>
                🏆 All-time best: <strong>{allTime.biggest_win_slot}</strong> — {fmt(allTime.biggest_win_ever)}
              </div>
            )}
          </div>
        ) : (
          <div className="ext-empty">
            <span className="ext-empty-icon">📊</span>
            <span className="ext-empty-text">No stats available yet</span>
          </div>
        )
      )}

      {/* HISTORY */}
      {subTab === 'history' && (
        history.length > 0 ? (
          <div>
            {history.map((s, i) => {
              const profit = pnl(s.total_wagered, s.total_won);
              const date = new Date(s.started_at);
              return (
                <div key={s.id} className="ext-card" style={{ padding: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>
                        {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ext-muted)' }}>
                        {s.slots_played} slots
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontWeight: 700, fontSize: 14,
                        color: profit >= 0 ? 'var(--ext-success)' : 'var(--ext-danger)',
                      }}>
                        {profit >= 0 ? '+' : ''}{fmt(profit)}
                      </div>
                      {s.biggest_win_slot && (
                        <div style={{ fontSize: 10, color: 'var(--ext-muted)' }}>
                          Best: {s.biggest_win_slot}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ext-empty">
            <span className="ext-empty-icon">📅</span>
            <span className="ext-empty-text">No session history yet</span>
          </div>
        )
      )}

      {/* FAVOURITE SLOTS */}
      {subTab === 'slots' && (
        favSlots.length > 0 ? (
          <div>
            <div className="ext-section-title">🎰 Most Played Slots</div>
            {favSlots.slice(0, 15).map((slot, i) => (
              <div key={i} className="ext-lb-row">
                <span className={`ext-lb-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                  {i <= 2 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                </span>
                <div className="ext-lb-name">
                  <div>{slot.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--ext-muted)' }}>{slot.provider}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="ext-lb-val">{slot.times_played}x</div>
                  <div style={{ fontSize: 10, color: 'var(--ext-muted)' }}>
                    {parseFloat(slot.total_won || 0) >= 0 ? '+' : ''}{fmt(slot.total_won)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ext-empty">
            <span className="ext-empty-icon">🎰</span>
            <span className="ext-empty-text">No slot data yet</span>
          </div>
        )
      )}
    </div>
  );
}
