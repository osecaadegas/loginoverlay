import React, { useState, useMemo } from 'react';

/**
 * TournamentWidget — OBS bracket display.
 * Three layout modes:
 *   grid      → 2-column card grid (classic)
 *   showcase  → single match fills the widget with large images
 *   vertical  → matches stacked top-to-bottom, horizontal rows
 */
export default function TournamentWidget({ config, theme }) {
  const c = config || {};
  const data = c.data || {};
  const phase = data.phase || 'quarterfinals';
  const players = data.players || c.players || [];
  const slots = data.slots || c.slots || [];
  const history = data.history || [];
  const matches = data.matches || [];

  /* ─── Layout mode ─── */
  const layout = c.layout || 'grid'; // 'grid' | 'showcase' | 'vertical'

  /* ─── Style config ─── */
  const showBg = c.showBg !== false;
  const bgColor = showBg ? (c.bgColor || '#13151e') : 'transparent';
  const cardBg = c.cardBg || '#1a1d2e';
  const cardBorder = c.cardBorder || 'rgba(255,255,255,0.08)';
  const cardRadius = c.cardRadius ?? 10;
  const cardBorderWidth = c.cardBorderWidth ?? 1;
  const nameColor = c.nameColor || '#ffffff';
  const nameSize = c.nameSize ?? 12;
  const multiColor = c.multiColor || '#facc15';
  const multiSize = c.multiSize ?? 13;
  const tabBg = c.tabBg || 'rgba(255,255,255,0.06)';
  const tabActiveBg = c.tabActiveBg || 'rgba(255,255,255,0.15)';
  const tabColor = c.tabColor || '#94a3b8';
  const tabActiveColor = c.tabActiveColor || '#ffffff';
  const tabBorder = c.tabBorder || 'rgba(255,255,255,0.12)';
  const eliminatedOpacity = c.eliminatedOpacity ?? 0.35;
  const showSlotName = c.showSlotName !== false;
  const slotNameColor = c.slotNameColor || '#ffffff';
  const slotNameSize = c.slotNameSize ?? 10;
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const borderRadius = showBg ? (c.borderRadius ?? 12) : 0;
  const borderWidth = showBg ? (c.borderWidth ?? 0) : 0;
  const borderColor = showBg ? (c.borderColor || 'transparent') : 'transparent';
  const gap = c.cardGap ?? 6;
  const padding = c.containerPadding ?? 6;
  const swordColor = c.swordColor || '#eab308';
  const swordBg = c.swordBg || 'rgba(0,0,0,0.85)';
  const swordSize = c.swordSize ?? 20;
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
  const currentMatchIdx = data.currentMatch ?? 0;
  const isLivePhase = activePhase === phase;

  /* ═══════════════════════════════════════════════════════════════
     PLAYER COLUMN — used in grid & showcase layouts
     ═══════════════════════════════════════════════════════════════ */
  const renderPlayerCol = (pIdx, matchData, playerKey, isEliminated, large = false) => {
    const name = players[pIdx] || `Player ${pIdx + 1}`;
    const slot = slots[pIdx];
    const multi = calcMulti(matchData, playerKey);
    const op = isEliminated ? eliminatedOpacity : 1;
    const ns = large ? Math.max(nameSize, 16) : nameSize;
    const ms = large ? Math.max(multiSize, 18) : multiSize;
    const sns = large ? Math.max(slotNameSize, 13) : slotNameSize;

    return (
      <div className="tw-player-col" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: op, flex: 1, minWidth: 0, overflow: 'hidden',
      }}>
        {/* Name */}
        <div className="tw-player-name" style={{
          padding: large ? '6px 8px 4px' : '3px 4px 2px',
          fontSize: `${ns}px`, fontWeight: 700,
          color: nameColor, fontFamily, textAlign: 'center', lineHeight: 1.2,
          width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {name}
        </div>

        {/* Slot image */}
        <div className="tw-slot-cell" style={{
          position: 'relative', width: '100%', flex: 1, minHeight: 0,
          overflow: 'hidden',
        }}>
          {slot?.image ? (
            <img src={slot.image} alt={slot.name || ''} style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              objectFit: 'contain', display: 'block', borderRadius: 4,
            }} />
          ) : (
            <div style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%', background: 'rgba(0,0,0,0.3)',
              borderRadius: 4,
            }} />
          )}
          {showSlotName && slot?.name && (
            <div className="tw-slot-name" style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: large ? '4px 6px' : '2px 4px', fontSize: `${sns}px`,
              color: slotNameColor, fontWeight: 700, fontFamily,
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
              background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
              textTransform: 'uppercase', letterSpacing: '0.3px',
              textAlign: 'center', borderRadius: '0 0 4px 4px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {slot.name}
            </div>
          )}
          {isEliminated && (
            <div className="tw-eliminated-icon" style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: large ? 40 : 30, height: large ? 40 : 30, borderRadius: '50%',
                background: xIconBg, border: `2px solid ${xIconColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: large ? 20 : 15, color: xIconColor, fontWeight: 700,
              }}>✕</div>
            </div>
          )}
        </div>

        {/* Multiplier */}
        <div className="tw-multi" style={{
          padding: large ? '4px 6px' : '2px 4px', textAlign: 'center',
          fontSize: `${ms}px`, fontWeight: 700,
          color: parseFloat(multi) > 0 ? multiColor : '#64748b',
          fontFamily, lineHeight: 1.2,
        }}>
          {multi}x
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     PLAYER ROW — used in vertical layout (horizontal match row)
     ═══════════════════════════════════════════════════════════════ */
  const renderPlayerRow = (pIdx, matchData, playerKey, isEliminated, side = 'left') => {
    const name = players[pIdx] || `Player ${pIdx + 1}`;
    const slot = slots[pIdx];
    const multi = calcMulti(matchData, playerKey);
    const op = isEliminated ? eliminatedOpacity : 1;
    const isRight = side === 'right';

    return (
      <div className="tw-player-row" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        opacity: op, flex: 1, minWidth: 0,
        flexDirection: isRight ? 'row-reverse' : 'row',
      }}>
        {/* Slot thumbnail */}
        <div className="tw-slot-thumb" style={{
          position: 'relative', width: 60, height: 60, flexShrink: 0,
          overflow: 'hidden', borderRadius: 6,
        }}>
          {slot?.image ? (
            <img src={slot.image} alt={slot.name || ''} style={{
              width: '100%', height: '100%',
              objectFit: 'cover', display: 'block', borderRadius: 6,
            }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.3)', borderRadius: 6 }} />
          )}
          {isEliminated && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: xIconBg, border: `2px solid ${xIconColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: xIconColor, fontWeight: 700,
              }}>✕</div>
            </div>
          )}
        </div>

        {/* Name + multiplier + slot name */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 1,
          minWidth: 0, flex: 1,
          alignItems: isRight ? 'flex-end' : 'flex-start',
          textAlign: isRight ? 'right' : 'left',
        }}>
          <span style={{
            fontSize: nameSize + 2, fontWeight: 700, color: nameColor, fontFamily,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}>{name}</span>
          {showSlotName && slot?.name && (
            <span style={{
              fontSize: slotNameSize, color: slotNameColor, fontFamily,
              opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '100%', textTransform: 'uppercase', letterSpacing: '0.3px',
            }}>{slot.name}</span>
          )}
          <span style={{
            fontSize: multiSize, fontWeight: 700, fontFamily,
            color: parseFloat(multi) > 0 ? multiColor : '#64748b',
          }}>{multi}x</span>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     SWORD ICON (shared across layouts)
     ═══════════════════════════════════════════════════════════════ */
  const renderSword = (hasWinner, isCurrentMatch, size = swordSize) => (
    <div className="tw-sword-icon" style={{
      position: 'absolute',
      top: '50%', left: '50%',
      width: size + 16, height: size + 16,
      borderRadius: '50%',
      background: swordBg,
      border: `2px solid ${swordColor}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 5, pointerEvents: 'none',
      ...(isCurrentMatch
        ? { animation: 'tw-sword-swing 1.2s ease-in-out infinite' }
        : { transform: 'translate(-50%, -50%)' }),
    }}>
      <span style={{ fontSize: size, lineHeight: 1 }}>
        {hasWinner ? '✕' : '⚔️'}
      </span>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
     MATCH CARD — grid layout (classic 2-col)
     ═══════════════════════════════════════════════════════════════ */
  const renderGridMatch = (match, idx) => {
    const p1Won = match.winner === match.player1;
    const p2Won = match.winner === match.player2;
    const hasWinner = match.winner !== null && match.winner !== undefined;
    const isCurrentMatch = isLivePhase && idx === currentMatchIdx && !hasWinner;

    return (
      <div key={idx} className="tw-match-card" style={{
        background: cardBg,
        border: `${cardBorderWidth}px solid ${cardBorder}`,
        borderRadius: `${cardRadius}px`,
        overflow: 'hidden', position: 'relative',
        padding: `3px ${gap > 4 ? 4 : 2}px`,
        display: 'flex', flexDirection: 'column', minHeight: 0,
      }}>
        <div className="tw-match-inner" style={{
          display: 'flex', gap: 4, flex: 1, minHeight: 0,
        }}>
          {renderPlayerCol(match.player1, match, 'player1', hasWinner && !p1Won)}
          {renderPlayerCol(match.player2, match, 'player2', hasWinner && !p2Won)}
        </div>
        {renderSword(hasWinner, isCurrentMatch)}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     SHOWCASE — single match at a time with large images
     ═══════════════════════════════════════════════════════════════ */
  const renderShowcase = () => {
    const match = currentMatches[currentMatchIdx] || currentMatches[0];
    if (!match) return null;
    const hasWinner = match.winner !== null && match.winner !== undefined;
    const p1Won = match.winner === match.player1;
    const isCurrentMatch = isLivePhase && !hasWinner;
    const totalMatches = currentMatches.length;

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: `${padding}px`, minHeight: 0 }}>
        {/* Match counter pills */}
        {totalMatches > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 4,
            marginBottom: 4, flexShrink: 0,
          }}>
            {currentMatches.map((_, i) => {
              const mDone = currentMatches[i].winner !== null && currentMatches[i].winner !== undefined;
              const isCur = i === currentMatchIdx;
              return (
                <div key={i} style={{
                  width: isCur ? 18 : 8, height: 8, borderRadius: 4,
                  background: mDone ? '#22c55e' : isCur ? swordColor : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.2s',
                }} />
              );
            })}
          </div>
        )}

        {/* Single match card, fills remaining space */}
        <div style={{
          flex: 1, minHeight: 0, background: cardBg,
          border: `${cardBorderWidth}px solid ${cardBorder}`,
          borderRadius: `${cardRadius}px`,
          overflow: 'hidden', position: 'relative',
          padding: `${Math.max(padding, 6)}px`,
          display: 'flex', flexDirection: 'column',
        }}>
          <div className="tw-match-inner" style={{
            display: 'flex', gap: 8, flex: 1, minHeight: 0,
          }}>
            {renderPlayerCol(match.player1, match, 'player1', hasWinner && !p1Won, true)}
            {renderPlayerCol(match.player2, match, 'player2', hasWinner && p1Won, true)}
          </div>
          {renderSword(hasWinner, isCurrentMatch, Math.max(swordSize, 26))}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     VERTICAL — matches stacked, each as a horizontal row
     ═══════════════════════════════════════════════════════════════ */
  const renderVertical = () => {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: `${padding}px`, gap: `${gap}px`, minHeight: 0,
        overflow: 'hidden',
      }}>
        {currentMatches.map((match, idx) => {
          const hasWinner = match.winner !== null && match.winner !== undefined;
          const p1Won = match.winner === match.player1;
          const isCurrentMatch = isLivePhase && idx === currentMatchIdx && !hasWinner;

          return (
            <div key={idx} style={{
              flex: 1, minHeight: 0,
              background: cardBg,
              border: `${cardBorderWidth}px solid ${isCurrentMatch ? swordColor : cardBorder}`,
              borderRadius: `${cardRadius}px`,
              overflow: 'hidden', position: 'relative',
              padding: `${Math.max(padding, 4)}px 8px`,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {renderPlayerRow(match.player1, match, 'player1', hasWinner && !p1Won, 'left')}

              {/* Center sword */}
              <div style={{ position: 'relative', width: swordSize + 20, height: swordSize + 20, flexShrink: 0 }}>
                {renderSword(hasWinner, isCurrentMatch)}
              </div>

              {renderPlayerRow(match.player2, match, 'player2', hasWinner && p1Won, 'right')}
            </div>
          );
        })}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     GRID — classic 2-column layout
     ═══════════════════════════════════════════════════════════════ */
  const renderGrid = () => {
    const matchCount = currentMatches.length;
    const cols = matchCount === 1 ? 1 : 2;
    const rows = Math.ceil(matchCount / cols);

    return (
      <div className="tw-matches" style={{
        flex: 1, padding: `${padding}px`, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: `${gap}px`,
      }}>
        {currentMatches.map((match, idx) => renderGridMatch(match, idx))}
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
      {/* Injected keyframes */}
      <style>{`
        @keyframes tw-sword-swing {
          0%, 100% { transform: translate(-50%, -50%) rotate(-20deg); }
          50% { transform: translate(-50%, -50%) rotate(20deg); }
        }
      `}</style>

      {/* ── Phase Tabs ── */}
      <div className="tw-tabs" style={{
        padding: `${padding}px ${padding}px 0`,
        display: 'flex', justifyContent: 'center', flexShrink: 0,
      }}>
        <div style={{
          display: 'inline-flex', borderRadius: 6, overflow: 'hidden',
          background: tabBg, border: `1px solid ${tabBorder}`,
        }}>
          {phaseOrder.filter(p => phases.some(ph => ph.phase === p)).map(p => {
            const isActive = activePhase === p;
            return (
              <button key={p}
                className="tw-tab"
                onClick={() => setDisplayPhase(p)}
                style={{
                  padding: '5px 14px',
                  fontSize: 11, fontWeight: 700, fontFamily,
                  textTransform: 'uppercase', letterSpacing: '0.6px',
                  background: isActive ? tabActiveBg : 'transparent',
                  color: isActive ? tabActiveColor : tabColor,
                  border: 'none', cursor: 'pointer',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                  borderRadius: isActive ? 4 : 0,
                }}>
                {phaseLabels[p] || p}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Layout-specific content ── */}
      {layout === 'showcase' ? renderShowcase()
        : layout === 'vertical' ? renderVertical()
        : renderGrid()}
    </div>
  );
}
