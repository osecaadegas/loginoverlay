/**
 * Bets Panel — Live Bet/Prediction System
 * - View active bets with real-time odds
 * - Place bets with channel points
 * - See results when resolved
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getBets, placeBet } from '../extApi';

export default function BetsPanel({ points, onPointsChange }) {
  const [bets, setBets] = useState([]);
  const [selectedOption, setSelectedOption] = useState({});
  const [wagerInputs, setWagerInputs] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadBets = useCallback(async () => {
    try {
      const res = await getBets();
      setBets(res.bets || []);
    } catch (err) {
      console.error('Failed to load bets:', err);
    }
  }, []);

  useEffect(() => {
    loadBets();
    const interval = setInterval(loadBets, 30000);
    return () => clearInterval(interval);
  }, [loadBets]);

  const handlePlaceBet = async (betId) => {
    const optionId = selectedOption[betId];
    const wager = parseInt(wagerInputs[betId]) || 0;

    if (!optionId || wager <= 0) {
      showToast('Select an option and enter a wager', 'error');
      return;
    }

    setSubmitting(betId);
    try {
      await placeBet(betId, optionId, wager);
      showToast(`Bet placed! ${wager} pts`);
      setSelectedOption(prev => ({ ...prev, [betId]: null }));
      setWagerInputs(prev => ({ ...prev, [betId]: '' }));
      onPointsChange();
      loadBets();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setSubmitting(null);
  };

  // Calculate option percentages for pool visualization
  const getOptionPool = (bet, optionId) => {
    if (!bet.total_pool) return 0;
    // We don't have per-option pool data in the compact response,
    // so show equal distribution as fallback
    return Math.round(100 / (bet.options?.length || 1));
  };

  return (
    <div>
      <div className="ext-section-title">💰 Active Bets</div>

      {bets.length > 0 ? (
        bets.map(bet => (
          <div key={bet.id} className="ext-card">
            <div className="ext-card-header">
              <span className="ext-card-title">{bet.title || 'Untitled Bet'}</span>
              <span className={`ext-badge ext-badge-${bet.status}`}>
                {bet.status}
              </span>
            </div>

            {bet.description && (
              <div style={{ fontSize: 11, color: 'var(--ext-muted)', marginBottom: 6 }}>
                {bet.description}
              </div>
            )}

            <div style={{ fontSize: 11, color: 'var(--ext-muted)', marginBottom: 6 }}>
              Total Pool: 💎 {(bet.total_pool || 0).toLocaleString()}
            </div>

            {/* Options */}
            <div className="ext-bet-options">
              {(bet.options || []).map(opt => {
                const isSelected = selectedOption[bet.id] === opt.id;
                const isWinner = bet.winning_option === opt.id;
                const myBet = bet.my_entry;
                const isMine = myBet?.option_id === opt.id;

                return (
                  <div
                    key={opt.id}
                    className={`ext-bet-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (bet.status === 'open' && !myBet) {
                        setSelectedOption(prev => ({ ...prev, [bet.id]: opt.id }));
                      }
                    }}
                    style={{
                      ...(isWinner ? { borderColor: 'var(--ext-success)', background: 'rgba(0,245,147,0.08)' } : {}),
                      ...(isMine && !isWinner ? { borderColor: 'var(--ext-primary)', background: 'rgba(145,70,255,0.08)' } : {}),
                    }}
                  >
                    <span className="ext-bet-option-label">
                      {opt.label}
                      {isMine && ' ✓'}
                      {isWinner && ' 🏆'}
                    </span>
                    <span className="ext-bet-option-odds">{opt.odds}x</span>
                  </div>
                );
              })}
            </div>

            {/* Already bet */}
            {bet.my_entry && (
              <div style={{
                padding: '6px 10px',
                background: 'rgba(145,70,255,0.1)',
                borderRadius: 6,
                fontSize: 12,
                textAlign: 'center',
              }}>
                ✅ You bet <strong>{bet.my_entry.points_wagered}</strong> pts on{' '}
                <strong>
                  {(bet.options || []).find(o => o.id === bet.my_entry.option_id)?.label || '?'}
                </strong>
              </div>
            )}

            {/* Place bet UI */}
            {bet.status === 'open' && !bet.my_entry && (
              <div style={{ marginTop: 6 }}>
                <div className="ext-input-row">
                  <input
                    className="ext-input"
                    type="number"
                    min="1"
                    max={points}
                    placeholder={`Wager (max ${points})`}
                    value={wagerInputs[bet.id] || ''}
                    onChange={e => setWagerInputs(prev => ({ ...prev, [bet.id]: e.target.value }))}
                  />
                  <button
                    className="ext-btn ext-btn-primary"
                    onClick={() => handlePlaceBet(bet.id)}
                    disabled={
                      submitting === bet.id ||
                      !selectedOption[bet.id] ||
                      !wagerInputs[bet.id] ||
                      parseInt(wagerInputs[bet.id]) > points
                    }
                  >
                    {submitting === bet.id ? '...' : 'Bet'}
                  </button>
                </div>
                {!selectedOption[bet.id] && (
                  <div style={{ fontSize: 10, color: 'var(--ext-muted)', textAlign: 'center' }}>
                    ☝️ Select an option above first
                  </div>
                )}
              </div>
            )}

            {bet.status === 'locked' && !bet.my_entry && (
              <div style={{ fontSize: 11, color: 'var(--ext-warning)', textAlign: 'center', marginTop: 4 }}>
                🔒 Betting is locked — awaiting results
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="ext-empty">
          <span className="ext-empty-icon">💰</span>
          <span className="ext-empty-text">No active bets right now</span>
        </div>
      )}

      {toast && (
        <div className={`ext-toast ext-toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
