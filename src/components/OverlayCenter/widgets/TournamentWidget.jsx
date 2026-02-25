import React, { useState, useMemo } from 'react';

/**
 * TournamentWidget — OBS bracket display.
 * Two-column player cards with a swinging ⚔️ sword between them.
 * Shows phase tabs, matchup cards with slot images, player names and multipliers.
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
  const bgColor = c.bgColor || 'transparent';
  const cardBg = c.cardBg || '#1a1d2e';
  const cardBorder = c.cardBorder || 'rgba(255,255,255,0.08)';
  const cardRadius = c.cardRadius ?? 12;
  const cardBorderWidth = c.cardBorderWidth ?? 1;
  const nameColor = c.nameColor || '#ffffff';
  const nameSize = c.nameSize ?? 13;
  const multiColor = c.multiColor || '#facc15';
  const multiSize = c.multiSize ?? 14;
  const tabBg = c.tabBg || 'rgba(255,255,255,0.06)';
  const tabActiveBg = c.tabActiveBg || 'rgba(255,255,255,0.15)';
  const tabColor = c.tabColor || '#94a3b8';
  const tabActiveColor = c.tabActiveColor || '#ffffff';
  const tabBorder = c.tabBorder || 'rgba(255,255,255,0.12)';
  const eliminatedOpacity = c.eliminatedOpacity ?? 0.35;
  const showSlotName = c.showSlotName !== false;
  const slotNameColor = c.slotNameColor || '#ffffff';
  const slotNameSize = c.slotNameSize ?? 11;
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const borderRadius = c.borderRadius ?? 14;
  const borderWidth = c.borderWidth ?? 0;
  const borderColor = c.borderColor || 'transparent';
  const gap = c.cardGap ?? 12;
  const padding = c.containerPadding ?? 14;
  const swordColor = c.swordColor || '#eab308';
  const swordBg = c.swordBg || 'rgba(0,0,0,0.85)';
  const swordSize = c.swordSize ?? 22;
  const xIconColor = c.xIconColor || '#eab308';
  const xIconBg = c.xIconBg || 'rgba(0,0,0,0.7)';

  /* ─── Build all phases for tab display ─── */
  const phases = useMemo(() => {
    const result = [];
    for (const h of history) {
      result.push({ phase: h.phase, matches: h.matches });
    }
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
  const [displayPhase, setDisplayPhase] = useState(null);
  const activePhase = displayPhase || phase;

  const activeData = useMemo(() => {
    return phases.find(p => p.phase === activePhase) || (phases.length > 0 ? phases[phases.length - 1] : null);
  }, [phases, activePhase]);

  /* ─── Empty state ─── */
  if (phases.length === 0) {
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

  /* ─── Player column renderer ─── */
  const renderPlayer = (pIdx, matchData, playerKey, isEliminated, isWinner) => {
    const name = players[pIdx] || `Player ${pIdx + 1}`;
    const slot = slots[pIdx];
    const multi = calcMulti(matchData, playerKey);
    const op = isEliminated ? eliminatedOpacity : 1;

    return (
      <div className="tw-player-col" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: op, flex: 1, minWidth: 0,
      }}>
        {/* Name */}
        <div className="tw-player-name" style={{
          padding: '6px 8px 4px', fontSize: `${nameSize}px`, fontWeight: 700,
          color: nameColor, fontFamily, textAlign: 'center',
          width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {name}
        </div>

        {/* Slot image */}
        <div className="tw-slot-cell" style={{
          position: 'relative', width: '100%', aspectRatio: '1 / 1',
        }}>
          {slot?.image ? (
            <img src={slot.image} alt={slot.name || ''} style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              borderRadius: 6,
            }} />
          ) : (
            <div style={{
              width: '100%', height: '100%', background: 'rgba(0,0,0,0.3)',
              borderRadius: 6,
            }} />
          )}
          {/* Slot name overlay */}
          {showSlotName && slot?.name && (
            <div className="tw-slot-name" style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '3px 6px', fontSize: `${slotNameSize}px`,
              color: slotNameColor, fontWeight: 700, fontFamily,
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
              textTransform: 'uppercase', letterSpacing: '0.3px',
              textAlign: 'center', borderRadius: '0 0 6px 6px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {slot.name}
            </div>
          )}
          {/* X overlay for eliminated */}
          {isEliminated && (
            <div className="tw-eliminated-icon" style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: xIconBg, border: `2px solid ${xIconColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: xIconColor, fontWeight: 700,
              }}>✕</div>
            </div>
          )}
        </div>

        {/* Multiplier */}
        <div className="tw-multi" style={{
          padding: '4px 8px', textAlign: 'center',
          fontSize: `${multiSize}px`, fontWeight: 700,
          color: parseFloat(multi) > 0 ? multiColor : '#64748b',
          fontFamily,
        }}>
          {multi}x
        </div>
      </div>
    );
  };

  return (
    <div className="tw-root" style={{
      width: '100%', height: '100%', fontFamily,
      background: bgColor, borderRadius: `${borderRadius}px`,
      border: `${borderWidth}px solid ${borderColor}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* Injected keyframes for sword swing animation */}
      <style>{`
        @keyframes tw-sword-swing {
          0%, 100% { transform: translate(-50%, -50%) rotate(-20deg); }
          50% { transform: translate(-50%, -50%) rotate(20deg); }
        }
      `}</style>

      {/* ── Phase Tabs (pill / segmented control) ── */}
      <div className="tw-tabs" style={{
        padding: `${padding}px ${padding}px 0`,
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          display: 'inline-flex', borderRadius: 8, overflow: 'hidden',
          background: tabBg, border: `1px solid ${tabBorder}`,
        }}>
          {phaseOrder.filter(p => phases.some(ph => ph.phase === p)).map(p => {
            const isActive = activePhase === p;
            return (
              <button key={p}
                className="tw-tab"
                onClick={() => setDisplayPhase(p)}
                style={{
                  padding: '8px 20px',
                  fontSize: 12, fontWeight: 700, fontFamily,
                  textTransform: 'uppercase', letterSpacing: '0.8px',
                  background: isActive ? tabActiveBg : 'transparent',
                  color: isActive ? tabActiveColor : tabColor,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  borderRadius: isActive ? 6 : 0,
                }}>
                {phaseLabels[p] || p}
              </button>
            );
          })}
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
              overflow: 'hidden', position: 'relative',
              padding: '4px 8px',
            }}>
              {/* Two-column player layout */}
              <div className="tw-match-inner" style={{
                display: 'flex', gap: 8,
              }}>
                {/* Player 1 */}
                {renderPlayer(p1Idx, match, 'player1', p1Eliminated, p1Won)}

                {/* Player 2 */}
                {renderPlayer(p2Idx, match, 'player2', p2Eliminated, p2Won)}
              </div>

              {/* ⚔️ Sword icon — centered between the two players */}
              <div className="tw-sword-icon" style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: swordSize + 20, height: swordSize + 20,
                borderRadius: '50%',
                background: swordBg,
                border: `2px solid ${swordColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 5,
                pointerEvents: 'none',
                ...(hasWinner
                  ? { transform: 'translate(-50%, -50%)' }
                  : { animation: 'tw-sword-swing 1.2s ease-in-out infinite' }
                ),
              }}>
                <span style={{ fontSize: swordSize, lineHeight: 1 }}>
                  {hasWinner ? '✕' : '⚔️'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
