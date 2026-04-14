/**
 * Predictions Panel — Bonus Hunt Interaction
 * - Predict multiplier before each bonus opens
 * - "Guess the Total Pay" — closest guess wins
 * - Live leaderboard of best predictors
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getPrediction, submitPrediction, getTotalGuess, submitTotalGuess, getLeaderboard } from '../extApi';

export default function PredictionsPanel({ points, onPointsChange }) {
  const [subTab, setSubTab] = useState('predict'); // predict | guess | leaderboard
  const [prediction, setPrediction] = useState(null);
  const [myEntry, setMyEntry] = useState(null);
  const [guess, setGuess] = useState(null);
  const [myGuess, setMyGuess] = useState(null);
  const [guessEntries, setGuessEntries] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [multiInput, setMultiInput] = useState('');
  const [wagerInput, setWagerInput] = useState('');
  const [totalInput, setTotalInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [predRes, guessRes, lbRes] = await Promise.all([
        getPrediction(),
        getTotalGuess(),
        getLeaderboard(),
      ]);
      setPrediction(predRes.prediction);
      setMyEntry(predRes.my_entry);
      setGuess(guessRes.guess);
      setMyGuess(guessRes.my_guess);
      setGuessEntries(guessRes.total_entries || 0);
      setLeaderboard(lbRes.leaderboard || []);
    } catch (err) {
      console.error('Predictions load error:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSubmitPrediction = async () => {
    if (!prediction || !multiInput) return;
    setSubmitting(true);
    try {
      await submitPrediction(prediction.id, multiInput, wagerInput || 0);
      showToast(`Prediction submitted: ${multiInput}x`);
      setMultiInput('');
      setWagerInput('');
      onPointsChange();
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setSubmitting(false);
  };

  const handleSubmitGuess = async () => {
    if (!guess || !totalInput) return;
    setSubmitting(true);
    try {
      await submitTotalGuess(guess.id, totalInput);
      showToast(`Guess submitted: €${parseFloat(totalInput).toLocaleString()}`);
      setTotalInput('');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setSubmitting(false);
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {[
          { id: 'predict', label: '🎯 Predict' },
          { id: 'guess', label: '💰 Total' },
          { id: 'leaderboard', label: '🏆 Leaders' },
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

      {/* PREDICT MULTIPLIER */}
      {subTab === 'predict' && (
        <div>
          {prediction ? (
            <div className="ext-card">
              <div className="ext-card-header">
                <span className="ext-card-title">
                  Bonus #{prediction.bonus_index + 1}
                </span>
                <span className={`ext-badge ext-badge-${prediction.status}`}>
                  {prediction.status}
                </span>
              </div>

              {prediction.slot_name && (
                <div style={{ fontSize: 12, color: 'var(--ext-muted)', marginBottom: 8 }}>
                  🎰 {prediction.slot_name}
                </div>
              )}

              <div style={{ fontSize: 11, color: 'var(--ext-muted)', marginBottom: 8 }}>
                {prediction.total_entries} prediction{prediction.total_entries !== 1 ? 's' : ''} so far
              </div>

              {myEntry ? (
                <div style={{
                  padding: '8px 10px',
                  background: 'rgba(145,70,255,0.1)',
                  borderRadius: 6,
                  fontSize: 12,
                }}>
                  ✅ Your prediction: <strong>{myEntry.predicted_multiplier}x</strong>
                  {myEntry.points_wagered > 0 && (
                    <span> (wagered {myEntry.points_wagered} pts)</span>
                  )}
                </div>
              ) : prediction.status === 'open' ? (
                <>
                  <div className="ext-input-group">
                    <label className="ext-input-label">Your multiplier prediction</label>
                    <input
                      className="ext-input"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 45.50"
                      value={multiInput}
                      onChange={e => setMultiInput(e.target.value)}
                    />
                  </div>
                  <div className="ext-input-group">
                    <label className="ext-input-label">Wager points (optional)</label>
                    <input
                      className="ext-input"
                      type="number"
                      min="0"
                      max={points}
                      placeholder={`0 – ${points}`}
                      value={wagerInput}
                      onChange={e => setWagerInput(e.target.value)}
                    />
                  </div>
                  <button
                    className="ext-btn ext-btn-primary ext-btn-full"
                    onClick={handleSubmitPrediction}
                    disabled={submitting || !multiInput}
                  >
                    {submitting ? 'Submitting...' : '🎯 Submit Prediction'}
                  </button>
                </>
              ) : (
                <div className="ext-empty">
                  <span className="ext-empty-icon">🔒</span>
                  <span className="ext-empty-text">Predictions are locked</span>
                </div>
              )}
            </div>
          ) : (
            <div className="ext-empty">
              <span className="ext-empty-icon">🎯</span>
              <span className="ext-empty-text">No active prediction right now</span>
              <span className="ext-empty-text">Wait for the next bonus to open!</span>
            </div>
          )}
        </div>
      )}

      {/* GUESS THE TOTAL */}
      {subTab === 'guess' && (
        <div>
          {guess ? (
            <div className="ext-card">
              <div className="ext-card-header">
                <span className="ext-card-title">💰 Guess the Total Pay</span>
                <span className={`ext-badge ext-badge-${guess.status}`}>
                  {guess.status}
                </span>
              </div>

              <div style={{ textAlign: 'center', margin: '8px 0' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ext-accent)' }}>
                  🏆 {guess.prize_points?.toLocaleString() || '1,000'} pts
                </div>
                <div style={{ fontSize: 11, color: 'var(--ext-muted)' }}>
                  Prize for closest guess • {guessEntries} entries
                </div>
              </div>

              {myGuess ? (
                <div style={{
                  padding: '8px 10px',
                  background: 'rgba(145,70,255,0.1)',
                  borderRadius: 6,
                  fontSize: 12,
                  textAlign: 'center',
                }}>
                  ✅ Your guess: <strong>€{parseFloat(myGuess.guessed_total).toLocaleString()}</strong>
                </div>
              ) : guess.status === 'open' ? (
                <>
                  <div className="ext-input-group">
                    <label className="ext-input-label">What will the total pay be?</label>
                    <input
                      className="ext-input"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 15000.00"
                      value={totalInput}
                      onChange={e => setTotalInput(e.target.value)}
                    />
                  </div>
                  <button
                    className="ext-btn ext-btn-success ext-btn-full"
                    onClick={handleSubmitGuess}
                    disabled={submitting || !totalInput}
                  >
                    {submitting ? 'Submitting...' : '💰 Submit Guess'}
                  </button>
                </>
              ) : (
                <div className="ext-empty">
                  <span className="ext-empty-icon">🔒</span>
                  <span className="ext-empty-text">Guessing is closed</span>
                </div>
              )}
            </div>
          ) : (
            <div className="ext-empty">
              <span className="ext-empty-icon">💰</span>
              <span className="ext-empty-text">No active guess round</span>
              <span className="ext-empty-text">Check back during a bonus hunt!</span>
            </div>
          )}
        </div>
      )}

      {/* LEADERBOARD */}
      {subTab === 'leaderboard' && (
        <div>
          <div className="ext-section-title">🏆 Top Predictors</div>
          {leaderboard.length > 0 ? (
            leaderboard.map((entry, i) => (
              <div key={i} className="ext-lb-row">
                <span className={`ext-lb-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                  {i <= 2 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                </span>
                <span className="ext-lb-name">{entry.twitch_display_name}</span>
                <div style={{ textAlign: 'right' }}>
                  <div className="ext-lb-val">💎 {entry.total_points_won.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--ext-muted)' }}>
                    {entry.wins}/{entry.total_predictions} wins
                    {entry.streak > 0 && ` • 🔥${entry.streak}`}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="ext-empty">
              <span className="ext-empty-icon">🏆</span>
              <span className="ext-empty-text">No predictions yet</span>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`ext-toast ext-toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
