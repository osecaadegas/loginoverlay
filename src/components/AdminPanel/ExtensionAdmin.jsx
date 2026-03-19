/**
 * Extension Admin — Broadcaster control panel for managing Twitch Extension features
 * 
 * Sections: Predictions, Bets, Giveaways, Suggestions, Config
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function ExtensionAdmin() {
  const [section, setSection] = useState('predictions');
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [userId, setUserId] = useState(null);

  // Data state
  const [predictions, setPredictions] = useState([]);
  const [bets, setBets] = useState([]);
  const [giveaways, setGiveaways] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  // Form state
  const [predForm, setPredForm] = useState({ roundId: '', bonusIndex: 1, slotName: '' });
  const [betForm, setBetForm] = useState({ title: '', options: ['', ''] });
  const [giveawayForm, setGiveawayForm] = useState({
    prizeName: '', ticketCost: 0, maxTickets: 1, maxWinners: 1,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
        loadAll(data.user.id);
      }
    });
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const apiCall = async (action, body = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/twitch-ext-admin?action=${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'API error');
    return json;
  };

  const loadAll = async (uid) => {
    const id = uid || userId;
    if (!id) return;

    const [predRes, betRes, gaRes, sugRes, sessRes, lbRes, cfgRes] = await Promise.all([
      supabase.from('ext_bh_predictions').select('*').eq('broadcaster_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('ext_live_bets').select('*').eq('broadcaster_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('ext_giveaways').select('*').eq('broadcaster_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('ext_slot_suggestions').select('*').eq('broadcaster_id', id).order('votes', { ascending: false }).limit(30),
      supabase.from('ext_stream_sessions').select('*').eq('broadcaster_id', id).order('started_at', { ascending: false }).limit(10),
      supabase.from('ext_predictor_leaderboard').select('*').eq('broadcaster_id', id).order('total_wins', { ascending: false }).limit(20),
      supabase.from('ext_config').select('*').eq('broadcaster_id', id).single(),
    ]);

    setPredictions(predRes.data || []);
    setBets(betRes.data || []);
    setGiveaways(gaRes.data || []);
    setSuggestions(sugRes.data || []);
    setSessions(sessRes.data || []);
    setLeaderboard(lbRes.data || []);
    setConfig(cfgRes.data || {});
  };

  const handleAction = async (action, body, successMsg) => {
    setLoading(true);
    try {
      await apiCall(action, body);
      showToast(successMsg);
      loadAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setLoading(false);
  };

  const sectionBtns = [
    { id: 'predictions', label: '🎯 Predictions' },
    { id: 'bets', label: '💰 Bets' },
    { id: 'giveaways', label: '🎁 Giveaways' },
    { id: 'suggestions', label: '🎰 Slot Picks' },
    { id: 'sessions', label: '📺 Sessions' },
    { id: 'config', label: '⚙️ Config' },
  ];

  const badgeStyle = (status) => {
    const colors = {
      open: '#22c55e',
      locked: '#f59e0b',
      resolved: '#6366f1',
      closed: '#64748b',
      pending: '#f59e0b',
      approved: '#22c55e',
      rejected: '#ef4444',
      played: '#3b82f6',
    };
    return {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      background: `${colors[status] || '#64748b'}22`,
      color: colors[status] || '#64748b',
    };
  };

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20, right: 20,
          padding: '10px 18px',
          borderRadius: 8,
          zIndex: 9999,
          fontWeight: 600,
          fontSize: 13,
          background: toast.type === 'error' ? '#ef4444' : '#22c55e',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Section tabs */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap',
      }}>
        {sectionBtns.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              background: section === s.id ? '#9146FF' : 'rgba(255,255,255,0.06)',
              color: section === s.id ? '#fff' : '#94a3b8',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ═══ PREDICTIONS ═══ */}
      {section === 'predictions' && (
        <div>
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>🎯 Bonus Hunt Predictions</h3>

          {/* Create form */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 8,
            padding: 14,
            marginBottom: 16,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <h4 style={{ marginBottom: 8, fontSize: 13 }}>Create Prediction</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                placeholder="Round ID (e.g. hunt_1)"
                value={predForm.roundId}
                onChange={e => setPredForm(p => ({ ...p, roundId: e.target.value }))}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13, minWidth: 120 }}
              />
              <input
                type="number"
                placeholder="Bonus #"
                value={predForm.bonusIndex}
                onChange={e => setPredForm(p => ({ ...p, bonusIndex: Number(e.target.value) }))}
                style={{ width: 80, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
              />
              <input
                placeholder="Slot name"
                value={predForm.slotName}
                onChange={e => setPredForm(p => ({ ...p, slotName: e.target.value }))}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13, minWidth: 120 }}
              />
              <button
                disabled={loading || !predForm.roundId}
                onClick={() => handleAction('create_prediction', {
                  round_id: predForm.roundId,
                  bonus_index: predForm.bonusIndex,
                  slot_name: predForm.slotName,
                }, 'Prediction created!')}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#9146FF', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >
                Create
              </button>
            </div>
          </div>

          {/* List */}
          {predictions.map(p => (
            <div key={p.id} style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 8,
              border: '1px solid rgba(255,255,255,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {p.slot_name || `Bonus #${p.bonus_index}`}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {p.round_id} · #{p.bonus_index}
                  {p.actual_multiplier && ` · Result: ${p.actual_multiplier}x`}
                </div>
              </div>
              <span style={badgeStyle(p.status)}>{p.status}</span>
              {p.status === 'open' && (
                <button
                  onClick={() => handleAction('lock_prediction', { prediction_id: p.id }, 'Locked!')}
                  disabled={loading}
                  style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: '#f59e0b', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}
                >
                  Lock
                </button>
              )}
              {p.status === 'locked' && (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Actual X"
                    style={{ width: 70, padding: '4px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 11 }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleAction('resolve_prediction', {
                          prediction_id: p.id,
                          actual_multiplier: Number(e.target.value),
                        }, 'Resolved!');
                      }
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ BETS ═══ */}
      {section === 'bets' && (
        <div>
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>💰 Live Bets</h3>

          {/* Create form */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 8,
            padding: 14,
            marginBottom: 16,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <h4 style={{ marginBottom: 8, fontSize: 13 }}>Create Bet</h4>
            <input
              placeholder="Bet title (e.g. Will this bonus pay 100x?)"
              value={betForm.title}
              onChange={e => setBetForm(p => ({ ...p, title: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13, marginBottom: 8 }}
            />
            {betForm.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <input
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={e => {
                    const opts = [...betForm.options];
                    opts[i] = e.target.value;
                    setBetForm(p => ({ ...p, options: opts }));
                  }}
                  style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 12 }}
                />
                {betForm.options.length > 2 && (
                  <button
                    onClick={() => setBetForm(p => ({ ...p, options: p.options.filter((_, j) => j !== i) }))}
                    style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 11 }}
                  >✕</button>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => setBetForm(p => ({ ...p, options: [...p.options, ''] }))}
                style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}
              >
                + Add Option
              </button>
              <button
                disabled={loading || !betForm.title || betForm.options.some(o => !o)}
                onClick={() => handleAction('create_bet', {
                  title: betForm.title,
                  options: betForm.options,
                }, 'Bet created!')}
                style={{ padding: '4px 14px', borderRadius: 6, border: 'none', background: '#9146FF', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
              >
                Create Bet
              </button>
            </div>
          </div>

          {/* List */}
          {bets.map(b => (
            <div key={b.id} style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 8,
              border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{b.title}</span>
                <span style={badgeStyle(b.status)}>{b.status}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                {(b.options || []).map((o, i) => (
                  <span key={i} style={{
                    display: 'inline-block',
                    padding: '2px 6px',
                    marginRight: 4,
                    borderRadius: 4,
                    background: b.winning_option === i ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                    color: b.winning_option === i ? '#22c55e' : '#94a3b8',
                    fontWeight: b.winning_option === i ? 700 : 400,
                  }}>
                    {typeof o === 'string' ? o : o.label}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {b.status === 'open' && (
                  <button onClick={() => handleAction('lock_bet', { bet_id: b.id }, 'Bet locked!')} disabled={loading}
                    style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: '#f59e0b', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}>
                    Lock
                  </button>
                )}
                {b.status === 'locked' && (b.options || []).map((o, i) => (
                  <button key={i}
                    onClick={() => handleAction('resolve_bet', { bet_id: b.id, winning_option: i }, `Option ${i + 1} wins!`)}
                    disabled={loading}
                    style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: '#22c55e', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}>
                    {typeof o === 'string' ? o : o.label} wins
                  </button>
                ))}
                {(b.status === 'open' || b.status === 'locked') && (
                  <button onClick={() => handleAction('cancel_bet', { bet_id: b.id }, 'Bet cancelled & refunded!')} disabled={loading}
                    style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ GIVEAWAYS ═══ */}
      {section === 'giveaways' && (
        <div>
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>🎁 Extension Giveaways</h3>

          {/* Create form */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 8,
            padding: 14,
            marginBottom: 16,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <h4 style={{ marginBottom: 8, fontSize: 13 }}>Create Giveaway</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                placeholder="Prize name"
                value={giveawayForm.prizeName}
                onChange={e => setGiveawayForm(p => ({ ...p, prizeName: e.target.value }))}
                style={{ flex: 2, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13, minWidth: 120 }}
              />
              <input
                type="number"
                placeholder="Ticket cost"
                value={giveawayForm.ticketCost}
                onChange={e => setGiveawayForm(p => ({ ...p, ticketCost: Number(e.target.value) }))}
                style={{ width: 90, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
              />
              <input
                type="number"
                placeholder="Max tickets"
                value={giveawayForm.maxTickets}
                onChange={e => setGiveawayForm(p => ({ ...p, maxTickets: Number(e.target.value) }))}
                style={{ width: 90, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
              />
              <input
                type="number"
                placeholder="Winners"
                value={giveawayForm.maxWinners}
                onChange={e => setGiveawayForm(p => ({ ...p, maxWinners: Number(e.target.value) }))}
                style={{ width: 80, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
              />
              <button
                disabled={loading || !giveawayForm.prizeName}
                onClick={() => handleAction('create_giveaway', {
                  prize_name: giveawayForm.prizeName,
                  ticket_cost: giveawayForm.ticketCost,
                  max_tickets_per_user: giveawayForm.maxTickets,
                  max_winners: giveawayForm.maxWinners,
                }, 'Giveaway created!')}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#9146FF', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >
                Create
              </button>
            </div>
          </div>

          {/* List */}
          {giveaways.map(g => (
            <div key={g.id} style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 8,
              border: '1px solid rgba(255,255,255,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>🎁 {g.prize_name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Cost: {g.ticket_cost} pts · Max: {g.max_tickets_per_user} tickets · Winners: {g.max_winners}
                </div>
              </div>
              <span style={badgeStyle(g.status)}>{g.status}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {g.status === 'open' && (
                  <button onClick={() => handleAction('close_giveaway', { giveaway_id: g.id }, 'Giveaway closed!')} disabled={loading}
                    style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: '#f59e0b', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}>
                    Close
                  </button>
                )}
                {g.status === 'closed' && (
                  <button onClick={() => handleAction('draw_winners', { giveaway_id: g.id }, 'Winners drawn!')} disabled={loading}
                    style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: '#22c55e', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}>
                    🎲 Draw
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ SLOT SUGGESTIONS ═══ */}
      {section === 'suggestions' && (
        <div>
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>🎰 Slot Suggestions</h3>
          {suggestions.length === 0 && (
            <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>
              No suggestions yet. Viewers can submit via the extension.
            </div>
          )}
          {suggestions.map(s => (
            <div key={s.id} style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 8,
              padding: '8px 12px',
              marginBottom: 6,
              border: '1px solid rgba(255,255,255,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              {s.image_url && (
                <img src={s.image_url} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.slot_name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {s.provider || ''} · 👍 {s.votes} votes · by {s.suggested_by_name}
                </div>
              </div>
              <span style={badgeStyle(s.status)}>{s.status}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {s.status === 'pending' && (
                  <>
                    <button onClick={() => handleAction('approve_suggestion', { suggestion_id: s.id }, 'Approved!')} disabled={loading}
                      style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: '#22c55e', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}>
                      ✓
                    </button>
                    <button onClick={() => handleAction('reject_suggestion', { suggestion_id: s.id }, 'Rejected')} disabled={loading}
                      style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}>
                      ✕
                    </button>
                  </>
                )}
                {s.status === 'approved' && (
                  <button onClick={() => handleAction('mark_played', { suggestion_id: s.id }, 'Marked as played!')} disabled={loading}
                    style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}>
                    ▶ Played
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ SESSIONS ═══ */}
      {section === 'sessions' && (
        <div>
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>📺 Stream Sessions</h3>

          <button
            onClick={() => handleAction('start_session', { currency: '€' }, 'Session started!')}
            disabled={loading}
            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 13, marginBottom: 12 }}
          >
            ▶ Start New Session
          </button>

          {sessions.map(s => (
            <div key={s.id} style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 8,
              border: '1px solid rgba(255,255,255,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {new Date(s.started_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {s.slots_played} slots · Wagered: {s.total_wagered} · Won: {s.total_won}
                  {s.biggest_win > 0 && ` · Best: ${s.biggest_win}`}
                </div>
              </div>
              <span style={badgeStyle(s.status)}>{s.status}</span>
              {s.status === 'live' && (
                <button
                  onClick={() => handleAction('end_session', { session_id: s.id }, 'Session ended!')}
                  disabled={loading}
                  style={{ padding: '3px 10px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}
                >
                  ■ End
                </button>
              )}
            </div>
          ))}

          {/* Leaderboard preview */}
          <h3 style={{ marginTop: 20, marginBottom: 8, fontSize: 14 }}>🏆 Predictor Leaderboard</h3>
          {leaderboard.slice(0, 10).map((l, i) => (
            <div key={l.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 8px',
              fontSize: 12,
            }}>
              <span style={{ width: 24, fontWeight: 800, color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#64748b' }}>
                #{i + 1}
              </span>
              <span style={{ flex: 1 }}>{l.twitch_display_name}</span>
              <span style={{ color: '#9146FF', fontWeight: 700 }}>{l.total_wins}W</span>
              <span style={{ color: '#64748b', fontSize: 11 }}>
                {l.avg_accuracy ? `${(l.avg_accuracy * 100).toFixed(0)}% acc` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ═══ CONFIG ═══ */}
      {section === 'config' && (
        <div>
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>⚙️ Extension Configuration</h3>

          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 8,
            padding: 16,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {/* Feature toggles */}
            <h4 style={{ marginBottom: 8, fontSize: 13 }}>Feature Toggles</h4>
            {[
              { key: 'predictions_enabled', label: '🎯 Predictions' },
              { key: 'slot_vote_enabled', label: '🎰 Slot Voting' },
              { key: 'bets_enabled', label: '💰 Bets' },
              { key: 'giveaway_enabled', label: '🎁 Giveaways' },
              { key: 'games_enabled', label: '🎮 Games' },
            ].map(toggle => (
              <label key={toggle.key} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 0', cursor: 'pointer', fontSize: 13,
              }}>
                <input
                  type="checkbox"
                  checked={config[toggle.key] !== false}
                  onChange={e => setConfig(c => ({ ...c, [toggle.key]: e.target.checked }))}
                />
                {toggle.label}
              </label>
            ))}

            {/* Point values */}
            <h4 style={{ marginTop: 12, marginBottom: 8, fontSize: 13 }}>Point Values</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { key: 'points_per_watch_minute', label: 'Points/min' },
                { key: 'starting_points', label: 'Starting pts' },
                { key: 'slot_lock_cost', label: 'Slot lock cost' },
                { key: 'wheel_cost', label: 'Wheel spin cost' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: '#64748b' }}>{f.label}</label>
                  <input
                    type="number"
                    value={config[f.key] || 0}
                    onChange={e => setConfig(c => ({ ...c, [f.key]: Number(e.target.value) }))}
                    style={{ display: 'block', width: 100, padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 12 }}
                  />
                </div>
              ))}
            </div>

            {/* Theme */}
            <h4 style={{ marginTop: 12, marginBottom: 8, fontSize: 13 }}>Theme Colors</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { key: 'theme_primary', label: 'Primary', def: '#9146FF' },
                { key: 'theme_bg', label: 'Background', def: '#0e0e10' },
                { key: 'theme_card', label: 'Card', def: '#18181b' },
                { key: 'theme_text', label: 'Text', def: '#efeff1' },
                { key: 'theme_accent', label: 'Accent', def: '#bf94ff' },
              ].map(c => (
                <div key={c.key}>
                  <label style={{ fontSize: 11, color: '#64748b' }}>{c.label}</label>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={config[c.key] || c.def}
                      onChange={e => setConfig(cfg => ({ ...cfg, [c.key]: e.target.value }))}
                      style={{ width: 28, height: 28, border: 'none', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 10, color: '#64748b' }}>{config[c.key] || c.def}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleAction('update_config', config, 'Config saved!')}
              disabled={loading}
              style={{ marginTop: 16, padding: '8px 20px', borderRadius: 6, border: 'none', background: '#9146FF', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
            >
              💾 Save Configuration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
