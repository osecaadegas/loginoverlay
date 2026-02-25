import React, { useMemo } from 'react';

/**
 * TournamentWidget — OBS bracket display.
 * Shows phase tabs, matchup cards with slot images, player names and multipliers.
 * Fully fills the widget slot.
 */
export default function TournamentWidget({ config, theme }) {
  const c = config || {};
  const data = c.data || {};
  const phase = data.phase || 'quarterfinals';
  const players = data.players || c.players || [];
  const slots = data.slots || c.slots || [];
  const history = data.history || [];
  const matches = data.matches || [];

  /* ─── Style config ─── */
  const bgColor = c.bgColor || '#13151e';
  const cardBg = c.cardBg || '#1a1d2e';
  const cardBorder = c.cardBorder || 'rgba(255,255,255,0.08)';
  const cardRadius = c.cardRadius ?? 12;
  const cardBorderWidth = c.cardBorderWidth ?? 1;
  const nameColor = c.nameColor || '#ffffff';
  const nameSize = c.nameSize ?? 13;
  const multiColor = c.multiColor || '#facc15';
  const multiSize = c.multiSize ?? 14;
  const tabBg = c.tabBg || 'rgba(255,255,255,0.05)';
  const tabActiveBg = c.tabActiveBg || 'rgba(147,70,255,0.2)';
  const tabColor = c.tabColor || '#94a3b8';
  const tabActiveColor = c.tabActiveColor || '#ffffff';
  const tabBorder = c.tabBorder || 'rgba(147,70,255,0.4)';
  const eliminatedOpacity = c.eliminatedOpacity ?? 0.35;
  const showSlotName = c.showSlotName !== false;
  const slotNameColor = c.slotNameColor || '#ffffff';
  const slotNameSize = c.slotNameSize ?? 11;
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const borderRadius = c.borderRadius ?? 14;
  const borderWidth = c.borderWidth ?? 1;
  const borderColor = c.borderColor || 'rgba(255,255,255,0.06)';
  const gap = c.cardGap ?? 10;
  const padding = c.containerPadding ?? 12;
  const xIconColor = c.xIconColor || '#eab308';
  const xIconBg = c.xIconBg || 'rgba(0,0,0,0.7)';

  /* ─── Build all phases for tab display ─── */
  const phases = useMemo(() => {
    const result = [];
    // History phases
    for (const h of history) {
      result.push({ phase: h.phase, matches: h.matches });
    }
    // Current phase
    if (matches.length > 0) {
      result.push({ phase, matches });
    }
    return result;
  }, [history, matches, phase]);

  const phaseLabels = {
    quarterfinals: 'Quarter Finals',
    semifinals: 'Semi Finals',
    finals: 'Final',
  };

  const phaseOrder = ['quarterfinals', 'semifinals', 'finals'];

  /* ─── Calculate multiplier ─── */
  const calcMulti = (matchData, playerKey) => {
    const md = matchData?.data || {};
    const pd = md[playerKey] || {};
    const isBo3 = data.format === 'bo3';
    if (isBo3) {
      const total = (parseFloat(pd.payout1) || 0) + (parseFloat(pd.payout2) || 0) + (parseFloat(pd.payout3) || 0);
      const bet = parseFloat(pd.bet) || 0;
      return bet > 0 ? (total / bet).toFixed(2) : '0.00';
    }
    const bet = parseFloat(pd.bet) || 0;
    const payout = parseFloat(pd.payout) || 0;
    return bet > 0 ? (payout / bet).toFixed(2) : '0.00';
  };

  /* ─── Determine which phase tab to display ─── */
  const [displayPhase, setDisplayPhase] = React.useState(null);
  const activePhase = displayPhase || phase;

  const activeData = useMemo(() => {
    return phases.find(p => p.phase === activePhase) || (phases.length > 0 ? phases[phases.length - 1] : null);
  }, [phases, activePhase]);

  /* ─── Empty state ─── */
  if (!c.active || phases.length === 0) {
    return (
      <div className="tw-root tw-empty" style={{
        width: '100%', height: '100%', fontFamily,
        background: bgColor, borderRadius: `${borderRadius}px`,
        border: `${borderWidth}px solid ${borderColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#64748b', fontSize: 14,
      }}>
        <span>🏆 No active tournament</span>
      </div>
    );
  }

  const currentMatches = activeData?.matches || [];

  return (
    <div className="tw-root" style={{
      width: '100%', height: '100%', fontFamily,
      background: bgColor, borderRadius: `${borderRadius}px`,
      border: `${borderWidth}px solid ${borderColor}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ── Phase Tabs ── */}
      <div className="tw-tabs" style={{ padding: `${padding}px ${padding}px 0`, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'inline-flex', borderRadius: 8, overflow: 'hidden',
          border: `1px solid ${cardBorder}`,
        }}>
          {phaseOrder.filter(p => phases.some(ph => ph.phase === p)).map(p => (
            <button key={p}
              className="tw-tab"
              onClick={() => setDisplayPhase(p)}
              style={{
                padding: '8px 16px',
                fontSize: 12, fontWeight: 700, fontFamily,
                textTransform: 'uppercase', letterSpacing: '0.5px',
                background: activePhase === p ? tabActiveBg : tabBg,
                color: activePhase === p ? tabActiveColor : tabColor,
                border: 'none',
                borderBottom: activePhase === p ? `2px solid ${tabBorder}` : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}>
              {phaseLabels[p] || p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Matchup Cards Grid ── */}
      <div className="tw-matches" style={{
        flex: 1, padding: `${padding}px`,
        display: 'grid',
        gridTemplateColumns: currentMatches.length === 1 ? '1fr' : 'repeat(2, 1fr)',
        gap: `${gap}px`,
        alignContent: 'start',
        overflow: 'auto',
      }}>
        {currentMatches.map((match, idx) => {
          const p1Idx = match.player1;
          const p2Idx = match.player2;
          const p1Name = players[p1Idx] || `Player ${p1Idx + 1}`;
          const p2Name = players[p2Idx] || `Player ${p2Idx + 1}`;
          const p1Slot = slots[p1Idx];
          const p2Slot = slots[p2Idx];
          const p1Multi = calcMulti(match, 'player1');
          const p2Multi = calcMulti(match, 'player2');
          const p1Won = match.winner === p1Idx;
          const p2Won = match.winner === p2Idx;
          const hasWinner = match.winner !== null && match.winner !== undefined;
          const p1Eliminated = hasWinner && !p1Won;
          const p2Eliminated = hasWinner && !p2Won;

          return (
            <div key={idx} className="tw-match-card" style={{
              background: cardBg,
              border: `${cardBorderWidth}px solid ${cardBorder}`,
              borderRadius: `${cardRadius}px`,
              overflow: 'hidden',
            }}>
              {/* Player names row */}
              <div className="tw-match-names" style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
              }}>
                <div className="tw-player-name" style={{
                  padding: '6px 10px', fontSize: `${nameSize}px`, fontWeight: 700,
                  color: nameColor, textAlign: 'center', fontFamily,
                  opacity: p1Eliminated ? eliminatedOpacity : 1,
                  background: p1Won ? 'rgba(147,70,255,0.08)' : 'transparent',
                }}>
                  {p1Name}
                </div>
                <div className="tw-player-name" style={{
                  padding: '6px 10px', fontSize: `${nameSize}px`, fontWeight: 700,
                  color: nameColor, textAlign: 'center', fontFamily,
                  opacity: p2Eliminated ? eliminatedOpacity : 1,
                  background: p2Won ? 'rgba(147,70,255,0.08)' : 'transparent',
                }}>
                  {p2Name}
                </div>
              </div>

              {/* Slot images row */}
              <div className="tw-match-slots" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {/* Player 1 slot */}
                <div className="tw-slot-cell" style={{ position: 'relative', aspectRatio: '16/10' }}>
                  {p1Slot?.image ? (
                    <img src={p1Slot.image} alt={p1Slot.name || ''} style={{
                      width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                      opacity: p1Eliminated ? eliminatedOpacity : 1,
                    }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.3)' }} />
                  )}
                  {/* Slot name overlay */}
                  {showSlotName && p1Slot?.name && (
                    <div className="tw-slot-name" style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: '2px 6px', fontSize: `${slotNameSize}px`,
                      color: slotNameColor, fontWeight: 700, fontFamily,
                      textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                      textTransform: 'uppercase', letterSpacing: '0.3px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {p1Slot.name}
                    </div>
                  )}
                  {/* X overlay for eliminated */}
                  {p1Eliminated && (
                    <div className="tw-eliminated" style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: xIconBg, border: `2px solid ${xIconColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, color: xIconColor, fontWeight: 700,
                      }}>✕</div>
                    </div>
                  )}
                </div>

                {/* Player 2 slot */}
                <div className="tw-slot-cell" style={{ position: 'relative', aspectRatio: '16/10' }}>
                  {p2Slot?.image ? (
                    <img src={p2Slot.image} alt={p2Slot.name || ''} style={{
                      width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                      opacity: p2Eliminated ? eliminatedOpacity : 1,
                    }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.3)' }} />
                  )}
                  {showSlotName && p2Slot?.name && (
                    <div className="tw-slot-name" style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: '2px 6px', fontSize: `${slotNameSize}px`,
                      color: slotNameColor, fontWeight: 700, fontFamily,
                      textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                      textTransform: 'uppercase', letterSpacing: '0.3px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {p2Slot.name}
                    </div>
                  )}
                  {p2Eliminated && (
                    <div className="tw-eliminated" style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: xIconBg, border: `2px solid ${xIconColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, color: xIconColor, fontWeight: 700,
                      }}>✕</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Multiplier row */}
              <div className="tw-match-multis" style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
              }}>
                <div className="tw-multi" style={{
                  padding: '5px 10px', textAlign: 'center',
                  fontSize: `${multiSize}px`, fontWeight: 700,
                  color: parseFloat(p1Multi) > 0 ? multiColor : '#64748b',
                  fontFamily, opacity: p1Eliminated ? eliminatedOpacity : 1,
                }}>
                  {p1Multi}x
                </div>
                <div className="tw-multi" style={{
                  padding: '5px 10px', textAlign: 'center',
                  fontSize: `${multiSize}px`, fontWeight: 700,
                  color: parseFloat(p2Multi) > 0 ? multiColor : '#64748b',
                  fontFamily, opacity: p2Eliminated ? eliminatedOpacity : 1,
                }}>
                  {p2Multi}x
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
