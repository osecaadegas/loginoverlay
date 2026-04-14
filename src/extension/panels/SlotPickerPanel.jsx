/**
 * Slot Picker Panel — Community Slot Voting
 * - Submit slot suggestions
 * - Vote on suggestions
 * - Lock a slot with channel points
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getSuggestions, submitSuggestion, voteSuggestion, lockSuggestion } from '../extApi';

export default function SlotPickerPanel({ points, onPointsChange, config }) {
  const [suggestions, setSuggestions] = useState([]);
  const [slotInput, setSlotInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [sessionId] = useState('default');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSuggestions = useCallback(async () => {
    try {
      const res = await getSuggestions(sessionId);
      setSuggestions(res.suggestions || []);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSuggestions();
    const interval = setInterval(loadSuggestions, 30000);
    return () => clearInterval(interval);
  }, [loadSuggestions]);

  const handleSubmit = async () => {
    if (!slotInput.trim()) return;
    setSubmitting(true);
    try {
      await submitSuggestion(slotInput.trim(), sessionId);
      showToast(`Suggested: ${slotInput.trim()}`);
      setSlotInput('');
      loadSuggestions();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setSubmitting(false);
  };

  const handleVote = async (id) => {
    try {
      await voteSuggestion(id);
      showToast('Vote cast!');
      loadSuggestions();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleLock = async (id) => {
    const cost = config?.slot_lock_cost || 500;
    if (points < cost) {
      showToast(`Need ${cost} points to lock`, 'error');
      return;
    }
    try {
      await lockSuggestion(id);
      showToast(`Slot locked! (-${cost} pts)`);
      onPointsChange();
      loadSuggestions();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const lockCost = config?.slot_lock_cost || 500;

  return (
    <div>
      {/* Submit suggestion */}
      <div className="ext-card">
        <div className="ext-card-title" style={{ marginBottom: 6 }}>🎰 Suggest a Slot</div>
        <div className="ext-input-row">
          <input
            className="ext-input"
            placeholder="e.g. Book of Dead"
            value={slotInput}
            onChange={e => setSlotInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <button
            className="ext-btn ext-btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !slotInput.trim()}
          >
            {submitting ? '...' : '➕'}
          </button>
        </div>
      </div>

      {/* Suggestion list */}
      <div className="ext-section-title">
        📋 Suggestions ({suggestions.length})
      </div>

      {suggestions.length > 0 ? (
        suggestions.map(s => (
          <div key={s.id} className="ext-slot-card">
            {s.slot_image ? (
              <img className="ext-slot-img" src={s.slot_image} alt="" />
            ) : (
              <div className="ext-slot-img" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: 'var(--ext-muted)',
              }}>🎰</div>
            )}

            <div className="ext-slot-info">
              <div className="ext-slot-name">{s.slot_name}</div>
              <div className="ext-slot-provider">
                {s.slot_provider || 'Unknown'}
                {s.locked_by_user && (
                  <span style={{ color: 'var(--ext-success)', marginLeft: 4 }}>
                    🔒 {s.locked_by_user}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ext-muted)' }}>
                by {s.twitch_display_name}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
              <div className="ext-slot-votes">
                ▲ {s.votes}
              </div>
              <button
                className="ext-btn ext-btn-ghost ext-btn-sm"
                onClick={() => handleVote(s.id)}
                title="Vote"
              >
                👍
              </button>
              {!s.locked_by_user && (
                <button
                  className="ext-btn ext-btn-sm ext-btn-primary"
                  onClick={() => handleLock(s.id)}
                  title={`Lock for ${lockCost} pts`}
                  disabled={points < lockCost}
                  style={{ fontSize: 9 }}
                >
                  🔒 {lockCost}
                </button>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="ext-empty">
          <span className="ext-empty-icon">🎰</span>
          <span className="ext-empty-text">No suggestions yet — be the first!</span>
        </div>
      )}

      {toast && (
        <div className={`ext-toast ext-toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
