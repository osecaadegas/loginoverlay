/**
 * Giveaway Panel — Extension Giveaway System
 * - Enter giveaways (no chat spam)
 * - See ticket count per viewer
 * - Winner announcement
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getGiveaways, enterGiveaway } from '../extApi';

export default function GiveawayPanel({ points, onPointsChange }) {
  const [giveaways, setGiveaways] = useState([]);
  const [submitting, setSubmitting] = useState(null);
  const [ticketInputs, setTicketInputs] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadGiveaways = useCallback(async () => {
    try {
      const res = await getGiveaways();
      setGiveaways(res.giveaways || []);
    } catch (err) {
      console.error('Failed to load giveaways:', err);
    }
  }, []);

  useEffect(() => {
    loadGiveaways();
    const interval = setInterval(loadGiveaways, 8000);
    return () => clearInterval(interval);
  }, [loadGiveaways]);

  const handleEnter = async (gaId, ticketCost, maxTickets) => {
    const tickets = parseInt(ticketInputs[gaId]) || 1;
    const totalCost = tickets * ticketCost;

    if (ticketCost > 0 && points < totalCost) {
      showToast('Not enough points!', 'error');
      return;
    }

    setSubmitting(gaId);
    try {
      const res = await enterGiveaway(gaId, tickets);
      showToast(`Entered with ${res.tickets} ticket${res.tickets > 1 ? 's' : ''}!`);
      onPointsChange();
      loadGiveaways();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setSubmitting(null);
  };

  const getTimeRemaining = (endsAt) => {
    if (!endsAt) return null;
    const diff = new Date(endsAt) - Date.now();
    if (diff <= 0) return 'Ended';

    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m remaining`;
    return `${mins}m remaining`;
  };

  return (
    <div>
      <div className="ext-section-title">🎁 Giveaways</div>

      {giveaways.length > 0 ? (
        giveaways.map(ga => (
          <div key={ga.id} className="ext-card">
            <div className="ext-card-header">
              <span className="ext-card-title">{ga.title}</span>
              <span className={`ext-badge ext-badge-${ga.status}`}>
                {ga.status}
              </span>
            </div>

            {/* Prize */}
            {ga.prize && (
              <div className="ext-ga-prize">🏆 {ga.prize}</div>
            )}

            {ga.description && (
              <div style={{ fontSize: 11, color: 'var(--ext-muted)', textAlign: 'center', marginBottom: 6 }}>
                {ga.description}
              </div>
            )}

            {ga.image_url && (
              <img
                src={ga.image_url}
                alt=""
                style={{
                  width: '100%',
                  borderRadius: 6,
                  marginBottom: 8,
                  maxHeight: 120,
                  objectFit: 'cover',
                }}
              />
            )}

            {/* Entries info */}
            <div className="ext-ga-entries">
              <span>👥 {ga.total_entries} entries</span>
              {ga.ticket_cost > 0 && (
                <span>• 💎 {ga.ticket_cost} per ticket</span>
              )}
            </div>

            {/* Timer */}
            {ga.ends_at && (
              <div className="ext-ga-timer">
                ⏰ {getTimeRemaining(ga.ends_at)}
              </div>
            )}

            {/* Already entered */}
            {ga.my_tickets > 0 && ga.status === 'open' && (
              <div style={{
                padding: '6px 10px',
                background: 'rgba(0,245,147,0.1)',
                borderRadius: 6,
                fontSize: 12,
                textAlign: 'center',
                margin: '6px 0',
              }}>
                ✅ You have {ga.my_tickets} ticket{ga.my_tickets > 1 ? 's' : ''}
              </div>
            )}

            {/* Enter button */}
            {ga.status === 'open' && ga.my_tickets === 0 && (
              <div style={{ marginTop: 6 }}>
                {ga.max_tickets_per_user > 1 && (
                  <div className="ext-input-group">
                    <label className="ext-input-label">
                      Tickets (max {ga.max_tickets_per_user})
                    </label>
                    <input
                      className="ext-input"
                      type="number"
                      min="1"
                      max={ga.max_tickets_per_user}
                      value={ticketInputs[ga.id] || '1'}
                      onChange={e => setTicketInputs(prev => ({
                        ...prev,
                        [ga.id]: e.target.value,
                      }))}
                    />
                  </div>
                )}
                <button
                  className="ext-btn ext-btn-success ext-btn-full"
                  onClick={() => handleEnter(ga.id, ga.ticket_cost, ga.max_tickets_per_user)}
                  disabled={submitting === ga.id}
                >
                  {submitting === ga.id ? 'Entering...' : (
                    ga.ticket_cost > 0
                      ? `🎟️ Enter (${ga.ticket_cost * (parseInt(ticketInputs[ga.id]) || 1)} pts)`
                      : '🎟️ Enter Free'
                  )}
                </button>
              </div>
            )}

            {/* Winners */}
            {ga.status === 'completed' && ga.winners?.length > 0 && (
              <div style={{
                marginTop: 8,
                padding: 10,
                background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(145,70,255,0.1))',
                borderRadius: 6,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  🎉 Winner{ga.winners.length > 1 ? 's' : ''}!
                </div>
                {ga.winners.map((w, i) => (
                  <div key={i} style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--ext-accent)',
                  }}>
                    🏆 {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="ext-empty">
          <span className="ext-empty-icon">🎁</span>
          <span className="ext-empty-text">No giveaways right now</span>
        </div>
      )}

      {toast && (
        <div className={`ext-toast ext-toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
