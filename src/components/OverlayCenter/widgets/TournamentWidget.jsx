import React, { useState, useMemo } from 'react';

/**
 * TournamentWidget — OBS bracket display.
 * Four layout modes:
 *   grid      → 2-column card grid (classic)
 *   showcase  → single match fills the widget with large images
 *   vertical  → matches stacked top-to-bottom, horizontal rows
 *   bracket   → clean list — all phases, section headers, horizontal match rows
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
  const layout = c.layout || 'grid'; // 'grid' | 'showcase' | 'vertical' | 'bracket' | 'neon' | 'minimal'
  const isNeonLayout = layout === 'neon';
  const isMinimalLayout = layout === 'minimal';

  /* ─── Style config ─── */
  const showBg = c.showBg !== false;
  const bgColor = showBg ? (c.bgColor || (isNeonLayout ? '#050510' : isMinimalLayout ? '#0a0a10' : '#13151e')) : 'transparent';
  const cardBg = c.cardBg || (isNeonLayout ? 'rgba(0,255,200,0.04)' : isMinimalLayout ? 'rgba(255,255,255,0.03)' : '#1a1d2e');
  const cardBorder = c.cardBorder || (isNeonLayout ? 'rgba(0,255,200,0.2)' : isMinimalLayout ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)');
  const cardRadius = c.cardRadius ?? (isMinimalLayout ? 4 : 10);
  const cardBorderWidth = c.cardBorderWidth ?? 1;
  const nameColor = c.nameColor || (isNeonLayout ? '#ccffee' : '#ffffff');
  const nameSize = c.nameSize ?? (isMinimalLayout ? 11 : 12);
  const multiColor = c.multiColor || (isNeonLayout ? '#00ffcc' : '#facc15');
  const multiSize = c.multiSize ?? 13;
  const tabBg = c.tabBg || (isNeonLayout ? 'rgba(0,255,200,0.05)' : 'rgba(255,255,255,0.06)');
  const tabActiveBg = c.tabActiveBg || (isNeonLayout ? 'rgba(0,255,200,0.15)' : 'rgba(255,255,255,0.15)');
  const tabColor = c.tabColor || '#94a3b8';
  const tabActiveColor = c.tabActiveColor || (isNeonLayout ? '#00ffcc' : '#ffffff');
  const tabBorder = c.tabBorder || (isNeonLayout ? 'rgba(0,255,200,0.15)' : 'rgba(255,255,255,0.12)');
  const eliminatedOpacity = c.eliminatedOpacity ?? 0.35;
  const showSlotName = isMinimalLayout ? false : c.showSlotName !== false;
  const slotNameColor = c.slotNameColor || '#ffffff';
  const slotNameSize = c.slotNameSize ?? 10;
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const borderRadius = showBg ? (c.borderRadius ?? 12) : 0;
  const borderWidth = showBg ? (c.borderWidth ?? 0) : 0;
  const borderColor = showBg ? (c.borderColor || 'transparent') : 'transparent';
  const gap = c.cardGap ?? 6;
  const padding = c.containerPadding ?? 6;
  const swordColor = c.swordColor || (isNeonLayout ? '#00ffcc' : '#eab308');
  const swordBg = c.swordBg || (isNeonLayout ? 'rgba(0,255,200,0.1)' : 'rgba(0,0,0,0.85)');
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
          padding: large ? '4px 6px 2px' : '2px 4px 1px',
          fontSize: `${ns}px`, fontWeight: 700,
          color: nameColor, fontFamily, textAlign: 'center', lineHeight: 1.1,
          width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {name}
        </div>

        {/* Slot image */}
        <div className="tw-slot-cell" style={{
          position: 'relative', width: '100%', flex: 1, minHeight: 0,
          overflow: 'hidden', borderRadius: 4,
        }}>
          {slot?.image ? (
            <img src={slot.image} alt={slot.name || ''} style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', display: 'block', borderRadius: 4,
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
          padding: large ? '2px 6px' : '1px 4px', textAlign: 'center',
          fontSize: `${ms}px`, fontWeight: 700,
          color: parseFloat(multi) > 0 ? multiColor : '#64748b',
          fontFamily, lineHeight: 1.1,
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
        padding: `2px ${gap > 4 ? 3 : 2}px`,
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
     BRACKET — all phases listed, section headers, clean rows
     ═══════════════════════════════════════════════════════════════ */
  const renderBracket = () => {
    const allPhases = [...history.map(h => ({ phase: h.phase, matches: h.matches }))];
    if (matches.length > 0) allPhases.push({ phase, matches });

    const totalMatches = allPhases.reduce((sum, p) => sum + p.matches.length, 0);
    const completedMatches = allPhases.reduce((sum, p) => sum + p.matches.filter(m => m.winner !== null && m.winner !== undefined).length, 0);
    const pct = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;
    const playerCount = players.filter(p => p).length;
    const formatLabel = data.format === 'bo3' ? '3' : '1';
    const title = c.title || 'BONUS BUY TOURNAMENT';
    const tournamentNum = c.tournamentNumber || '';
    const prize = c.prize || '';

    const bkHeaderBg = c.bkHeaderBg || 'rgba(20,24,40,0.95)';
    const bkHeaderColor = c.bkHeaderColor || '#e2e8f0';
    const bkAccent = c.bkAccent || '#6366f1';
    const bkDividerColor = c.bkDividerColor || 'rgba(255,255,255,0.08)';
    const bkFinalBg = c.bkFinalBg || 'rgba(59,130,246,0.12)';
    const bkFinalBorder = c.bkFinalBorder || 'rgba(59,130,246,0.35)';
    const bkRowBg = c.bkRowBg || 'rgba(255,255,255,0.02)';

    const renderBracketMatch = (match, mIdx, isFinal) => {
      const p1 = players[match.player1] || `P${match.player1 + 1}`;
      const p2 = players[match.player2] || `P${match.player2 + 1}`;
      const s1 = slots[match.player1];
      const s2 = slots[match.player2];
      const m1 = calcMulti(match, 'player1');
      const m2 = calcMulti(match, 'player2');
      const hasWinner = match.winner !== null && match.winner !== undefined;
      const p1Won = match.winner === match.player1;
      const p2Won = match.winner === match.player2;

      return (
        <div key={mIdx} className={`tw-bk-row${isFinal ? ' tw-bk-row--final' : ''}`} style={{
          background: isFinal ? bkFinalBg : bkRowBg,
          border: isFinal ? `1px solid ${bkFinalBorder}` : `1px solid ${bkDividerColor}`,
          borderRadius: cardRadius,
          padding: '8px 10px',
          display: 'flex', alignItems: 'center', gap: 8,
          opacity: 1,
        }}>
          {/* Left player */}
          <div className="tw-bk-player tw-bk-player--left" style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
            opacity: hasWinner && !p1Won ? eliminatedOpacity : 1,
          }}>
            <div className="tw-bk-thumb" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 6, overflow: 'hidden' }}>
              {s1?.image ? (
                <img src={s1.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} />
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              {showSlotName && s1?.name && (
                <div style={{
                  fontSize: slotNameSize + 1, fontWeight: 700, color: slotNameColor,
                  textTransform: 'uppercase', letterSpacing: '0.4px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{s1.name}</div>
              )}
              <div style={{ fontSize: nameSize - 1, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p1}
              </div>
            </div>
          </div>

          {/* Center: multipliers + X */}
          <div className="tw-bk-center" style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          }}>
            <span style={{ fontSize: multiSize, fontWeight: 700, color: parseFloat(m1) > 0 ? multiColor : '#64748b', fontFamily }}>
              {m1}
            </span>
            {isFinal && prize ? (
              <div className="tw-bk-prize" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: bkAccent, letterSpacing: '0.5px' }}>✕</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: multiColor }}>{prize}</span>
              </div>
            ) : (
              <span style={{
                fontSize: 13, fontWeight: 700, color: bkAccent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24,
              }}>✕</span>
            )}
            <span style={{ fontSize: multiSize, fontWeight: 700, color: parseFloat(m2) > 0 ? multiColor : '#64748b', fontFamily }}>
              {m2}
            </span>
          </div>

          {/* Right player */}
          <div className="tw-bk-player tw-bk-player--right" style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
            flexDirection: 'row-reverse', textAlign: 'right',
            opacity: hasWinner && !p2Won ? eliminatedOpacity : 1,
          }}>
            <div className="tw-bk-thumb" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 6, overflow: 'hidden' }}>
              {s2?.image ? (
                <img src={s2.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} />
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              {showSlotName && s2?.name && (
                <div style={{
                  fontSize: slotNameSize + 1, fontWeight: 700, color: slotNameColor,
                  textTransform: 'uppercase', letterSpacing: '0.4px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{s2.name}</div>
              )}
              <div style={{ fontSize: nameSize - 1, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p2}
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="tw-bk-wrap" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {/* Header */}
        <div className="tw-bk-header" style={{
          background: bkHeaderBg, padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${bkDividerColor}`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: bkHeaderColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}{tournamentNum ? ` #${tournamentNum}` : ''}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: bkAccent }}>{completedMatches}/{totalMatches}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#94a3b8',
              background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4,
            }}>{pct}%</span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="tw-bk-stats" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
          padding: '7px 14px', borderBottom: `1px solid ${bkDividerColor}`,
          fontSize: 11, color: '#94a3b8', fontWeight: 600,
        }}>
          <span>⏱ Start</span>
          <span>👥 Players &nbsp;<strong style={{ color: '#e2e8f0' }}>{playerCount}</strong></span>
          <span>🏆 Best Of &nbsp;<strong style={{ color: '#e2e8f0' }}>{formatLabel}</strong></span>
        </div>

        {/* Phases + Matches */}
        <div style={{ padding: `${padding}px`, display: 'flex', flexDirection: 'column', gap: gap }}>
          {allPhases.map((ph, pIdx) => {
            const isFinal = ph.phase === 'finals';
            const isFirst = pIdx === 0;
            return (
              <React.Fragment key={ph.phase}>
                {/* Phase divider (skip for first phase — already implied by header) */}
                {!isFirst && (
                  <div className="tw-bk-divider" style={{
                    textAlign: 'center', padding: '8px 0 4px',
                    fontSize: 11, fontWeight: 700, color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: '1px',
                    borderTop: `1px solid ${bkDividerColor}`,
                  }}>
                    {phaseLabels[ph.phase] || ph.phase}
                  </div>
                )}
                {ph.matches.map((match, mIdx) => renderBracketMatch(match, `${pIdx}-${mIdx}`, isFinal))}
              </React.Fragment>
            );
          })}
        </div>
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
    <div className={`tw-root${isNeonLayout ? ' tw-root--neon' : isMinimalLayout ? ' tw-root--minimal' : ''}`} style={{
      width: '100%', height: '100%', fontFamily,
      background: bgColor, borderRadius: `${borderRadius}px`,
      border: `${borderWidth}px solid ${borderColor}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      ...(isNeonLayout ? { boxShadow: `0 0 30px rgba(0,255,200,0.06), inset 0 0 40px rgba(0,255,200,0.02)` } : {}),
    }}>
      {/* Injected keyframes */}
      <style>{`
        @keyframes tw-sword-swing {
          0%, 100% { transform: translate(-50%, -50%) rotate(-20deg); }
          50% { transform: translate(-50%, -50%) rotate(20deg); }
        }
      `}</style>

      {/* ── Phase Tabs (hidden in bracket layout) ── */}
      {layout !== 'bracket' && (
        <div className="tw-tabs" style={{
          padding: `${padding}px ${padding}px 0`,
          display: 'flex', justifyContent: 'center', flexShrink: 0,
        }}>
          <div style={{
            display: 'inline-flex', borderRadius: isMinimalLayout ? 4 : 6, overflow: 'hidden',
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
                    ...(isNeonLayout && isActive ? { textShadow: `0 0 8px rgba(0,255,200,0.5)` } : {}),
                  }}>
                  {phaseLabels[p] || p}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Layout-specific content ── */}
      {layout === 'bracket' ? renderBracket()
        : layout === 'showcase' ? renderShowcase()
        : (layout === 'vertical' || layout === 'minimal') ? renderVertical()
        : (layout === 'neon' || layout === 'grid') ? renderGrid()
        : renderGrid()}
    </div>
  );
}
