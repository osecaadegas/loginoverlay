import React from 'react';
import {
  calcRoundResult,
  calcMatchWinner,
  getBoScoreboard,
  getTournamentStats,
  getTypeLabel,
  MATCH_STATUS,
} from './tournament/tournamentEngine';

/**
 * TournamentWidget — OBS overlay display for the unified tournament engine.
 * Reads match data from config.data (tournament blob created by TournamentConfig).
 *
 * Seven layout modes:
 *   grid      → 2-column card grid (classic)
 *   showcase  → single match fills the widget with large images
 *   vertical  → matches stacked top-to-bottom, horizontal rows
 *   bracket   → clean list with header, progress bar, match rows
 *   neon      → full-bleed slot images, name/result stripes
 *   minimal   → compact vertical rows
 *   arena     → Battle Arena style: large fighters, VS badge, WINNER
 */
function TournamentWidget({ config, theme }) {
  const c = config || {};
  const tData = c.data || {};

  /* Filter out future bracket matches where both players are still TBD */
  const allMatches = tData.matches || [];
  const matches = allMatches.filter(m =>
    (m.player1 && m.player1 !== 'TBD') || (m.player2 && m.player2 !== 'TBD')
  );

  /* Remap currentMatchIdx from the flat array to the filtered array */
  const currentMatchIdx = (() => {
    const orig = tData.currentMatchIdx ?? 0;
    const target = allMatches[orig];
    if (!target) return 0;
    const idx = matches.indexOf(target);
    return idx >= 0 ? idx : 0;
  })();

  /* ─── Layout mode ─── */
  const layout = c.layout || 'grid';
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
  const accentColor = c.multiColor || (isNeonLayout ? '#00ffcc' : '#facc15');
  const resultSize = c.multiSize ?? 13;
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
  const currency = c.currency || c.arenaCurrency || '€';

  /* ─── Engine helpers ─── */
  const getPlayerResult = (match, playerKey) => {
    if (!match?.rounds) return null;
    if (match.type === 'bonus_bo3') {
      let total = 0, any = false;
      for (const round of match.rounds) {
        const r = calcRoundResult(round[playerKey], match.type);
        if (r !== null) { total += r; any = true; }
      }
      return any ? total : null;
    }
    return calcRoundResult(match.rounds[0]?.[playerKey], match.type);
  };

  const fmtResult = (val) => {
    if (val === null || val === undefined) return '—';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}${currency}`;
  };

  const valColor = (val) =>
    val === null ? '#64748b' : val > 0 ? accentColor : val < 0 ? '#ef4444' : '#94a3b8';

  /* ─── Empty state ─── */
  if (matches.length === 0) {
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

  /* ═══════════════════════════════════════════════════════════════
     BO3 ROUND DOTS — small indicators for best-of-3 matches
     ═══════════════════════════════════════════════════════════════ */
  const renderBo3Dots = (match) => {
    if (match.type !== 'bonus_bo3') return null;
    const scoreboard = getBoScoreboard(match);
    if (!scoreboard) return null;
    return (
      <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 2 }}>
        {scoreboard.roundResults.map((rr, i) => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: rr.winner === 'player1' ? accentColor
              : rr.winner === 'player2' ? '#ef4444'
              : rr.winner === 'draw' ? '#eab308'
              : 'rgba(255,255,255,0.15)',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     PLAYER COLUMN — grid, showcase & neon layouts
     ═══════════════════════════════════════════════════════════════ */
  const renderPlayerCol = (match, playerKey, isEliminated, large = false) => {
    const name = match[playerKey] || 'Player';
    const pSlot = playerKey === 'player1' ? match.slot1 : match.slot2;
    const slotImage = pSlot?.image || null;
    const slotName = pSlot?.name || '';
    const result = getPlayerResult(match, playerKey);
    const op = isEliminated ? eliminatedOpacity : 1;
    const ns = large ? Math.max(nameSize, 16) : nameSize;
    const rs = large ? Math.max(resultSize, 18) : resultSize;
    const sns = large ? Math.max(slotNameSize, 13) : slotNameSize;

    /* ── Neon layout: image fills card, name stripe top, result stripe bottom ── */
    if (isNeonLayout) {
      return (
        <div className="tw-player-col" style={{
          display: 'flex', flexDirection: 'column',
          opacity: op, flex: 1, minWidth: 0, overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            position: 'relative', width: '100%', flex: 1, minHeight: 0,
            overflow: 'hidden',
          }}>
            {slotImage ? (
              <img src={slotImage} alt="" style={{
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

            {/* Result stripe — bottom */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'rgba(0,0,0,0.75)',
              padding: '3px 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 2,
            }}>
              <span style={{
                fontSize: Math.max(ns - 1, 10), fontWeight: 700,
                color: valColor(result), fontFamily, lineHeight: 1.1,
              }}>{fmtResult(result)}</span>
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

    /* ── Standard column (grid / showcase) ── */
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
          {slotImage ? (
            <img src={slotImage} alt={slotName} style={{
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
          {showSlotName && slotName && (
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
              {slotName}
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

        {/* Result */}
        <div className="tw-multi" style={{
          padding: large ? '2px 6px' : '1px 4px', textAlign: 'center',
          fontSize: `${rs}px`, fontWeight: 700,
          color: valColor(result), fontFamily, lineHeight: 1.1,
        }}>
          {fmtResult(result)}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     PLAYER ROW — vertical & minimal layouts
     ═══════════════════════════════════════════════════════════════ */
  const renderPlayerRow = (match, playerKey, isEliminated, side = 'left') => {
    const name = match[playerKey] || 'Player';
    const pSlot = playerKey === 'player1' ? match.slot1 : match.slot2;
    const slotImage = pSlot?.image || null;
    const slotName = pSlot?.name || '';
    const result = getPlayerResult(match, playerKey);
    const op = isEliminated ? eliminatedOpacity : 1;
    const isRight = side === 'right';
    const minimal = isMinimalLayout;

    return (
      <div className="tw-player-row" style={{
        display: 'flex',
        alignItems: minimal ? 'stretch' : 'center',
        gap: minimal ? 0 : 8,
        opacity: op, flex: 1, minWidth: 0,
        flexDirection: isRight ? 'row-reverse' : 'row',
      }}>
        {/* Slot thumbnail */}
        <div className="tw-slot-thumb" style={{
          position: 'relative', flexShrink: 0, overflow: 'hidden',
          ...(minimal
            ? { width: 'clamp(56px, 38%, 160px)', borderRadius: 0 }
            : { width: 'clamp(40px, 20%, 100px)', aspectRatio: '1 / 1', borderRadius: 6 }),
        }}>
          {slotImage ? (
            <img src={slotImage} alt={slotName} style={{
              width: '100%', height: '100%',
              objectFit: 'cover', display: 'block',
              borderRadius: minimal ? 0 : 6,
            }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.3)', borderRadius: minimal ? 0 : 6 }} />
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

        {/* Name + result + slot name */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: minimal ? 0 : 1,
          minWidth: 0, flex: 1,
          justifyContent: 'center',
          alignItems: isRight ? 'flex-end' : 'flex-start',
          textAlign: isRight ? 'right' : 'left',
          ...(minimal ? { padding: '2px 6px' } : {}),
        }}>
          <span style={{
            fontWeight: 700, color: nameColor, fontFamily,
            maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
            lineHeight: 1.2,
            ...(minimal
              ? { fontSize: 'clamp(11px, 2.4vw, 20px)', whiteSpace: 'nowrap' }
              : { fontSize: nameSize + 2, whiteSpace: 'nowrap' }),
          }}>{name}</span>
          {showSlotName && slotName && (
            <span style={{
              fontSize: minimal ? 'clamp(9px, 1.8vw, 15px)' : slotNameSize,
              color: slotNameColor, fontFamily,
              opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '100%', textTransform: 'uppercase', letterSpacing: '0.3px',
              lineHeight: 1.2,
            }}>{slotName}</span>
          )}
          <span style={{
            fontWeight: 700, fontFamily,
            color: valColor(result), lineHeight: 1.2,
            ...(minimal
              ? { fontSize: 'clamp(11px, 2.2vw, 18px)' }
              : { fontSize: resultSize }),
          }}>{fmtResult(result)}</span>
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
     GRID MATCH CARD — used in grid & neon layouts
     ═══════════════════════════════════════════════════════════════ */
  const renderGridMatch = (match, idx) => {
    const winner = match.winner;
    const hasWinner = winner != null;
    const p1Won = winner === 'player1';
    const isCurrentMatch = idx === currentMatchIdx && !hasWinner;

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
          {renderPlayerCol(match, 'player1', hasWinner && !p1Won)}
          {renderPlayerCol(match, 'player2', hasWinner && p1Won)}
        </div>
        {renderBo3Dots(match)}
        {renderSword(hasWinner, isCurrentMatch)}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     SHOWCASE — single match fills the widget with large images
     ═══════════════════════════════════════════════════════════════ */
  const renderShowcase = () => {
    const match = matches[currentMatchIdx] || matches[0];
    if (!match) return null;
    const hasWinner = match.winner != null;
    const p1Won = match.winner === 'player1';
    const isCurrentMatch = !hasWinner;

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: `${padding}px`, minHeight: 0 }}>
        {/* Match counter pills */}
        {matches.length > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 4,
            marginBottom: 4, flexShrink: 0,
          }}>
            {matches.map((m, i) => {
              const mDone = m.winner != null;
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

        {/* Single large match card */}
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
            {renderPlayerCol(match, 'player1', hasWinner && !p1Won, true)}
            {renderPlayerCol(match, 'player2', hasWinner && p1Won, true)}
          </div>
          {renderBo3Dots(match)}
          {renderSword(hasWinner, isCurrentMatch, Math.max(swordSize, 26))}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     VERTICAL — matches stacked, each as a horizontal row
     ═══════════════════════════════════════════════════════════════ */
  const renderVertical = () => (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: `${padding}px`, gap: `${gap}px`, minHeight: 0,
      overflow: 'hidden',
    }}>
      {matches.map((match, idx) => {
        const hasWinner = match.winner != null;
        const p1Won = match.winner === 'player1';
        const isCurrentMatch = idx === currentMatchIdx && !hasWinner;

        return (
          <div key={idx} style={{
            flex: 1, minHeight: 0,
            background: cardBg,
            border: `${cardBorderWidth}px solid ${isCurrentMatch ? swordColor : cardBorder}`,
            borderRadius: `${cardRadius}px`,
            overflow: 'hidden', position: 'relative',
            padding: isMinimalLayout ? 0 : `${Math.max(padding, 4)}px 8px`,
            display: 'flex',
            alignItems: isMinimalLayout ? 'stretch' : 'center',
            gap: isMinimalLayout ? 0 : 6,
            ...(isCurrentMatch ? { animation: 'tw-current-glow 2s ease-in-out infinite' } : {}),
          }}>
            {renderPlayerRow(match, 'player1', hasWinner && !p1Won, 'left')}

            {/* Center sword */}
            <div style={{
              position: 'relative', flexShrink: 0,
              width: swordSize + 20, height: swordSize + 20,
              alignSelf: 'center',
            }}>
              {renderSword(hasWinner, isCurrentMatch)}
            </div>

            {renderPlayerRow(match, 'player2', hasWinner && p1Won, 'right')}
          </div>
        );
      })}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
     BRACKET — all matches, header + progress bar, clean rows
     ═══════════════════════════════════════════════════════════════ */
  const renderBracket = () => {
    const stats = getTournamentStats(tData);
    const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    const title = c.title || tData.title || 'TOURNAMENT';
    const tournamentNum = c.tournamentNumber || '';
    const prize = c.prize || tData.prize || '';
    const typeLabel = matches[0] ? getTypeLabel(matches[0].type) : '';

    const accent = c.bkAccent || accentColor;
    const divider = cardBorder;
    const subText = c.bkHeaderColor || '#94a3b8';

    /* One player side in a bracket row */
    const renderBkPlayer = (match, playerKey, isEliminated, side) => {
      const name = match[playerKey] || 'Player';
      const pSlot = playerKey === 'player1' ? match.slot1 : match.slot2;
      const slotImage = pSlot?.image || null;
      const slotName = pSlot?.name || '';
      const result = getPlayerResult(match, playerKey);
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
            {slotImage ? (
              <img src={slotImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.04)' }} />
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1, textAlign: isRight ? 'right' : 'left' }}>
            {showSlotName && slotName && (
              <div style={{
                fontSize: Math.max(slotNameSize, 10), fontWeight: 700, color: slotNameColor,
                textTransform: 'uppercase', letterSpacing: '0.3px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{slotName}</div>
            )}
            <div style={{
              fontSize: nameSize, fontWeight: 600, color: nameColor, fontFamily,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{name}</div>
            <div style={{
              fontSize: resultSize, fontWeight: 700, fontFamily,
              color: valColor(result),
            }}>{fmtResult(result)}</div>
          </div>
        </div>
      );
    };

    const renderBracketMatch = (match, mIdx) => {
      const hasWinner = match.winner != null;
      const p1Won = match.winner === 'player1';
      const isCurrentMatch = mIdx === currentMatchIdx && !hasWinner;

      return (
        <div key={mIdx} style={{
          background: cardBg,
          border: `1px solid ${isCurrentMatch ? `${swordColor}55` : divider}`,
          borderRadius: cardRadius,
          padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 6,
          position: 'relative',
          transition: 'border-color 0.2s',
          ...(isCurrentMatch ? { animation: 'tw-current-glow 2s ease-in-out infinite' } : {}),
        }}>
          {renderBkPlayer(match, 'player1', hasWinner && !p1Won, 'left')}

          {/* Center VS badge */}
          <div style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <div style={{
              width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%',
              background: isCurrentMatch ? `${swordColor}20` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isCurrentMatch ? swordColor : divider}`,
              fontSize: 13, fontWeight: 800,
              color: isCurrentMatch ? swordColor : '#64748b',
            }}>
              {hasWinner ? '✕' : 'VS'}
            </div>
            {renderBo3Dots(match)}
          </div>

          {renderBkPlayer(match, 'player2', hasWinner && p1Won, 'right')}
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
            <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>{stats.completed}/{stats.total}</span>
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
          <span>👥 <strong style={{ color: nameColor }}>{matches.length}</strong> Matches</span>
          {typeLabel && <span>🏆 <strong style={{ color: nameColor }}>{typeLabel}</strong></span>}
          {prize && <span>💰 <strong style={{ color: accentColor }}>{prize}</strong></span>}
        </div>

        {/* ── Match list ── */}
        <div style={{ padding: `${padding}px`, display: 'flex', flexDirection: 'column', gap: gap + 2 }}>
          {matches.map((match, mIdx) => renderBracketMatch(match, mIdx))}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     ARENA — Battle Arena style: large fighters, VS badge, WINNER
     ═══════════════════════════════════════════════════════════════ */
  const renderArena = () => {
    const arenaAccent = c.arenaAccent || '#eab308';
    const arenaWinColor = c.arenaWinColor || '#22c55e';
    const arenaLoseOpacity = c.arenaLoseOpacity ?? 0.55;
    const arenaCardBg = c.arenaCardBg || '#1e1550';

    /* Helper: get raw round values for display (bet/cost + end/payout) */
    const getPlayerValues = (match, playerKey) => {
      const round = match?.rounds?.[0];
      const rd = round?.[playerKey];
      if (!rd) return null;
      if (match.type === 'spins') {
        const s = parseFloat(rd.startBalance), e = parseFloat(rd.endBalance);
        return { val1: isNaN(s) ? null : s, val2: isNaN(e) ? null : e };
      }
      const cost = parseFloat(rd.bonusCost), pay = parseFloat(rd.bonusPayout);
      return { val1: isNaN(cost) ? null : cost, val2: isNaN(pay) ? null : pay };
    };

    const renderArenaFighter = (match, playerKey, isWinner, isLoser) => {
      const name = match[playerKey] || 'Fighter';
      const pSlot = playerKey === 'player1' ? match.slot1 : match.slot2;
      const slotImage = pSlot?.image || null;
      const result = getPlayerResult(match, playerKey);
      const vals = getPlayerValues(match, playerKey);

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
              position: 'absolute', top: 8,
              left: playerKey === 'player1' ? 'auto' : 8,
              right: playerKey === 'player1' ? 8 : 'auto',
              background: arenaWinColor, color: '#fff', fontWeight: 800,
              fontSize: 11, padding: '3px 10px', borderRadius: 4,
              textTransform: 'uppercase', letterSpacing: '0.8px', zIndex: 3,
              boxShadow: `0 2px 8px ${arenaWinColor}60`,
            }}>WINNER</div>
          )}
          {isWinner && (
            <div style={{
              position: 'absolute', top: 6,
              left: playerKey === 'player1' ? 8 : 'auto',
              right: playerKey === 'player1' ? 'auto' : 8,
              fontSize: 18, zIndex: 3,
            }}>🏆</div>
          )}

          {/* Player name — black stripe at top */}
          <div style={{
            background: 'rgba(0,0,0,0.88)', padding: '4px 10px',
            fontSize: 12, fontWeight: 700, fontStyle: 'italic',
            color: '#fff', fontFamily, letterSpacing: '0.3px',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            flexShrink: 0, zIndex: 2,
          }}>{name}</div>

          {/* Fighter image — shows full image, no cropping */}
          <div style={{
            flex: 1, position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.15)',
          }}>
            {slotImage ? (
              <img src={slotImage} alt={name} style={{
                width: '100%', height: '100%',
                objectFit: 'cover', display: 'block',
              }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'rgba(255,255,255,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, color: 'rgba(255,255,255,0.1)',
              }}>⚔</div>
            )}

            {/* Result overlay — on the image */}
            {result !== null && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0,0,0,0.75)', padding: '3px 12px',
                borderRadius: 6, zIndex: 2,
              }}>
                <span style={{
                  fontSize: 14, fontWeight: 800,
                  color: isWinner ? arenaWinColor : valColor(result), fontFamily,
                }}>{fmtResult(result)}</span>
              </div>
            )}
          </div>

          {/* Bottom bar — bet/cost + end/payout values */}
          <div style={{
            display: 'flex', background: '#000',
            borderTop: '2px solid rgba(255,255,255,0.08)',
            minHeight: 22, flexShrink: 0,
          }}>
            {vals && vals.val1 !== null ? (
              <div style={{
                flex: 1, padding: '3px 4px', textAlign: 'center',
                fontSize: 11, fontWeight: 700,
                color: '#93c5fd', fontFamily,
              }}>{currency}{vals.val1.toFixed(2)}</div>
            ) : (
              <div style={{ flex: 1, padding: '3px 4px', textAlign: 'center',
                fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.25)', fontFamily }}>—</div>
            )}
            {vals && vals.val2 !== null ? (
              <div style={{
                flex: 1, padding: '3px 4px', textAlign: 'center',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
                fontSize: 11, fontWeight: 700,
                color: '#4ade80', fontFamily,
              }}>{currency}{vals.val2.toFixed(2)}</div>
            ) : (
              <div style={{ flex: 1, padding: '3px 4px', textAlign: 'center',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
                fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.25)', fontFamily }}>—</div>
            )}
          </div>
        </div>
      );
    };

    const renderArenaMatch = (match, idx) => {
      const hasWinner = match.winner != null;
      const p1Won = match.winner === 'player1';
      const p2Won = match.winner === 'player2';
      const isCurrentMatch = idx === currentMatchIdx && !hasWinner;

      return (
        <div key={idx} style={{
          display: 'flex', alignItems: 'stretch', gap: 0,
          position: 'relative', minHeight: 160,
          borderRadius: `${cardRadius}px`,
          border: isCurrentMatch ? `2px solid ${arenaAccent}88` : '2px solid transparent',
          ...(isCurrentMatch ? { animation: 'tw-current-glow 2s ease-in-out infinite' } : {}),
        }}>
          <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
            {renderArenaFighter(match, 'player1', p1Won, hasWinner && !p1Won)}
          </div>

          {/* VS badge — spins on current match */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 42, height: 42, borderRadius: '50%', zIndex: 10,
            background: `linear-gradient(135deg, ${arenaAccent}, ${arenaAccent}cc)`,
            border: '3px solid rgba(0,0,0,0.5)',
            boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 12px ${arenaAccent}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900, color: '#000', letterSpacing: '0.5px',
            ...(isCurrentMatch ? { animation: 'tw-vs-spin 3s linear infinite' } : {}),
          }}>VS</div>

          <div style={{ flex: 1, display: 'flex', minWidth: 0, marginLeft: 4 }}>
            {renderArenaFighter(match, 'player2', p2Won, hasWinner && !p2Won)}
          </div>
        </div>
      );
    };

    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'auto', fontFamily,
      }}>
        {/* Match rows — reduced vertical gap */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          gap: 2, padding: `2px ${padding + 2}px ${padding}px`,
          overflow: 'auto',
        }}>
          {matches.map((match, idx) => renderArenaMatch(match, idx))}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     FUTURISTIC — Sci-fi split layout: current match + upcoming
     ═══════════════════════════════════════════════════════════════ */
  const renderFuturistic = () => {
    const ftAccent = c.ftAccent || '#eab308';
    const ftCyan   = c.ftCyan   || '#00d4ff';
    const ftBg     = c.ftBg     || '#0a1628';
    const ftCardBg = c.ftCardBg || '#0f1f3a';
    const ftBorder = c.ftBorder || 'rgba(0,212,255,0.25)';
    const ftFont   = fontFamily;

    const currentMatch = matches[currentMatchIdx] || matches[0];
    const upcomingMatches = matches.filter((m, i) => i !== currentMatchIdx && m.winner == null);

    /* ── Player card ── */
    const renderFtPlayer = (match, playerKey, large = false) => {
      const name = match[playerKey] || 'TBD';
      const pSlot = playerKey === 'player1' ? match.slot1 : match.slot2;
      const slotImage = pSlot?.image || null;
      const hasWinner = match.winner != null;
      const isWinner = match.winner === playerKey;
      const isElim = hasWinner && !isWinner;

      const round = match?.rounds?.[0];
      const rd = round?.[playerKey];
      let costVal = null, payVal = null;
      if (rd) {
        if (match.type === 'spins') {
          const s = parseFloat(rd.startBalance), e = parseFloat(rd.endBalance);
          costVal = isNaN(s) ? null : s;
          payVal = isNaN(e) ? null : e;
        } else {
          const cost = parseFloat(rd.bonusCost), pay = parseFloat(rd.bonusPayout);
          costVal = isNaN(cost) ? null : cost;
          payVal = isNaN(pay) ? null : pay;
        }
      }

      const nameFs = large ? '3.2vw' : '2.2vw';
      const statFs = large ? '1.8vw' : '1.4vw';
      const labelFs = large ? '1.3vw' : '1.1vw';

      return (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
          background: ftCardBg,
          border: `2px solid ${isWinner ? ftAccent : ftBorder}`,
          borderRadius: '1.2%',
          overflow: 'hidden',
          opacity: isElim ? 0.45 : 1,
          ...(isWinner ? { boxShadow: `0 0 16px ${ftAccent}30` } : {}),
        }}>
          {/* Player name header */}
          <div style={{
            padding: '0.5vh 1vw',
            background: 'rgba(0,0,0,0.55)',
            borderBottom: `1px solid ${ftBorder}`,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: nameFs, fontWeight: 800, fontFamily: ftFont,
              color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{name}</div>
          </div>

          {/* Slot image — takes all available space */}
          <div style={{
            flex: 1, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.2)',
          }}>
            {slotImage ? (
              <img src={slotImage} alt={name} style={{
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: `linear-gradient(135deg, ${ftCardBg}, rgba(0,212,255,0.05))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '3vw', color: 'rgba(255,255,255,0.08)',
              }}>⚔</div>
            )}
          </div>

          {/* Cost / Payment stats */}
          <div style={{
            display: 'flex', borderTop: `1px solid ${ftBorder}`,
            background: 'rgba(0,0,0,0.5)',
          }}>
            <div style={{ flex: 1, textAlign: 'center', padding: '0.4vh 0.5vw' }}>
              <div style={{ fontSize: labelFs, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: ftFont }}>Cost</div>
              <div style={{ fontSize: statFs, fontWeight: 700, color: ftCyan, fontFamily: ftFont }}>
                {costVal !== null ? `${currency}${costVal.toFixed(0)}` : '—'}
              </div>
            </div>
            <div style={{ width: 1, background: ftBorder }} />
            <div style={{ flex: 1, textAlign: 'center', padding: '0.4vh 0.5vw' }}>
              <div style={{ fontSize: labelFs, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: ftFont }}>Payment</div>
              <div style={{ fontSize: statFs, fontWeight: 700, color: '#4ade80', fontFamily: ftFont }}>
                {payVal !== null ? `${currency}${payVal.toFixed(0)}` : '—'}
              </div>
            </div>
          </div>
        </div>
      );
    };

    /* ── VS Badge ── */
    const renderFtVs = (large = false) => {
      const sz = large ? '5.5vw' : '3.5vw';
      return (
        <div style={{
          width: sz, height: sz,
          borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${ftAccent}, ${ftAccent}cc)`,
          border: '2px solid rgba(0,0,0,0.5)',
          boxShadow: `0 4px 12px rgba(0,0,0,0.5), 0 0 10px ${ftAccent}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: large ? '2.4vw' : '1.6vw',
          fontWeight: 900, color: '#000', letterSpacing: '0.5px',
          fontFamily: ftFont, alignSelf: 'center',
        }}>VS</div>
      );
    };

    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', fontFamily: ftFont,
        background: ftBg,
        padding: '1vw',
        gap: '1vw',
      }}>
        {/* ── Current Match (large) ── */}
        {currentMatch && (
          <div style={{
            flex: 3, display: 'flex', flexDirection: 'column',
            gap: '0.6vh', minHeight: 0,
          }}>
            {/* Player cards */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'stretch',
              gap: '1vw', minHeight: 0,
            }}>
              {renderFtPlayer(currentMatch, 'player1', true)}
              {renderFtVs(true)}
              {renderFtPlayer(currentMatch, 'player2', true)}
            </div>

            {/* PLAYING NOW badge */}
            <div style={{
              padding: '0.5vh 1vw', borderRadius: 4,
              background: `linear-gradient(135deg, ${ftAccent}, #ca8a04)`,
              textAlign: 'center', flexShrink: 0,
            }}>
              <span style={{
                fontSize: '1.8vw', fontWeight: 900,
                color: '#000', textTransform: 'uppercase', letterSpacing: '2px',
                fontFamily: ftFont,
              }}>PLAYING NOW</span>
            </div>
          </div>
        )}

        {/* ── Upcoming matches ── */}
        {upcomingMatches.length > 0 && upcomingMatches.map((m, i) => (
          <div key={i} style={{
            flex: 1, display: 'flex', alignItems: 'stretch',
            gap: '0.5vw', minHeight: 0,
          }}>
            {renderFtPlayer(m, 'player1', false)}
            {renderFtVs(false)}
            {renderFtPlayer(m, 'player2', false)}
          </div>
        ))}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     ESPORTS — Cyberpunk 3D glass panels, bracket grid + current match
     ═══════════════════════════════════════════════════════════════ */
  const renderEsports = () => {
    const esCyan   = c.esCyan   || '#00e5ff';
    const esPurple = c.esPurple || '#a855f7';
    const esGold   = c.esGold   || '#fbbf24';
    const esBg     = c.esBg     || '#030712';
    const esCardBg = c.esCardBg || 'rgba(15,23,42,0.75)';
    const esBorder = c.esBorder || 'rgba(0,229,255,0.18)';
    const esFont   = fontFamily;

    const currentMatch = matches[currentMatchIdx] || matches[0];
    const overviewMatches = matches.filter((_, i) => i !== currentMatchIdx);

    /* Get cost/payment for a player */
    const getVals = (match, pKey) => {
      const rd = match?.rounds?.[0]?.[pKey];
      if (!rd) return { cost: null, pay: null };
      if (match.type === 'spins') {
        const s = parseFloat(rd.startBalance), e = parseFloat(rd.endBalance);
        return { cost: isNaN(s) ? null : s, pay: isNaN(e) ? null : e };
      }
      const cost = parseFloat(rd.bonusCost), pay = parseFloat(rd.bonusPayout);
      return { cost: isNaN(cost) ? null : cost, pay: isNaN(pay) ? null : pay };
    };

    /* ── 3D Glass Player Card ── */
    const renderEsCard = (match, playerKey, large = false) => {
      const name = match[playerKey] || 'TBD';
      const pSlot = playerKey === 'player1' ? match.slot1 : match.slot2;
      const slotImage = pSlot?.image || null;
      const result = getPlayerResult(match, playerKey);
      const hasWinner = match.winner != null;
      const isWinner = match.winner === playerKey;
      const isLoser = hasWinner && !isWinner;
      const vals = getVals(match, playerKey);

      const cardW = large ? '100%' : '100%';
      const imgH = large ? 'clamp(60px, 22vh, 160px)' : 'clamp(30px, 12vh, 70px)';
      const nameFs = large ? 'clamp(13px, 2.5vw, 22px)' : 'clamp(8px, 1.4vw, 13px)';
      const statFs = large ? 'clamp(10px, 1.4vw, 14px)' : 'clamp(7px, 1vw, 10px)';
      const labelFs = large ? 'clamp(7px, 0.9vw, 10px)' : 'clamp(6px, 0.7vw, 8px)';

      /* Glow color based on state */
      const glowColor = isWinner ? esGold : isLoser ? 'transparent' : esCyan;
      const borderGlow = isWinner ? esGold : esBorder;

      return (
        <div style={{
          width: cardW, display: 'flex', flexDirection: 'column',
          background: esCardBg,
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${borderGlow}`,
          borderRadius: large ? 14 : 8,
          overflow: 'hidden',
          transform: isLoser
            ? 'perspective(600px) rotateX(12deg) scale(0.92)'
            : isWinner
              ? 'perspective(600px) rotateY(0deg) scale(1.03)'
              : 'perspective(600px) rotateY(0deg)',
          opacity: isLoser ? 0.4 : 1,
          transition: 'transform 0.8s cubic-bezier(0.23,1,0.32,1), opacity 0.6s, box-shadow 0.6s, border-color 0.4s',
          boxShadow: isWinner
            ? `0 0 24px ${esGold}50, 0 0 60px ${esGold}18, inset 0 0 20px ${esGold}08`
            : `0 4px 20px rgba(0,0,0,0.5), 0 0 12px ${esCyan}10`,
          position: 'relative',
        }}>
          {/* Winner crown badge */}
          {isWinner && (
            <div style={{
              position: 'absolute', top: 4, right: 4, zIndex: 5,
              fontSize: large ? 20 : 14,
            }}>🏆</div>
          )}

          {/* Player image */}
          <div style={{
            width: '100%', height: imgH, position: 'relative',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {slotImage ? (
              <img src={slotImage} alt={name} style={{
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: `linear-gradient(135deg, ${esBg}, rgba(0,229,255,0.05))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: large ? 28 : 16, color: 'rgba(255,255,255,0.06)',
              }}>⚔</div>
            )}

            {/* Result overlay on image */}
            {result !== null && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                padding: large ? '8px 6px 4px' : '4px 4px 2px',
                textAlign: 'center',
              }}>
                <span style={{
                  fontSize: large ? 'clamp(16px, 2.5vw, 28px)' : 'clamp(10px, 1.6vw, 16px)',
                  fontWeight: 900, fontFamily: esFont,
                  color: valColor(result),
                  textShadow: `0 0 10px ${valColor(result)}60`,
                }}>{fmtResult(result)}</span>
              </div>
            )}
          </div>

          {/* Player name */}
          <div style={{
            padding: large ? '6px 8px 3px' : '3px 5px 1px',
            textAlign: 'center',
            background: 'rgba(0,0,0,0.4)',
            borderBottom: `1px solid ${esBorder}`,
          }}>
            <div style={{
              fontSize: nameFs, fontWeight: 800, fontFamily: esFont,
              color: '#fff', textTransform: 'uppercase', letterSpacing: '0.8px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              textShadow: `0 0 8px ${esCyan}30`,
            }}>{name}</div>
          </div>

          {/* Stats: Cost + Payment */}
          <div style={{
            display: 'flex', background: 'rgba(0,0,0,0.5)',
          }}>
            <div style={{ flex: 1, textAlign: 'center', padding: large ? '4px 3px' : '2px 2px' }}>
              <div style={{
                fontSize: labelFs, fontWeight: 600, color: '#475569',
                textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: esFont,
              }}>Cost</div>
              <div style={{
                fontSize: statFs, fontWeight: 700, color: esCyan, fontFamily: esFont,
              }}>{vals.cost !== null ? `${currency}${vals.cost.toFixed(0)}` : '—'}</div>
            </div>
            <div style={{ width: 1, background: esBorder }} />
            <div style={{ flex: 1, textAlign: 'center', padding: large ? '4px 3px' : '2px 2px' }}>
              <div style={{
                fontSize: labelFs, fontWeight: 600, color: '#475569',
                textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: esFont,
              }}>Payment</div>
              <div style={{
                fontSize: statFs, fontWeight: 700, color: '#4ade80', fontFamily: esFont,
              }}>{vals.pay !== null ? `${currency}${vals.pay.toFixed(0)}` : '—'}</div>
            </div>
          </div>
        </div>
      );
    };

    /* ── VS badge ── */
    const renderEsVs = (large = false) => {
      const sz = large ? 'clamp(30px, 4.5vw, 52px)' : 'clamp(18px, 2.5vw, 30px)';
      const isCurrent = large;
      return (
        <div style={{
          width: sz, height: sz, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${esPurple}, ${esCyan})`,
          border: '2px solid rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: large ? 'clamp(12px, 1.8vw, 20px)' : 'clamp(8px, 1.2vw, 13px)',
          fontWeight: 900, color: '#fff', fontFamily: esFont,
          boxShadow: `0 0 16px ${esPurple}40, 0 0 8px ${esCyan}30`,
          alignSelf: 'center',
          ...(isCurrent ? { animation: 'es-vs-pulse 2s ease-in-out infinite' } : {}),
        }}>VS</div>
      );
    };

    /* ── Overview match (small, in grid) ── */
    const renderEsOverviewMatch = (match, idx) => {
      const hasWinner = match.winner != null;
      const globalIdx = matches.indexOf(match);
      const isCurrent = globalIdx === currentMatchIdx;

      return (
        <div key={idx} style={{
          display: 'flex', alignItems: 'stretch', gap: 'clamp(3px, 0.5vw, 8px)',
          background: 'rgba(0,0,0,0.3)',
          border: `1px solid ${isCurrent ? esCyan : esBorder}`,
          borderRadius: 10, padding: 'clamp(4px, 0.6vw, 8px)',
          position: 'relative', overflow: 'hidden',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          transition: 'border-color 0.3s',
        }}>
          {/* Match number label */}
          <div style={{
            position: 'absolute', top: 3, left: '50%', transform: 'translateX(-50%)',
            fontSize: 'clamp(6px, 0.7vw, 9px)', fontWeight: 700, fontFamily: esFont,
            color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', zIndex: 2,
          }}>Match {globalIdx + 1}</div>

          {/* Status badge */}
          {hasWinner && (
            <div style={{
              position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
              fontSize: 'clamp(6px, 0.7vw, 8px)', fontWeight: 700, fontFamily: esFont,
              color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px',
              background: 'rgba(34,197,94,0.12)', padding: '1px 6px', borderRadius: 3,
              border: '1px solid rgba(34,197,94,0.25)', zIndex: 2,
            }}>Done</div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            {renderEsCard(match, 'player1', false)}
          </div>
          {renderEsVs(false)}
          <div style={{ flex: 1, minWidth: 0 }}>
            {renderEsCard(match, 'player2', false)}
          </div>
        </div>
      );
    };

    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', fontFamily: esFont,
        background: esBg, perspective: '1200px',
      }}>
        {/* ── Bracket overview grid (2 cols) ── */}
        <div style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'clamp(3px, 0.5vw, 8px)',
          padding: 'clamp(3px, 0.5vw, 8px)',
          minHeight: 0, overflow: 'hidden',
        }}>
          {overviewMatches.map((m, i) => renderEsOverviewMatch(m, i))}
        </div>

        {/* ── Energy divider line ── */}
        <div style={{
          height: 2, flexShrink: 0, position: 'relative',
          background: `linear-gradient(90deg, transparent, ${esCyan}60, ${esPurple}60, transparent)`,
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '30%', height: '100%',
            background: `linear-gradient(90deg, transparent, ${esCyan}, transparent)`,
            animation: 'es-energy-line 2.5s linear infinite',
          }} />
        </div>

        {/* ── Current match (large, bottom) ── */}
        {currentMatch && (
          <div style={{
            flexShrink: 0, padding: 'clamp(4px, 0.8vw, 12px)',
            position: 'relative',
          }}>
            {/* Pulsing bg glow */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0,
              background: `radial-gradient(ellipse at center, ${esPurple}12, transparent 70%)`,
              animation: 'es-bg-pulse 3s ease-in-out infinite',
            }} />

            {/* "NOW PLAYING" header */}
            <div style={{
              textAlign: 'center', marginBottom: 'clamp(2px, 0.4vh, 6px)',
              position: 'relative', zIndex: 1,
            }}>
              <span style={{
                fontSize: 'clamp(8px, 1.2vw, 14px)', fontWeight: 800,
                color: esGold, textTransform: 'uppercase', letterSpacing: '3px',
                fontFamily: esFont,
                textShadow: `0 0 12px ${esGold}50`,
                animation: 'es-text-glow 2s ease-in-out infinite',
              }}>⚡ Now Playing ⚡</span>
            </div>

            {/* Match cards */}
            <div style={{
              display: 'flex', alignItems: 'stretch',
              gap: 'clamp(6px, 1vw, 16px)',
              position: 'relative', zIndex: 1,
            }}>
              <div style={{
                flex: 1, minWidth: 0,
                animation: 'es-card-enter-left 0.8s cubic-bezier(0.23,1,0.32,1)',
              }}>
                {renderEsCard(currentMatch, 'player1', true)}
              </div>

              {/* Center: VS + energy connection */}
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 4,
                position: 'relative',
              }}>
                {/* Energy line top */}
                <div style={{
                  width: 2, flex: 1, minHeight: 4,
                  background: `linear-gradient(to bottom, transparent, ${esPurple}80)`,
                }} />
                {renderEsVs(true)}
                {/* Energy line bottom */}
                <div style={{
                  width: 2, flex: 1, minHeight: 4,
                  background: `linear-gradient(to top, transparent, ${esCyan}80)`,
                }} />
              </div>

              <div style={{
                flex: 1, minWidth: 0,
                animation: 'es-card-enter-right 0.8s cubic-bezier(0.23,1,0.32,1)',
              }}>
                {renderEsCard(currentMatch, 'player2', true)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     GRID — 2-column card grid (or 1 col for neon / single match)
     ═══════════════════════════════════════════════════════════════ */
  const renderGrid = () => {
    const matchCount = matches.length;
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
        {matches.map((match, idx) => renderGridMatch(match, idx))}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     MAIN RETURN
     ═══════════════════════════════════════════════════════════════ */
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
        @keyframes tw-vs-spin {
          0%   { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes es-vs-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 16px rgba(168,85,247,0.4); }
          50%      { transform: scale(1.12); box-shadow: 0 0 28px rgba(168,85,247,0.6), 0 0 12px rgba(0,229,255,0.4); }
        }
        @keyframes es-energy-line {
          0%   { left: -30%; }
          100% { left: 100%; }
        }
        @keyframes es-bg-pulse {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 0.8; }
        }
        @keyframes es-text-glow {
          0%, 100% { text-shadow: 0 0 12px rgba(251,191,36,0.3); }
          50%      { text-shadow: 0 0 20px rgba(251,191,36,0.6), 0 0 40px rgba(251,191,36,0.2); }
        }
        @keyframes es-card-enter-left {
          0%   { opacity: 0; transform: translateX(-30px) perspective(600px) rotateY(8deg); }
          100% { opacity: 1; transform: translateX(0) perspective(600px) rotateY(0deg); }
        }
        @keyframes es-card-enter-right {
          0%   { opacity: 0; transform: translateX(30px) perspective(600px) rotateY(-8deg); }
          100% { opacity: 1; transform: translateX(0) perspective(600px) rotateY(0deg); }
        }
      `}</style>

      {/* ── Layout-specific content ── */}
      {layout === 'esports' ? renderEsports()
        : layout === 'futuristic' ? renderFuturistic()
        : layout === 'arena' ? renderArena()
        : layout === 'bracket' ? renderBracket()
        : layout === 'showcase' ? renderShowcase()
        : (layout === 'vertical' || layout === 'minimal') ? renderVertical()
        : renderGrid()}
    </div>
  );
}

export default React.memo(TournamentWidget);
