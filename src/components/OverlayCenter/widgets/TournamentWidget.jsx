import React, { useState, useMemo } from 'react';

/**
 * TournamentWidget — OBS bracket display.
 * Four layout modes:
 *   grid      → 2-column card grid (classic)
 *   showcase  → single match fills the widget with large images
 *   vertical  → matches stacked top-to-bottom, horizontal rows
 *   bracket   → clean list — all phases, section headers, horizontal match rows
 */
function TournamentWidget({ config, theme }) {
  const c = config || {};
  const data = c.data || {};
  const phase = data.phase || 'quarterfinals';
  const players = data.players || c.players || [];
  const slots = data.slots || c.slots || [];
  const history = data.history || [];
  const matches = data.matches || [];

  /* ─── Layout mode ─── */
  const layout = c.layout || 'grid'; // 'grid' | 'showcase' | 'vertical' | 'bracket' | 'neon' | 'minimal' | 'arena'
  const isNeonLayout = layout === 'neon';
  const isMinimalLayout = layout === 'minimal';
  const isArenaLayout = layout === 'arena';

  /* ─── Style config ─── */
  const showBg = c.showBg !== false;
  const bgColor = showBg ? (c.bgColor || (isArenaLayout ? '#1a1040' : isNeonLayout ? '#050510' : isMinimalLayout ? '#0a0a10' : '#13151e')) : 'transparent';
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

    /* ── Neon layout: image fills card, name stripe top, bet/payout stripe bottom ── */
    if (isNeonLayout) {
      const md = matchData?.data || {};
      const pd = md[playerKey] || {};
      const bet = parseFloat(pd.bet) || 0;
      const payout = parseFloat(pd.payout) || 0;
      const currency = c.arenaCurrency || '€';

      return (
        <div className="tw-player-col" style={{
          display: 'flex', flexDirection: 'column',
          opacity: op, flex: 1, minWidth: 0, overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Full-bleed slot image */}
          <div style={{
            position: 'relative', width: '100%', flex: 1, minHeight: 0,
            overflow: 'hidden',
          }}>
            {slot?.image ? (
              <img src={slot.image} alt="" style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                objectFit: 'cover', display: 'block',
              }} />
            ) : (
              <div style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%', background: 'rgba(0,0,0,0.3)',
              }} />
            )}

            {/* Name stripe — top */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              background: 'rgba(0,0,0,0.75)',
              padding: '3px 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 2,
            }}>
              <span style={{
                fontSize: `${ns}px`, fontWeight: 700,
                color: nameColor, fontFamily, lineHeight: 1.1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                textTransform: 'uppercase', letterSpacing: '0.3px',
              }}>{name}</span>
            </div>

            {/* Bet / Payout stripe — bottom */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'rgba(0,0,0,0.75)',
              padding: '3px 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              zIndex: 2,
            }}>
              <span style={{
                fontSize: Math.max(ns - 2, 9), fontWeight: 600,
                color: '#94a3b8', fontFamily, lineHeight: 1.1,
              }}>{bet > 0 ? `${currency}${bet.toFixed(2)}` : `${currency}0.00`}</span>
              <span style={{
                fontSize: Math.max(ns - 2, 9), fontWeight: 700,
                color: payout > 0 ? multiColor : '#64748b', fontFamily, lineHeight: 1.1,
              }}>{payout > 0 ? `${currency}${payout.toFixed(2)}` : `${currency}0.00`}</span>
            </div>

            {/* Eliminated X */}
            {isEliminated && (
              <div className="tw-eliminated-icon" style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: xIconBg, border: `2px solid ${xIconColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, color: xIconColor, fontWeight: 700,
                }}>✕</div>
              </div>
            )}
          </div>
        </div>
      );
    }

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
        {/* Slot thumbnail — responsive: scales with widget size */}
        <div className="tw-slot-thumb" style={{
          position: 'relative', width: 'clamp(40px, 20%, 100px)', aspectRatio: '1 / 1', flexShrink: 0,
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
        border: `${cardBorderWidth}px solid ${isCurrentMatch ? swordColor : cardBorder}`,
        borderRadius: `${cardRadius}px`,
        overflow: 'hidden', position: 'relative',
        padding: isNeonLayout ? 0 : `2px ${gap > 4 ? 3 : 2}px`,
        display: 'flex', flexDirection: 'column', minHeight: 0,
        ...(isCurrentMatch ? { animation: 'tw-current-glow 2s ease-in-out infinite' } : {}),
      }}>
        <div className="tw-match-inner" style={{
          display: 'flex', gap: isNeonLayout ? 2 : 4, flex: 1, minHeight: 0,
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
          border: `${cardBorderWidth}px solid ${isCurrentMatch ? swordColor : cardBorder}`,
          borderRadius: `${cardRadius}px`,
          overflow: 'hidden', position: 'relative',
          padding: `${Math.max(padding, 6)}px`,
          display: 'flex', flexDirection: 'column',
          ...(isCurrentMatch ? { animation: 'tw-current-glow 2s ease-in-out infinite' } : {}),
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
              padding: isMinimalLayout ? '3px 6px' : `${Math.max(padding, 4)}px 8px`,
              display: 'flex', alignItems: 'center', gap: isMinimalLayout ? 4 : 6,
              ...(isCurrentMatch ? { animation: 'tw-current-glow 2s ease-in-out infinite' } : {}),
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

    /* Colors from shared config — auto-syncs with navbar */
    const accent = c.bkAccent || multiColor;
    const divider = cardBorder;
    const subText = c.bkHeaderColor || '#94a3b8';

    /* Helper: one player side in a bracket match row */
    const renderBkPlayer = (playerIdx, matchData, playerKey, isEliminated, side) => {
      const name = players[playerIdx] || `P${playerIdx + 1}`;
      const slot = slots[playerIdx];
      const multi = calcMulti(matchData, playerKey);
      const isRight = side === 'right';
      return (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
          flexDirection: isRight ? 'row-reverse' : 'row',
          opacity: isEliminated ? eliminatedOpacity : 1,
        }}>
          <div style={{
            width: 'clamp(32px, 18%, 64px)', aspectRatio: '1', flexShrink: 0,
            borderRadius: Math.min(cardRadius, 6), overflow: 'hidden',
            border: `1px solid ${divider}`,
          }}>
            {slot?.image ? (
              <img src={slot.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.04)' }} />
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1, textAlign: isRight ? 'right' : 'left' }}>
            {showSlotName && slot?.name && (
              <div style={{
                fontSize: Math.max(slotNameSize, 10), fontWeight: 700, color: slotNameColor,
                textTransform: 'uppercase', letterSpacing: '0.3px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{slot.name}</div>
            )}
            <div style={{
              fontSize: nameSize, fontWeight: 600, color: nameColor, fontFamily,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{name}</div>
            <div style={{
              fontSize: multiSize, fontWeight: 700, fontFamily,
              color: parseFloat(multi) > 0 ? multiColor : '#64748b',
            }}>{multi}x</div>
          </div>
        </div>
      );
    };

    const renderBracketMatch = (match, mIdx, isFinal) => {
      const hasWinner = match.winner !== null && match.winner !== undefined;
      const p1Won = match.winner === match.player1;
      const p2Won = match.winner === match.player2;
      const isCurrentMatch = !hasWinner && isLivePhase;

      return (
        <div key={mIdx} style={{
          background: isFinal ? `${accent}12` : cardBg,
          border: `1px solid ${isFinal ? `${accent}40` : isCurrentMatch ? `${swordColor}55` : divider}`,
          borderRadius: cardRadius,
          padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 6,
          position: 'relative',
          transition: 'border-color 0.2s',
          ...(isCurrentMatch ? { animation: 'tw-current-glow 2s ease-in-out infinite' } : {}),
        }}>
          {renderBkPlayer(match.player1, match, 'player1', hasWinner && !p1Won, 'left')}

          {/* Center VS badge */}
          <div style={{
            flexShrink: 0, width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%',
            background: isCurrentMatch ? `${swordColor}20` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isCurrentMatch ? swordColor : divider}`,
            fontSize: 13, fontWeight: 800,
            color: isCurrentMatch ? swordColor : '#64748b',
          }}>
            {hasWinner ? '✕' : 'VS'}
          </div>

          {renderBkPlayer(match.player2, match, 'player2', hasWinner && !p2Won, 'right')}
        </div>
      );
    };

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', fontFamily }}>
        {/* ── Header ── */}
        <div style={{
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${divider}`,
          background: cardBg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: accent }} />
            <span style={{
              fontSize: 13, fontWeight: 800, color: nameColor, fontFamily,
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              {title}{tournamentNum ? ` #${tournamentNum}` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>{completedMatches}/{totalMatches}</span>
            <div style={{ width: 48, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: accent, transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          padding: '6px 14px', borderBottom: `1px solid ${divider}`,
          fontSize: 13, color: subText, fontWeight: 600, fontFamily,
        }}>
          <span>👥 <strong style={{ color: nameColor }}>{playerCount}</strong> Players</span>
          <span>🏆 Best of <strong style={{ color: nameColor }}>{formatLabel}</strong></span>
          {prize && <span>💰 <strong style={{ color: multiColor }}>{prize}</strong></span>}
        </div>

        {/* ── Phase Sections ── */}
        <div style={{ padding: `${padding}px`, display: 'flex', flexDirection: 'column', gap: gap + 2 }}>
          {allPhases.map((ph, pIdx) => {
            const isFinal = ph.phase === 'finals';
            const isFirst = pIdx === 0;
            return (
              <React.Fragment key={ph.phase}>
                {!isFirst && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 0 2px',
                  }}>
                    <div style={{ flex: 1, height: 1, background: isFinal ? accent : divider }} />
                    <span style={{
                      fontSize: 12, fontWeight: 700, letterSpacing: '1.2px',
                      textTransform: 'uppercase', fontFamily,
                      color: isFinal ? accent : subText,
                    }}>
                      {isFinal ? '🏆 ' : ''}{phaseLabels[ph.phase] || ph.phase}
                    </span>
                    <div style={{ flex: 1, height: 1, background: isFinal ? accent : divider }} />
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
     ARENA — Battle Arena style: large match rows, VS badge, WINNER
     ═══════════════════════════════════════════════════════════════ */
  const renderArena = () => {
    const allMatches = phases.flatMap(p => p.matches);
    const totalBets = allMatches.reduce((s, m) => {
      const d = m.data || {};
      return s + (parseFloat(d.player1?.bet) || 0) + (parseFloat(d.player2?.bet) || 0);
    }, 0);
    const totalPayout = allMatches.reduce((s, m) => {
      const d = m.data || {};
      const p1p = data.format === 'bo3'
        ? (parseFloat(d.player1?.payout1)||0) + (parseFloat(d.player1?.payout2)||0) + (parseFloat(d.player1?.payout3)||0)
        : (parseFloat(d.player1?.payout)||0);
      const p2p = data.format === 'bo3'
        ? (parseFloat(d.player2?.payout1)||0) + (parseFloat(d.player2?.payout2)||0) + (parseFloat(d.player2?.payout3)||0)
        : (parseFloat(d.player2?.payout)||0);
      return s + p1p + p2p;
    }, 0);

    const arenaAccent = c.arenaAccent || '#eab308';
    const arenaWinColor = c.arenaWinColor || '#22c55e';
    const arenaLoseOpacity = c.arenaLoseOpacity ?? 0.55;
    const arenaBg = showBg ? (c.arenaBg || '#1a1040') : 'transparent';
    const arenaCardBg = c.arenaCardBg || '#1e1550';
    const arenaCurrency = c.arenaCurrency || '$';

    const renderArenaFighter = (pIdx, matchData, playerKey, isWinner, isLoser) => {
      const name = players[pIdx] || `Fighter ${pIdx + 1}`;
      const slot = slots[pIdx];
      const md = matchData?.data?.[playerKey] || {};
      const bet = parseFloat(md.bet) || 0;
      const payout = data.format === 'bo3'
        ? (parseFloat(md.payout1)||0) + (parseFloat(md.payout2)||0) + (parseFloat(md.payout3)||0)
        : (parseFloat(md.payout)||0);

      return (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
          borderRadius: 10, overflow: 'hidden', position: 'relative',
          border: isWinner ? `2px solid ${arenaWinColor}` : '2px solid rgba(255,255,255,0.08)',
          boxShadow: isWinner ? `0 0 20px ${arenaWinColor}40, inset 0 0 30px ${arenaWinColor}10` : 'none',
          opacity: isLoser ? arenaLoseOpacity : 1,
          background: arenaCardBg,
          transition: 'all 0.3s ease',
        }}>
          {/* Winner badge */}
          {isWinner && (
            <div style={{
              position: 'absolute', top: 8, left: playerKey === 'player1' ? 'auto' : 8, right: playerKey === 'player1' ? 8 : 'auto',
              background: arenaWinColor, color: '#fff', fontWeight: 800,
              fontSize: 11, padding: '3px 10px', borderRadius: 4,
              textTransform: 'uppercase', letterSpacing: '0.8px', zIndex: 3,
              boxShadow: `0 2px 8px ${arenaWinColor}60`,
            }}>WINNER</div>
          )}
          {/* Trophy for winner */}
          {isWinner && (
            <div style={{
              position: 'absolute', top: 6, left: playerKey === 'player1' ? 8 : 'auto', right: playerKey === 'player1' ? 'auto' : 8,
              fontSize: 18, zIndex: 3,
            }}>🏆</div>
          )}

          {/* Fighter name header */}
          <div style={{
            padding: '10px 12px 6px', fontSize: 15, fontWeight: 700, fontStyle: 'italic',
            color: '#fff', fontFamily, letterSpacing: '0.3px',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)',
            position: 'relative', zIndex: 2,
          }}>{name}</div>

          {/* Fighter image */}
          <div style={{
            flex: 1, minHeight: 80, position: 'relative', overflow: 'hidden',
          }}>
            {slot?.image ? (
              <img src={slot.image} alt={name} style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                objectFit: 'cover', display: 'block',
              }} />
            ) : (
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(255,255,255,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, color: 'rgba(255,255,255,0.1)',
              }}>⚔</div>
            )}
            {/* Gradient overlay for readability */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* Bet / Payout footer */}
          <div style={{
            display: 'flex', borderTop: `1px solid rgba(255,255,255,0.1)`,
            background: 'rgba(0,0,0,0.3)',
          }}>
            <div style={{
              flex: 1, padding: '8px 6px', textAlign: 'center',
              borderRight: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>BET</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: isWinner ? arenaWinColor : '#fff', fontFamily }}>{arenaCurrency}{bet.toLocaleString()}</div>
            </div>
            <div style={{ flex: 1, padding: '8px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>PAYOUT</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: isWinner ? arenaWinColor : '#fff', fontFamily }}>{arenaCurrency}{payout.toLocaleString()}</div>
            </div>
          </div>
        </div>
      );
    };

    const renderArenaMatch = (match, idx) => {
      const hasWinner = match.winner !== null && match.winner !== undefined;
      const p1Won = match.winner === match.player1;
      const p2Won = match.winner === match.player2;
      const isCurrentMatch = isLivePhase && idx === currentMatchIdx && !hasWinner;

      return (
        <div key={idx} style={{
          display: 'flex', alignItems: 'stretch', gap: 0,
          position: 'relative', minHeight: 120,
          borderRadius: `${cardRadius}px`,
          border: isCurrentMatch ? `2px solid ${arenaAccent}88` : '2px solid transparent',
          ...(isCurrentMatch ? { animation: 'tw-current-glow 2s ease-in-out infinite' } : {}),
        }}>
          {/* Left fighter */}
          <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
            {renderArenaFighter(match.player1, match, 'player1', p1Won, hasWinner && !p1Won)}
          </div>

          {/* VS badge */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 42, height: 42, borderRadius: '50%', zIndex: 10,
            background: `linear-gradient(135deg, ${arenaAccent}, ${arenaAccent}cc)`,
            border: '3px solid rgba(0,0,0,0.5)',
            boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 12px ${arenaAccent}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900, color: '#000', letterSpacing: '0.5px',
          }}>VS</div>

          {/* Right fighter */}
          <div style={{ flex: 1, display: 'flex', minWidth: 0, marginLeft: 6 }}>
            {renderArenaFighter(match.player2, match, 'player2', p2Won, hasWinner && !p2Won)}
          </div>
        </div>
      );
    };

    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'auto', fontFamily,
      }}>
        {/* Arena Header */}
        <div style={{
          textAlign: 'center', padding: '16px 12px 8px',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 26, fontWeight: 900, color: arenaAccent,
            textTransform: 'uppercase', letterSpacing: '3px',
            textShadow: `0 0 20px ${arenaAccent}60, 0 2px 10px rgba(0,0,0,0.8)`,
            fontFamily,
          }}>
            ⚔ {c.title || 'BATTLE ARENA'} ⚔
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '2px', marginTop: 4,
          }}>LIVE BETTING MATCHES</div>
          {/* Match dots */}
          {allMatches.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
              {allMatches.map((m, i) => {
                const done = m.winner !== null && m.winner !== undefined;
                return (
                  <div key={i} style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: done ? arenaWinColor : 'rgba(255,255,255,0.25)',
                    boxShadow: done ? `0 0 6px ${arenaWinColor}80` : 'none',
                    transition: 'all 0.3s',
                  }} />
                );
              })}
            </div>
          )}
        </div>

        {/* Match rows */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          gap: 10, padding: `4px ${padding + 4}px ${padding}px`,
          overflow: 'auto',
        }}>
          {allMatches.map((match, idx) => renderArenaMatch(match, idx))}
        </div>

        {/* Summary bar */}
        <div style={{
          display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.3)', flexShrink: 0,
        }}>
          <div style={{ flex: 1, padding: '10px 8px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>TOTAL BETS</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: arenaAccent, fontFamily }}>{arenaCurrency}{totalBets.toLocaleString()}</div>
          </div>
          <div style={{ flex: 1, padding: '10px 8px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>TOTAL PAYOUT</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: arenaAccent, fontFamily }}>{arenaCurrency}{totalPayout.toLocaleString()}</div>
          </div>
          <div style={{ flex: 1, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>MATCHES</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily }}>{allMatches.length}</div>
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     GRID — classic 2-column layout
     ═══════════════════════════════════════════════════════════════ */
  const renderGrid = () => {
    const matchCount = currentMatches.length;
    const cols = isNeonLayout ? 1 : matchCount === 1 ? 1 : 2;
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
        @keyframes tw-current-glow {
          0%, 100% { box-shadow: 0 0 8px ${swordColor}55, 0 0 20px ${swordColor}22; }
          50%      { box-shadow: 0 0 14px ${swordColor}88, 0 0 32px ${swordColor}33; }
        }
      `}</style>

      {/* ── Phase Tabs (hidden in bracket & arena layout) ── */}
      {layout !== 'bracket' && layout !== 'arena' && (
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
                    fontSize: 13, fontWeight: 700, fontFamily,
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
      {layout === 'arena' ? renderArena()
        : layout === 'bracket' ? renderBracket()
        : layout === 'showcase' ? renderShowcase()
        : (layout === 'vertical' || layout === 'minimal') ? renderVertical()
        : (layout === 'neon' || layout === 'grid') ? renderGrid()
        : renderGrid()}
    </div>
  );
}

export default React.memo(TournamentWidget);
