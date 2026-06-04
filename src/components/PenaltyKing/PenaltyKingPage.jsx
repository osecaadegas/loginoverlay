import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import './PenaltyKingPage.css';

const MULTIPLIERS = [1.2, 1.5, 2.0, 3.0, 5.0, 8.0, 12.0, 20.0];

function getMultiplier(idx) {
  return MULTIPLIERS[Math.min(idx ?? 0, MULTIPLIERS.length - 1)];
}

export default function PenaltyKingPage() {
  const { user } = useAuth();
  const streamerId = user?.id;

  const [session, setSession]       = useState(null);
  const [shots, setShots]           = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [resetting, setResetting]   = useState(false);
  const [error, setError]           = useState('');

  // ─── Fetch current state ─────────────────────────────────────
  const fetchState = useCallback(async () => {
    if (!streamerId) return;
    try {
      const r = await fetch(`/api/penalty-king?action=get_state&streamer_id=${streamerId}`);
      const d = await r.json();
      if (d.success) {
        setSession(d.session);
        setShots(d.shots ?? []);
      }
    } catch { /* ignore */ }
  }, [streamerId]);

  // ─── Fetch leaderboard ───────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    if (!streamerId) return;
    try {
      const r = await fetch(`/api/penalty-king?action=get_leaderboard&streamer_id=${streamerId}`);
      const d = await r.json();
      if (d.success) setLeaderboard(d.leaderboard ?? []);
    } catch { /* ignore */ }
  }, [streamerId]);

  // ─── Init ────────────────────────────────────────────────────
  useEffect(() => {
    if (!streamerId) return;
    Promise.all([fetchState(), fetchLeaderboard()]).finally(() => setLoading(false));
    const timer = setInterval(() => { fetchState(); fetchLeaderboard(); }, 5000);
    return () => clearInterval(timer);
  }, [streamerId, fetchState, fetchLeaderboard]);

  // ─── Admin reset ─────────────────────────────────────────────
  async function handleReset() {
    if (!window.confirm('Force-end the active game session? The player will NOT be refunded.')) return;
    setResetting(true);
    try {
      const r = await fetch('/api/penalty-king', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_reset', streamer_id: streamerId }),
      });
      const d = await r.json();
      if (d.success) {
        await fetchState();
        setError('');
      } else {
        setError(d.error ?? 'Reset failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  }

  // ─── Status label ────────────────────────────────────────────
  function statusLabel(s) {
    if (!s) return 'IDLE';
    if (s === 'shooting')         return '⚽ SHOOTING';
    if (s === 'waiting_decision') return '⏳ WAITING DECISION';
    if (s === 'ended')            return '✅ ENDED';
    return s;
  }

  const multiplier = getMultiplier(session?.multiplier_idx);
  const potential  = session ? Math.floor(session.wager * multiplier) : 0;

  if (loading) {
    return (
      <div className="pk-page pk-page--loading">
        <span className="pk-page__spinner">⚽</span>
        <p>Loading Penalty King…</p>
      </div>
    );
  }

  return (
    <div className="pk-page">
      <div className="pk-page__header">
        <h1 className="pk-page__title">⚽ Penalty King</h1>
        <p className="pk-page__subtitle">
          Twitch chat football penalty mini-game with cash-out mechanic
        </p>
      </div>

      {error && (
        <div className="pk-page__error" role="alert">
          {error}
          <button className="pk-page__error-dismiss" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Chat command setup guide */}
      <div className="pk-page__section">
        <h2 className="pk-page__section-title">🔧 StreamElements Setup</h2>
        <p className="pk-page__help">
          Create these commands in your SE dashboard. Replace <code>YOUR_USER_ID</code> with your Supabase user ID: <code>{streamerId ?? '—'}</code>
        </p>
        <div className="pk-commands">
          {[
            {
              cmd: '!remate',
              url: `/api/chat-commands?cmd=remate&user_id=${streamerId}&requester=\${user}&w1=\${1}&w2=\${2}`,
              desc: 'Start / shoot a penalty. Usage: !remate [points] [spot 1-6]',
            },
            {
              cmd: '!cashout',
              url: `/api/chat-commands?cmd=cashout&user_id=${streamerId}&requester=\${user}`,
              desc: 'Cash out current streak winnings',
            },
            {
              cmd: '!continue',
              url: `/api/chat-commands?cmd=continue&user_id=${streamerId}&requester=\${user}&w1=\${1}`,
              desc: 'Continue shooting. Usage: !continue [spot 1-6]',
            },
          ].map(({ cmd, url, desc }) => (
            <div key={cmd} className="pk-commands__item">
              <div className="pk-commands__name">{cmd}</div>
              <div className="pk-commands__desc">{desc}</div>
              <div className="pk-commands__url">{url}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Current game */}
      <div className="pk-page__section">
        <div className="pk-page__section-header">
          <h2 className="pk-page__section-title">🎮 Current Game</h2>
          {session && (
            <button
              className="pk-page__btn pk-page__btn--danger"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? 'Resetting…' : 'Force Reset'}
            </button>
          )}
        </div>

        {!session ? (
          <div className="pk-page__empty">
            <span>No active game. Waiting for a viewer to type <strong>!remate</strong>.</span>
          </div>
        ) : (
          <div className="pk-current">
            <div className="pk-current__card">
              <div className="pk-current__badge pk-current__badge--status">
                {statusLabel(session.status)}
              </div>

              <div className="pk-current__row">
                <div className="pk-current__field">
                  <span className="pk-current__label">Player</span>
                  <span className="pk-current__value pk-current__value--player">
                    @{session.player_username}
                  </span>
                </div>
                <div className="pk-current__field">
                  <span className="pk-current__label">Wager</span>
                  <span className="pk-current__value">{session.wager.toLocaleString()} pts</span>
                </div>
                <div className="pk-current__field">
                  <span className="pk-current__label">Streak</span>
                  <span className="pk-current__value">{session.streak} goals</span>
                </div>
                <div className="pk-current__field">
                  <span className="pk-current__label">Multiplier</span>
                  <span className="pk-current__value pk-current__value--mult">{multiplier}x</span>
                </div>
                {session.status === 'waiting_decision' && (
                  <div className="pk-current__field">
                    <span className="pk-current__label">If cashout</span>
                    <span className="pk-current__value pk-current__value--gold">
                      {potential.toLocaleString()} pts
                    </span>
                  </div>
                )}
              </div>

              {/* Shot history for this session */}
              {shots.length > 0 && (
                <div className="pk-current__shots">
                  <span className="pk-current__shots-label">Shots this session:</span>
                  <div className="pk-current__shots-list">
                    {shots.map((s, i) => (
                      <span
                        key={s.id ?? i}
                        className={['pk-current__shot', s.is_goal ? 'pk-current__shot--goal' : 'pk-current__shot--miss'].join(' ')}
                        title={`Spot ${s.spot_chosen} vs GK ${s.gk_spot}`}
                      >
                        {s.is_goal ? '⚽' : '❌'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="pk-page__section">
        <h2 className="pk-page__section-title">🏆 Today's Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <div className="pk-page__empty">No games played today yet.</div>
        ) : (
          <table className="pk-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Best Streak</th>
                <th>Biggest Win</th>
                <th>Games</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, i) => (
                <tr key={row.player} className={i === 0 ? 'pk-table__row--gold' : ''}>
                  <td>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                  <td className="pk-table__player">{row.player}</td>
                  <td>{row.best_streak} goals</td>
                  <td>{(row.biggest_win ?? 0).toLocaleString()} pts</td>
                  <td>{row.games}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Multiplier reference */}
      <div className="pk-page__section">
        <h2 className="pk-page__section-title">📊 Multiplier Table</h2>
        <div className="pk-mult-table">
          {MULTIPLIERS.map((m, i) => (
            <div key={i} className={['pk-mult-table__item', i >= 4 ? 'pk-mult-table__item--fire' : ''].join(' ')}>
              <span className="pk-mult-table__goal">Goal {i + 1}</span>
              <span className="pk-mult-table__mult">{m}x</span>
            </div>
          ))}
        </div>
        <p className="pk-page__help" style={{ marginTop: '8px' }}>
          GK saves ~13% of shots on average. Player must choose spot 1-6 matching where the keeper won't dive.
          On cashout, player receives <code>wager × multiplier</code> points.
        </p>
      </div>
    </div>
  );
}
