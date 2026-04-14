/**
 * Twitch Extension Video Overlay
 * 
 * Transparent layer on top of the stream video.
 * Shows: Active predictions, live bets, giveaway winners, current slot, session stats.
 * Viewers can click to interact (predict, bet, enter giveaway) without leaving the video.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { setTwitchAuth, getConfig, getPoints, getPrediction, submitPrediction, getBets, placeBet, getGiveaways, enterGiveaway, getSessionStats, getLeaderboard } from './extApi';

// ─── Styles ─────────────────────────────────────────────

const styles = {
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#fff',
    overflow: 'hidden',
  },
  // Toggle button (bottom-right)
  toggleBtn: {
    position: 'absolute',
    bottom: 60,
    right: 16,
    pointerEvents: 'auto',
    background: 'rgba(145, 70, 255, 0.9)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
    transition: 'all 0.2s',
    zIndex: 100,
  },
  // Side panel (slides in from right)
  sidePanel: (open) => ({
    position: 'absolute',
    top: 8,
    right: open ? 8 : -320,
    width: 300,
    maxHeight: 'calc(100% - 80px)',
    pointerEvents: open ? 'auto' : 'none',
    background: 'rgba(14, 14, 16, 0.92)',
    borderRadius: 12,
    border: '1px solid rgba(145, 70, 255, 0.3)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
    transition: 'right 0.3s ease',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
  }),
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(145, 70, 255, 0.15)',
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: 700,
    margin: 0,
  },
  pointsBadge: {
    fontSize: 12,
    background: 'rgba(145, 70, 255, 0.4)',
    padding: '3px 10px',
    borderRadius: 20,
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
  },
  tabRow: {
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    overflow: 'auto',
  },
  tab: (active) => ({
    flex: 1,
    padding: '8px 4px',
    fontSize: 11,
    fontWeight: active ? 700 : 500,
    textAlign: 'center',
    cursor: 'pointer',
    background: active ? 'rgba(145, 70, 255, 0.2)' : 'transparent',
    borderBottom: active ? '2px solid #9146ff' : '2px solid transparent',
    color: active ? '#fff' : '#888',
    transition: 'all 0.15s',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: active ? '#9146ff' : 'transparent',
  }),
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: 12,
    fontSize: 13,
  },
  // Notification toast (top-left)
  toast: (visible) => ({
    position: 'absolute',
    top: 12,
    left: 12,
    pointerEvents: 'none',
    background: 'rgba(14, 14, 16, 0.92)',
    borderRadius: 10,
    border: '1px solid rgba(145, 70, 255, 0.4)',
    backdropFilter: 'blur(10px)',
    padding: '10px 16px',
    maxWidth: 280,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(-12px)',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
    zIndex: 60,
  }),
  toastTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
    color: '#bf94ff',
  },
  toastBody: {
    fontSize: 12,
    color: '#ccc',
  },
  // Cards
  card: {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
  },
  btn: (color = '#9146ff') => ({
    background: color,
    border: 'none',
    borderRadius: 6,
    color: '#fff',
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    marginTop: 6,
  }),
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 12,
    color: '#fff',
    outline: 'none',
    marginBottom: 6,
    boxSizing: 'border-box',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: 12,
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  statLabel: { color: '#888' },
  statVal: { color: '#fff', fontWeight: 600 },
  optionBar: (pct, isWinner) => ({
    background: isWinner ? 'rgba(0,200,80,0.15)' : 'rgba(145, 70, 255, 0.12)',
    borderRadius: 6,
    padding: '6px 10px',
    marginBottom: 4,
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    border: isWinner ? '1px solid rgba(0,200,80,0.3)' : '1px solid rgba(255,255,255,0.06)',
  }),
  optionFill: (pct) => ({
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    width: `${pct}%`,
    background: 'rgba(145, 70, 255, 0.2)',
    borderRadius: 6,
    transition: 'width 0.4s ease',
  }),
  emptyState: {
    textAlign: 'center',
    color: '#555',
    padding: '20px 0',
    fontSize: 12,
  },
};

// ─── Prediction Section ─────────────────────────────────

function PredictionSection({ points, onRefresh }) {
  const [prediction, setPrediction] = useState(null);
  const [myEntry, setMyEntry] = useState(null);
  const [multi, setMulti] = useState('');
  const [wager, setWager] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getPrediction();
      setPrediction(d.prediction);
      setMyEntry(d.my_entry);
    } catch {}
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const submit = async () => {
    if (!prediction || !multi) return;
    setLoading(true);
    try {
      await submitPrediction(prediction.id, parseFloat(multi), parseInt(wager) || 0);
      setMulti('');
      setWager('');
      await load();
      onRefresh?.();
    } catch {}
    setLoading(false);
  };

  if (!prediction) return <div style={styles.emptyState}>No active prediction</div>;

  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        🎯 Bonus #{prediction.bonus_index} — {prediction.slot_name || 'Unknown'}
      </div>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
        {prediction.total_entries} predictions so far
      </div>
      {myEntry ? (
        <div style={{ fontSize: 12, color: '#bf94ff' }}>
          ✅ You predicted: {myEntry.predicted_multiplier}x
          {myEntry.points_wagered > 0 ? ` (${myEntry.points_wagered} pts)` : ''}
        </div>
      ) : prediction.status === 'open' ? (
        <>
          <input
            style={styles.input}
            type="number"
            step="0.01"
            placeholder="Multiplier (e.g. 150.5)"
            value={multi}
            onChange={e => setMulti(e.target.value)}
          />
          <input
            style={styles.input}
            type="number"
            placeholder={`Wager (${points} pts available)`}
            value={wager}
            onChange={e => setWager(e.target.value)}
          />
          <button style={styles.btn()} onClick={submit} disabled={loading}>
            {loading ? '...' : 'Predict'}
          </button>
        </>
      ) : (
        <div style={{ fontSize: 12, color: '#f44' }}>Predictions locked</div>
      )}
    </div>
  );
}

// ─── Bets Section ───────────────────────────────────────

function BetsSection({ points, onRefresh }) {
  const [bets, setBets] = useState([]);
  const [selectedOption, setSelectedOption] = useState({});
  const [wagers, setWagers] = useState({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getBets();
      setBets(d.bets || []);
    } catch {}
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const bet = async (betId) => {
    const optId = selectedOption[betId];
    const amt = parseInt(wagers[betId]) || 0;
    if (!optId || !amt) return;
    setLoading(true);
    try {
      await placeBet(betId, optId, amt);
      await load();
      onRefresh?.();
    } catch {}
    setLoading(false);
  };

  if (!bets.length) return <div style={styles.emptyState}>No active bets</div>;

  return bets.map(b => {
    const options = b.options || [];
    return (
      <div key={b.id} style={styles.card}>
        <div style={styles.cardTitle}>💰 {b.title}</div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
          Pool: {b.total_pool} pts • {b.status}
        </div>
        {options.map(opt => {
          const pct = b.total_pool > 0 ? Math.round((opt.pool || 0) / b.total_pool * 100) : 0;
          return (
            <div
              key={opt.id}
              style={{
                ...styles.optionBar(pct, b.status === 'resolved' && b.winning_option === opt.id),
                cursor: b.status === 'open' ? 'pointer' : 'default',
                outline: selectedOption[b.id] === opt.id ? '2px solid #9146ff' : 'none',
              }}
              onClick={() => b.status === 'open' && setSelectedOption(p => ({ ...p, [b.id]: opt.id }))}
            >
              <div style={styles.optionFill(pct)} />
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span>{opt.label}</span>
                <span style={{ color: '#888' }}>{pct}%</span>
              </div>
            </div>
          );
        })}
        {b.status === 'open' && b.my_entry == null && (
          <>
            <input
              style={styles.input}
              type="number"
              placeholder="Wager amount"
              value={wagers[b.id] || ''}
              onChange={e => setWagers(p => ({ ...p, [b.id]: e.target.value }))}
            />
            <button style={styles.btn()} onClick={() => bet(b.id)} disabled={loading}>
              {loading ? '...' : 'Place Bet'}
            </button>
          </>
        )}
        {b.my_entry && (
          <div style={{ fontSize: 11, color: '#bf94ff', marginTop: 4 }}>
            ✅ Bet placed: {b.my_entry.points_wagered} pts on "{options.find(o => o.id === b.my_entry.option_id)?.label || '?'}"
          </div>
        )}
      </div>
    );
  });
}

// ─── Giveaway Section ───────────────────────────────────

function GiveawaySection({ points, onRefresh }) {
  const [giveaways, setGiveaways] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getGiveaways();
      setGiveaways(d.giveaways || []);
    } catch {}
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const enter = async (id) => {
    setLoading(true);
    try {
      await enterGiveaway(id, 1);
      await load();
      onRefresh?.();
    } catch {}
    setLoading(false);
  };

  if (!giveaways.length) return <div style={styles.emptyState}>No active giveaways</div>;

  return giveaways.map(g => (
    <div key={g.id} style={styles.card}>
      <div style={styles.cardTitle}>🎁 {g.title}</div>
      <div style={{ fontSize: 12, marginBottom: 4 }}>{g.prize}</div>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
        {g.entry_count || 0} entries • {g.ticket_cost > 0 ? `${g.ticket_cost} pts/ticket` : 'Free'}
      </div>
      {g.my_entry ? (
        <div style={{ fontSize: 12, color: '#bf94ff' }}>✅ Entered ({g.my_entry.tickets} tickets)</div>
      ) : g.status === 'open' ? (
        <button style={styles.btn('#00c850')} onClick={() => enter(g.id)} disabled={loading}>
          {loading ? '...' : g.ticket_cost > 0 ? `Enter (${g.ticket_cost} pts)` : 'Enter Free'}
        </button>
      ) : (
        <div style={{ fontSize: 12, color: '#f44' }}>Closed</div>
      )}
      {g.winners?.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#ffd700' }}>
          🏆 Winners: {g.winners.map(w => w.twitch_display_name).join(', ')}
        </div>
      )}
    </div>
  ));
}

// ─── Stats Section ──────────────────────────────────────

function StatsSection() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getSessionStats().then(d => setStats(d.session)).catch(() => {});
  }, []);

  if (!stats) return <div style={styles.emptyState}>Not live</div>;

  const profit = (stats.total_won - stats.total_wagered).toFixed(2);
  const profitColor = profit >= 0 ? '#00c850' : '#f44';

  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>📊 Live Session</div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>Wagered</span>
        <span style={styles.statVal}>{stats.currency}{stats.total_wagered}</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>Won</span>
        <span style={styles.statVal}>{stats.currency}{stats.total_won}</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>Profit</span>
        <span style={{ ...styles.statVal, color: profitColor }}>{stats.currency}{profit}</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>Biggest Win</span>
        <span style={styles.statVal}>{stats.currency}{stats.biggest_win} ({stats.biggest_win_slot || '-'})</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>Slots Played</span>
        <span style={styles.statVal}>{stats.slots_played}</span>
      </div>
    </div>
  );
}

// ─── Leaderboard Section ────────────────────────────────

function LeaderboardSection() {
  const [lb, setLb] = useState([]);

  useEffect(() => {
    getLeaderboard().then(d => setLb(d.leaderboard || [])).catch(() => {});
  }, []);

  if (!lb.length) return <div style={styles.emptyState}>No predictions yet</div>;

  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>🏆 Top Predictors</div>
      {lb.slice(0, 10).map((entry, i) => (
        <div key={entry.id} style={{ ...styles.statRow, alignItems: 'center' }}>
          <span style={{ fontSize: 12 }}>
            <span style={{ color: '#bf94ff', fontWeight: 700, marginRight: 6 }}>#{i + 1}</span>
            {entry.twitch_display_name}
          </span>
          <span style={styles.statVal}>{entry.total_points_won} pts</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Overlay Component ─────────────────────────────

const TABS = [
  { id: 'predict', label: '🎯' },
  { id: 'bets',    label: '💰' },
  { id: 'giveaway',label: '🎁' },
  { id: 'stats',   label: '📊' },
  { id: 'leaders', label: '🏆' },
];

export default function ExtensionOverlay() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('predict');
  const [points, setPoints] = useState(0);
  const [config, setConfig] = useState({});
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Load initial data
  const refreshPoints = useCallback(async () => {
    try {
      const d = await getPoints();
      setPoints(d.points || 0);
    } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [p, c] = await Promise.all([getPoints(), getConfig()]);
        setPoints(p.points || 0);
        setConfig(c.config || {});
      } catch {}
    };
    // Small delay to let Twitch auth settle
    const t = setTimeout(init, 500);
    return () => clearTimeout(t);
  }, []);

  // Show notification toast
  const showToast = useCallback((title, body) => {
    setToast({ title, body });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  // Filter tabs based on config
  const visibleTabs = TABS.filter(t => {
    if (t.id === 'predict' && config.predictions_enabled === false) return false;
    if (t.id === 'bets' && config.bets_enabled === false) return false;
    if (t.id === 'giveaway' && config.giveaway_enabled === false) return false;
    return true;
  });

  const renderContent = () => {
    switch (tab) {
      case 'predict':  return <PredictionSection points={points} onRefresh={refreshPoints} />;
      case 'bets':     return <BetsSection points={points} onRefresh={refreshPoints} />;
      case 'giveaway': return <GiveawaySection points={points} onRefresh={refreshPoints} />;
      case 'stats':    return <StatsSection />;
      case 'leaders':  return <LeaderboardSection />;
      default: return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* Notification Toast (top-left) */}
      <div style={styles.toast(!!toast)}>
        {toast && (
          <>
            <div style={styles.toastTitle}>{toast.title}</div>
            <div style={styles.toastBody}>{toast.body}</div>
          </>
        )}
      </div>

      {/* Toggle Button */}
      <button
        style={styles.toggleBtn}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={e => e.target.style.background = 'rgba(145, 70, 255, 1)'}
        onMouseLeave={e => e.target.style.background = 'rgba(145, 70, 255, 0.9)'}
      >
        {open ? '✕ Close' : '🎰 Interact'}
      </button>

      {/* Side Panel */}
      <div style={styles.sidePanel(open)}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>🎰 Interactive</h3>
          <span style={styles.pointsBadge}>💎 {points}</span>
        </div>

        <div style={styles.tabRow}>
          {visibleTabs.map(t => (
            <button
              key={t.id}
              style={styles.tab(tab === t.id)}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
