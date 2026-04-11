import React from 'react';
import {
  calcRoundResult,
  calcRoundMultiplier,
  calcMatchWinner,
  getBoScoreboard,
  getTournamentStats,
  getTypeLabel,
  MATCH_STATUS,
} from './tournament/tournamentEngine';
import ShatterEffect from './tournament/ShatterEffect';

/**
 * TournamentWidget — OBS overlay display for the unified tournament engine.
 * Reads match data from config.data (tournament blob created by TournamentConfig).
 *
 * Four layout modes:
 *   vertical  → matches stacked top-to-bottom, horizontal rows
 *   minimal   → compact vertical rows (same renderer as vertical)
 *   arena     → Battle Arena style: large fighters, VS badge, WINNER
 *   esports   → Cyberpunk 3D glass panels, bracket grid + current match
 */
function TournamentWidget({ config, theme }) {
  const c = config || {};
  const tData = c.data || {};

  /* Filter out future bracket matches where both players are still TBD */
  const allMatches = tData.matches || [];
  const matches = allMatches.filter(m =>
    (m.player1 && m.player1 !== 'TBD') || (m.player2 && m.player2 !== 'TBD')
  );

  /* Prefer the first in-progress match; fall back to stored index */
  const currentMatchIdx = (() => {
    const ipIdx = matches.findIndex(m => m.status === 'in_progress');
    if (ipIdx >= 0) return ipIdx;
    const orig = tData.currentMatchIdx ?? 0;
    const target = allMatches[orig];
    if (!target) return 0;
    const idx = matches.indexOf(target);
    return idx >= 0 ? idx : 0;
  })();

  /* ─── Shatter effect: detect newly completed matches ─── */
  const [shatterInfo, setShatterInfo] = React.useState(null);
  const prevWinnersRef = React.useRef('');
  /* Keep the just-finished match index visible during shatter animation */
  const [shatterMatchIdx, setShatterMatchIdx] = React.useState(null);

  const winnersKey = allMatches.map(m => m.winner || '-').join('|');
  React.useLayoutEffect(() => {
    const prev = prevWinnersRef.current;
    prevWinnersRef.current = winnersKey;
    if (!prev) return; // first render — skip
    const prevArr = prev.split('|');
    const currArr = winnersKey.split('|');
    for (let i = 0; i < currArr.length; i++) {
      if (currArr[i] !== '-' && prevArr[i] === '-') {
        const m = allMatches[i];
        if (!m) continue;
        const loserKey = m.winner === 'player1' ? 'player2' : 'player1';
        const loserSlot = loserKey === 'player1' ? m.slot1 : m.slot2;
        setShatterMatchIdx(i);
        setShatterInfo(old => old ? old : {
          imageUrl: loserSlot?.image || null,
          side: loserKey === 'player1' ? 'left' : 'right',
        });
        break;
      }
    }
  }, [winnersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Layout mode ─── */
  const layout = c.layout || 'esports';
  const isMinimalLayout = layout === 'minimal';
  const isArenaLayout = layout === 'arena';

  /* ─── Flipper tick for "Now Playing" header rotation (every 15s) ─── */
  const [flipperTick, setFlipperTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setFlipperTick(t => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  /* ─── Style config ─── */
  const showBg = c.showBg !== false;
  const bgColor = showBg ? (c.bgColor || (isArenaLayout ? '#1a1040' : isMinimalLayout ? '#0a0a10' : '#13151e')) : 'transparent';
  const cardBg = c.cardBg || (isMinimalLayout ? 'rgba(255,255,255,0.03)' : '#1a1d2e');
  const cardBorder = c.cardBorder || (isMinimalLayout ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)');
  const cardRadius = c.cardRadius ?? (isMinimalLayout ? 4 : 10);
  const cardBorderWidth = c.cardBorderWidth ?? 1;
  const nameColor = c.nameColor || '#ffffff';
  const nameSize = c.nameSize ?? (isMinimalLayout ? 11 : 12);
  const accentColor = c.multiColor || '#facc15';
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
  const swordColor = c.swordColor || '#eab308';
  const swordBg = c.swordBg || 'rgba(0,0,0,0.85)';
  const swordSize = c.swordSize ?? 20;
  const xIconColor = c.xIconColor || '#eab308';
  const xIconBg = c.xIconBg || 'rgba(0,0,0,0.7)';
  const currency = c.currency || c.arenaCurrency || '€';

  /* ─── Engine helpers ─── */
  const getPlayerResult = (match, playerKey) => {
    if (!match?.rounds) return null;
    if (match.type === 'bonus_bo3_classic') {
      let total = 0, any = false;
      for (const round of match.rounds) {
        const r = calcRoundMultiplier(round[playerKey]);
        if (r !== null) { total += r; any = true; }
      }
      return any ? total : null;
    }
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

  const fmtResult = (val, match) => {
    if (val === null || val === undefined) return '—';
    if (match?.type === 'bonus_bo3_classic') return `${val.toFixed(2)}x`;
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}${currency}`;
  };

  const valColor = (val, match) =>
    val === null ? '#64748b'
    : match?.type === 'bonus_bo3_classic' ? (val >= 3 ? accentColor : val < 3 ? '#ef4444' : '#94a3b8')
    : val > 0 ? accentColor : val < 0 ? '#ef4444' : '#94a3b8';

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
    if (match.type !== 'bonus_bo3' && match.type !== 'bonus_bo3_classic') return null;
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
              ? { fontSize: 'clamp(13px, 2.4vw, 20px)', whiteSpace: 'nowrap' }
              : { fontSize: nameSize + 2, whiteSpace: 'nowrap' }),
          }}>{name}</span>
          {match.activePlayer === playerKey && !match.winner && (
            <span style={{
              fontSize: minimal ? 'clamp(8px, 1.2vw, 10px)' : 8,
              fontWeight: 800, color: '#818cf8', fontFamily,
              letterSpacing: '0.5px', lineHeight: 1,
            }}>▶ PLAYING</span>
          )}
          {showSlotName && slotName && (
            <span style={{
              fontSize: minimal ? 'clamp(11px, 1.8vw, 15px)' : slotNameSize,
              color: slotNameColor, fontFamily,
              opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '100%', textTransform: 'uppercase', letterSpacing: '0.3px',
              lineHeight: 1.2,
            }}>{slotName}</span>
          )}
          <span style={{
            fontWeight: 700, fontFamily,
            color: valColor(result, match), lineHeight: 1.2,
            ...(minimal
              ? { fontSize: 'clamp(13px, 2.2vw, 18px)' }
              : { fontSize: resultSize }),
          }}>{fmtResult(result, match)}</span>
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
              fontSize: 13, padding: '3px 10px', borderRadius: 4,
              textTransform: 'uppercase', letterSpacing: '0.8px', zIndex: 3,
              boxShadow: `0 2px 8px ${arenaWinColor}60`,
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
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
            fontSize: 14, fontWeight: 700, fontStyle: 'italic',
            color: '#fff', fontFamily, letterSpacing: '0.3px',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            flexShrink: 0, zIndex: 2,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {name}
            {match.activePlayer === playerKey && !match.winner && (
              <span style={{ fontSize: 8, fontWeight: 800, color: '#818cf8', fontStyle: 'normal', letterSpacing: '0.5px' }}>▶ PLAYING</span>
            )}
          </div>

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
                  fontSize: 15, fontWeight: 800,
                  color: isWinner ? arenaWinColor : valColor(result, match), fontFamily,
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                }}>{fmtResult(result, match)}</span>
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
                fontSize: 13, fontWeight: 700,
                color: '#93c5fd', fontFamily,
              }}>{currency}{vals.val1.toFixed(2)}</div>
            ) : (
              <div style={{ flex: 1, padding: '3px 4px', textAlign: 'center',
                fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.25)', fontFamily }}>—</div>
            )}
            {vals && vals.val2 !== null ? (
              <div style={{
                flex: 1, padding: '3px 4px', textAlign: 'center',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
                fontSize: 13, fontWeight: 700,
                color: '#4ade80', fontFamily,
              }}>{currency}{vals.val2.toFixed(2)}</div>
            ) : (
              <div style={{ flex: 1, padding: '3px 4px', textAlign: 'center',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
                fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.25)', fontFamily }}>—</div>
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

    /* While the shatter animation plays, keep the just-finished match
       in the Now Playing slot so the loser card visually shatters first,
       THEN the winner slides to the done list. */
    const isShatterHolding = shatterMatchIdx != null && shatterInfo;
    const currentMatch = isShatterHolding
      ? (allMatches[shatterMatchIdx] || matches[currentMatchIdx] || matches[0])
      : (matches[currentMatchIdx] || matches[0]);
    const otherMatches = matches.filter((_, i) => i !== currentMatchIdx);
    const queuedMatches = otherMatches.filter(m => m.winner == null);
    const doneMatches = isShatterHolding
      ? otherMatches.filter(m => m.winner != null && m !== allMatches[shatterMatchIdx])
      : otherMatches.filter(m => m.winner != null);

    /* Get cost/payment for a player (Bo3 sums all rounds) */
    const getVals = (match, pKey) => {
      if (!match?.rounds) return { cost: null, pay: null };
      if (match.type === 'bonus_bo3' || match.type === 'bonus_bo3_classic') {
        let totalCost = 0, totalPay = 0, any = false;
        for (const round of match.rounds) {
          const rd = round[pKey];
          if (!rd) continue;
          const c2 = parseFloat(rd.bonusCost), p2 = parseFloat(rd.bonusPayout);
          if (!isNaN(c2)) { totalCost += c2; any = true; }
          if (!isNaN(p2)) { totalPay += p2; any = true; }
        }
        return any ? { cost: totalCost, pay: totalPay } : { cost: null, pay: null };
      }
      const rd = match?.rounds?.[0]?.[pKey];
      if (!rd) return { cost: null, pay: null };
      if (match.type === 'spins') {
        const s = parseFloat(rd.startBalance), e = parseFloat(rd.endBalance);
        return { cost: isNaN(s) ? null : s, pay: isNaN(e) ? null : e };
      }
      const cost = parseFloat(rd.bonusCost), pay = parseFloat(rd.bonusPayout);
      return { cost: isNaN(cost) ? null : cost, pay: isNaN(pay) ? null : pay };
    };

    const esGreen = '#39ff14';
    const esRed   = '#ff3b5c';

    /* Bo3 pip system for esports */
    const renderEsPips = (match, playerKey) => {
      if (match.type !== 'bonus_bo3' && match.type !== 'bonus_bo3_classic') return null;
      const scoreboard = getBoScoreboard(match);
      if (!scoreboard) return null;
      return (
        <div style={{
          display: 'flex', gap: 'clamp(3px, 0.5vw, 5px)',
          justifyContent: 'center', marginTop: 2,
        }}>
          {scoreboard.roundResults.map((rr, i) => {
            const won = rr.winner === playerKey;
            const lost = rr.winner && rr.winner !== playerKey && rr.winner !== 'draw';
            const draw = rr.winner === 'draw';
            const played = rr.winner != null;
            return (
              <div key={i} style={{
                width: 'clamp(7px, 1vw, 10px)', height: 'clamp(7px, 1vw, 10px)',
                borderRadius: '50%',
                background: won ? esGreen : lost ? esRed : draw ? esGold : 'rgba(255,255,255,0.12)',
                boxShadow: won ? `0 0 6px ${esGreen}80` : lost ? `0 0 4px ${esRed}60` : 'none',
                border: played ? 'none' : '1px solid rgba(255,255,255,0.15)',
                transition: 'all 0.4s ease',
              }} />
            );
          })}
        </div>
      );
    };

    /* ── Player Card — image fills card, neon glow, pips, stats ── */
    const renderEsCard = (match, playerKey, large = false) => {
      const name = match[playerKey] || 'TBD';
      const pSlot = playerKey === 'player1' ? match.slot1 : match.slot2;
      const slotImage = pSlot?.image || null;
      const result = getPlayerResult(match, playerKey);
      const hasWinner = match.winner != null;
      const isWinner = match.winner === playerKey;
      const isLoser = hasWinner && !isWinner;
      const vals = getVals(match, playerKey);

      const nameFs = large ? 'clamp(12px, 1.8vw, 16px)' : 'clamp(10px, 1.4vw, 13px)';
      const statFs = large ? 'clamp(12px, 1.4vw, 14px)' : 'clamp(10px, 1.1vw, 12px)';
      const labelFs = large ? 'clamp(7px, 0.7vw, 9px)' : 'clamp(6px, 0.6vw, 8px)';
      const borderGlow = isWinner ? esGreen : isLoser ? esRed : esBorder;

      return (
        <div style={{
          width: '100%', height: '100%', position: 'relative',
          display: 'flex', flexDirection: 'column',
          border: `2px solid ${borderGlow}`,
          borderRadius: large ? 14 : 8,
          overflow: 'hidden',
          transition: 'all 0.5s ease',
          opacity: isLoser ? 0.35 : 1,
          filter: isLoser ? 'grayscale(0.85) brightness(0.5)' : 'none',
          boxShadow: isWinner
            ? `0 0 16px ${esGreen}50, 0 0 40px ${esGreen}18`
            : isLoser
              ? `0 0 8px ${esRed}25`
              : `0 4px 20px rgba(0,0,0,0.5), 0 0 12px ${esCyan}10`,
          ...(isLoser ? { animation: 'grid-loser-fade 0.8s ease-out forwards' } : {}),
        }}>
          {/* Full-bleed image */}
          {slotImage ? (
            <img src={slotImage} alt={name} style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', display: 'block',
            }} />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(135deg, ${esBg}, rgba(0,229,255,0.05))`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: large ? 28 : 16, color: 'rgba(255,255,255,0.06)',
            }}>⚔</div>
          )}

          {/* Winner crown */}
          {isWinner && (
            <div style={{
              position: 'absolute', top: 4, right: 4, zIndex: 5,
              fontSize: large ? 20 : 14,
              filter: `drop-shadow(0 0 6px ${esGold})`,
            }}>🏆</div>
          )}

          {/* Name stripe + Bo3 pips — top */}
          <div style={{
            position: 'relative', zIndex: 2,
            padding: large ? '5px 8px 3px' : '2px 5px 2px',
            background: 'rgba(0,0,0,0.75)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: nameFs, fontWeight: 800, fontFamily: esFont,
              color: isWinner ? esGreen : isLoser ? 'rgba(255,255,255,0.3)' : '#fff',
              textTransform: 'uppercase', letterSpacing: '0.8px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              textShadow: isWinner ? `0 0 8px ${esGreen}40` : `0 0 8px ${esCyan}30`,
            }}>
              {name}
              {match.activePlayer === playerKey && !match.winner && (
                <span style={{ fontSize: 'clamp(6px, 0.6vw, 8px)', color: '#818cf8', marginLeft: 4, fontStyle: 'normal' }}>▶ PLAYING</span>
              )}
            </div>
            {renderEsPips(match, playerKey)}
          </div>

          {/* Spacer — lets image show through */}
          <div style={{ flex: 1 }} />

          {/* Result overlay with neon glow */}
          {result !== null && (
            <div style={{
              position: 'relative', zIndex: 2,
              textAlign: 'center', padding: '2px 0',
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(4px)',
            }}>
              <span style={{
                fontSize: large ? 'clamp(16px, 2.5vw, 28px)' : 'clamp(12px, 1.6vw, 16px)',
                fontWeight: 900, fontFamily: esFont,
                color: result > 0 ? esGreen : result < 0 ? esRed : '#94a3b8',
                textShadow: result > 0
                  ? `0 0 12px ${esGreen}70, 0 0 24px ${esGreen}30`
                  : result < 0
                    ? `0 0 10px ${esRed}60, 0 0 20px ${esRed}25`
                    : 'none',
              }}>{fmtResult(result, match)}</span>
            </div>
          )}

          {/* Stats bar — bottom */}
          <div style={{
            position: 'relative', zIndex: 2,
            display: 'flex', background: 'rgba(0,0,0,0.85)',
          }}>
            <div style={{ flex: 1, textAlign: 'center', padding: large ? '4px 3px' : '2px 2px' }}>
              <div style={{
                fontSize: labelFs, fontWeight: 600, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: esFont,
                lineHeight: 1,
              }}>Cost</div>
              <div style={{
                fontSize: statFs, fontWeight: 900, color: esCyan, fontFamily: esFont,
                textShadow: `0 0 6px ${esCyan}30`, lineHeight: 1.2,
              }}>{vals.cost !== null ? `${currency}${vals.cost.toFixed(0)}` : '—'}</div>
            </div>
            <div style={{ width: 1, background: esBorder }} />
            <div style={{ flex: 1, textAlign: 'center', padding: large ? '4px 3px' : '2px 2px' }}>
              <div style={{
                fontSize: labelFs, fontWeight: 600, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: esFont,
                lineHeight: 1,
              }}>Pay</div>
              <div style={{
                fontSize: statFs, fontWeight: 900, fontFamily: esFont, lineHeight: 1.2,
                color: vals.pay > (vals.cost || 0) ? esGreen : esRed,
                textShadow: vals.pay > (vals.cost || 0)
                  ? `0 0 8px ${esGreen}40` : `0 0 6px ${esRed}30`,
              }}>{vals.pay !== null ? `${currency}${vals.pay.toFixed(0)}` : '—'}</div>
            </div>
          </div>
        </div>
      );
    };

    /* ── VS badge (compact) ── */
    const renderEsVs = (large = false) => {
      const sz = large ? 'clamp(22px, 3vw, 36px)' : 'clamp(14px, 1.8vw, 22px)';
      const isCurrent = large;
      return (
        <div style={{
          width: sz, height: sz, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${esPurple}, ${esCyan})`,
          border: '2px solid rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: large ? 'clamp(9px, 1.2vw, 14px)' : 'clamp(6px, 0.9vw, 10px)',
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
          minHeight: 'clamp(90px, 18vh, 160px)',
        }}>
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

    /* ── Done match (list row: name vs name + winner badge) ── */
    const renderEsDoneRow = (match, idx) => {
      const winner = match.winner;
      const p1Won = winner === 'player1';
      const p2Won = winner === 'player2';
      const p1 = match.player1 || 'TBD';
      const p2 = match.player2 || 'TBD';
      const fs = 'clamp(8px, 1.2vw, 13px)';
      return (
        <div key={idx} style={{
          display: 'flex', alignItems: 'center', gap: 'clamp(4px, 0.6vw, 10px)',
          padding: 'clamp(2px, 0.3vw, 5px) clamp(6px, 0.8vw, 12px)',
          background: 'rgba(0,0,0,0.25)',
          border: `1px solid ${esBorder}`,
          borderRadius: 6,
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        }}>
          <span style={{
            flex: 1, textAlign: 'right', fontSize: fs, fontWeight: 700, fontFamily: esFont,
            color: p1Won ? esGreen : 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            textShadow: p1Won ? `0 0 6px ${esGreen}40` : 'none',
          }}>{p1Won ? '🏆 ' : ''}{p1}</span>
          <span style={{
            fontSize: 'clamp(6px, 0.8vw, 9px)', fontWeight: 800, color: '#475569',
            fontFamily: esFont, flexShrink: 0,
          }}>VS</span>
          <span style={{
            flex: 1, textAlign: 'left', fontSize: fs, fontWeight: 700, fontFamily: esFont,
            color: p2Won ? esGreen : 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            textShadow: p2Won ? `0 0 6px ${esGreen}40` : 'none',
          }}>{p2}{p2Won ? ' 🏆' : ''}</span>
        </div>
      );
    };

    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', fontFamily: esFont,
        background: 'transparent', perspective: '1200px',
      }}>
        {/* ── Queued matches (single column, top) ── */}
        {queuedMatches.length > 0 && (
          <div style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column',
            gap: 'clamp(3px, 0.5vw, 8px)',
            padding: 'clamp(3px, 0.5vw, 8px)',
            overflow: 'hidden',
          }}>
            {queuedMatches.map((m, i) => renderEsOverviewMatch(m, i))}
          </div>
        )}

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

        {/* ── Current match (Now Playing) ── */}
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

            {/* Match cards — same structure as overview matches */}
            <div style={{
              display: 'flex', alignItems: 'stretch',
              gap: 'clamp(3px, 0.5vw, 8px)',
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${esCyan}`,
              borderRadius: 10, padding: 'clamp(4px, 0.6vw, 8px)',
              position: 'relative', zIndex: 1, overflow: 'hidden',
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              minHeight: 'clamp(90px, 18vh, 160px)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {renderEsCard(currentMatch, 'player1', false)}
              </div>
              {renderEsVs(true)}
              <div style={{ flex: 1, minWidth: 0 }}>
                {renderEsCard(currentMatch, 'player2', false)}
              </div>

              {/* Shatter overlay */}
              {layout === 'esports' && shatterInfo && (
                <ShatterEffect
                  imageUrl={shatterInfo.imageUrl}
                  side={shatterInfo.side}
                  accentColor={esCyan}
                  onComplete={() => { setShatterInfo(null); setShatterMatchIdx(null); }}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Done matches (list, bottom) ── */}
        {doneMatches.length > 0 && (
          <div style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column',
            gap: 'clamp(2px, 0.3vw, 4px)',
            padding: 'clamp(3px, 0.5vw, 8px)',
          }}>
            {doneMatches.map((m, i) => renderEsDoneRow(m, i))}
          </div>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     SCOREBOARD — Bo3 focused layout with PAY / MULTI columns per round
     Stacked player cards showing all rounds side-by-side with phase tabs.
     ═══════════════════════════════════════════════════════════════ */
  const renderScoreboard = () => {
    const sbAccent   = c.sbAccent   || '#3b82f6';  // blue accent
    const sbHeaderBg = c.sbHeaderBg || 'rgba(0,0,0,0.85)';
    const sbCardBg   = c.sbCardBg   || '#1a1d2e';
    const sbTextCol  = c.sbTextColor || '#ffffff';
    const sbPayCol   = c.sbPayColor  || '#e2e8f0';
    const sbMultiCol = c.sbMultiColor || '#facc15';
    const sbWinCol   = c.sbWinColor  || '#22c55e';
    const sbLoseCol  = c.sbLoseColor || '#ef4444';
    const sbTabBg    = c.sbTabBg     || 'rgba(0,0,0,0.6)';
    const sbTabActive = c.sbTabActive || sbAccent;
    const sbFont     = fontFamily;
    const bracketData = c.bracketData || [];
    const bracketActiveRound = c.bracketActiveRound ?? 0;

    /* Current match from the flat list */
    const currentMatch = matches[currentMatchIdx] || matches[0];
    if (!currentMatch) return null;

    const isBo3 = currentMatch.type === 'bonus_bo3';
    const roundCount = isBo3 ? 3 : 1;
    const scoreboard = isBo3 ? getBoScoreboard(currentMatch) : null;

    /* Get values for a player in a specific round */
    const getRoundVals = (match, playerKey, roundIdx) => {
      const rd = match?.rounds?.[roundIdx]?.[playerKey];
      if (!rd) return { pay: null, multi: null };
      if (match.type === 'spins') {
        const s = parseFloat(rd.startBalance), e = parseFloat(rd.endBalance);
        const pay = (isNaN(s) || isNaN(e)) ? null : e;
        const multi = (isNaN(s) || isNaN(e) || s === 0) ? null : (e - s) / s;
        return { pay, multi };
      }
      const cost = parseFloat(rd.bonusCost), payout = parseFloat(rd.bonusPayout);
      const pay = isNaN(payout) ? null : payout;
      const multi = (isNaN(cost) || isNaN(payout) || cost === 0) ? null : payout / cost;
      return { pay, multi };
    };

    /* Total pay + multi across all rounds */
    const getPlayerTotals = (match, playerKey) => {
      let totalPay = 0, totalCost = 0, anyData = false;
      for (let i = 0; i < roundCount; i++) {
        const rd = match?.rounds?.[i]?.[playerKey];
        if (!rd) continue;
        if (match.type === 'spins') {
          const s = parseFloat(rd.startBalance), e = parseFloat(rd.endBalance);
          if (!isNaN(s) && !isNaN(e)) { totalPay += e; totalCost += s; anyData = true; }
        } else {
          const cost = parseFloat(rd.bonusCost), payout = parseFloat(rd.bonusPayout);
          if (!isNaN(payout)) { totalPay += payout; anyData = true; }
          if (!isNaN(cost)) totalCost += cost;
        }
      }
      if (!anyData) return { pay: null, multi: null };
      const multi = totalCost > 0 ? totalPay / totalCost : null;
      return { pay: totalPay, multi };
    };

    /* Render one player card */
    const renderSbPlayer = (match, playerKey) => {
      const name = match[playerKey] || 'Player';
      const pSlot = playerKey === 'player1' ? match.slot1 : match.slot2;
      const slotImage = pSlot?.image || null;
      const slotName = pSlot?.name || '';
      const hasWinner = match.winner != null;
      const isWinner = match.winner === playerKey;
      const isLoser = hasWinner && !isWinner;
      const totals = getPlayerTotals(match, playerKey);

      return (
        <div style={{
          display: 'flex', flexDirection: 'column',
          background: sbCardBg,
          borderRadius: `${cardRadius}px`,
          overflow: 'hidden',
          border: isWinner
            ? `2px solid ${sbWinCol}`
            : isLoser ? `1px solid ${sbLoseCol}40` : `1px solid ${cardBorder}`,
          opacity: isLoser ? 0.7 : 1,
          transition: 'all 0.3s ease',
          flex: 1, minHeight: 0,
        }}>
          {/* Player name header */}
          <div style={{
            background: sbHeaderBg,
            padding: '4px 10px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {isWinner && <span style={{ fontSize: 14 }}>🏆</span>}
            <span style={{
              fontWeight: 700, color: sbTextCol, fontSize: 'clamp(11px, 1.6vw, 15px)',
              fontFamily: sbFont, whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis', flex: 1,
            }}>{name}</span>
            {match.activePlayer === playerKey && !match.winner && (
              <span style={{ fontSize: 8, fontWeight: 800, color: '#818cf8', letterSpacing: '0.5px' }}>▶ PLAYING</span>
            )}
          </div>

          {/* Content: slot image + round columns */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'stretch', minHeight: 0,
          }}>
            {/* Slot image */}
            <div style={{
              width: 'clamp(60px, 28%, 140px)', flexShrink: 0, position: 'relative',
              overflow: 'hidden',
            }}>
              {slotImage ? (
                <img src={slotImage} alt={slotName} style={{
                  width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  background: 'rgba(0,0,0,0.3)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, color: 'rgba(255,255,255,0.1)',
                }}>🎰</div>
              )}
              {/* Slot name overlay */}
              {slotName && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(0,0,0,0.75)', padding: '2px 4px',
                  fontSize: 'clamp(7px, 1vw, 10px)', fontWeight: 600,
                  color: '#d4d8e0', textTransform: 'uppercase',
                  letterSpacing: '0.3px', lineHeight: 1.2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  fontFamily: sbFont,
                }}>{slotName}</div>
              )}
            </div>

            {/* Round columns */}
            <div style={{
              flex: 1, display: 'flex', minWidth: 0,
            }}>
              {Array.from({ length: roundCount }, (_, rIdx) => {
                const vals = getRoundVals(match, playerKey, rIdx);
                const roundWinner = scoreboard?.roundResults?.[rIdx]?.winner;
                const wonThisRound = roundWinner === playerKey;
                const lostThisRound = roundWinner && roundWinner !== 'draw' && roundWinner !== playerKey;
                const roundDone = roundWinner != null;

                return (
                  <div key={rIdx} style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'flex-end',
                    padding: '4px 8px', minWidth: 0,
                    borderLeft: '1px solid rgba(255,255,255,0.06)',
                    background: wonThisRound ? `${sbWinCol}10`
                      : lostThisRound ? `${sbLoseCol}08` : 'transparent',
                  }}>
                    {/* PAY */}
                    <div style={{
                      display: 'flex', alignItems: 'baseline', gap: 4,
                      justifyContent: 'flex-end', width: '100%',
                    }}>
                      <span style={{
                        fontSize: 'clamp(8px, 0.9vw, 10px)', fontWeight: 600,
                        color: '#94a3b8', fontFamily: sbFont,
                      }}>PAY</span>
                      <span style={{
                        fontSize: 'clamp(11px, 1.4vw, 15px)', fontWeight: 700,
                        color: sbPayCol, fontFamily: sbFont,
                      }}>{vals.pay !== null ? `${currency}${vals.pay.toFixed(2)}` : '—'}</span>
                    </div>
                    {/* MULTI */}
                    <div style={{
                      display: 'flex', alignItems: 'baseline', gap: 4,
                      justifyContent: 'flex-end', width: '100%',
                    }}>
                      <span style={{
                        fontSize: 'clamp(8px, 0.9vw, 10px)', fontWeight: 600,
                        color: '#94a3b8', fontFamily: sbFont,
                      }}>MULTI</span>
                      <span style={{
                        fontSize: 'clamp(11px, 1.4vw, 15px)', fontWeight: 700,
                        color: sbMultiCol, fontFamily: sbFont,
                      }}>{vals.multi !== null ? `${vals.multi.toFixed(2)}x` : '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom score bar: per-round indicators + totals */}
          <div style={{
            display: 'flex', alignItems: 'center', padding: '3px 6px',
            background: 'rgba(0,0,0,0.5)', gap: 6,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            {/* Round win/loss indicators */}
            {isBo3 && scoreboard && (
              <div style={{ display: 'flex', gap: 3 }}>
                {scoreboard.roundResults.map((rr, i) => (
                  <span key={i} style={{
                    fontSize: 'clamp(10px, 1.2vw, 14px)',
                    opacity: rr.winner ? 1 : 0.3,
                  }}>
                    {rr.winner === playerKey ? '🏅'
                      : rr.winner === 'draw' ? '🤝'
                      : rr.winner ? '❌' : '⚪'}
                  </span>
                ))}
              </div>
            )}

            <div style={{ flex: 1 }} />

            {/* Totals */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 'clamp(9px, 1vw, 12px)', fontFamily: sbFont,
            }}>
              <span style={{ color: '#94a3b8' }}>
                {currency}{totals.pay !== null ? totals.pay.toFixed(2) : '0.00'}
              </span>
              <span style={{
                fontWeight: 700,
                color: totals.multi !== null && totals.multi >= 1 ? sbWinCol : sbLoseCol,
              }}>
                {totals.multi !== null ? `${totals.multi.toFixed(2)}x` : '—'}
              </span>
              <span style={{ fontSize: 'clamp(9px, 1vw, 12px)', color: sbPayCol }}>
                {currency}{(totals.pay !== null && totals.multi !== null) ? ((totals.pay / totals.multi) || 0).toFixed(0) : '0'}
              </span>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', fontFamily: sbFont,
        padding: `${padding}px`, gap: `${gap}px`,
      }}>
        {/* Both player cards */}
        {renderSbPlayer(currentMatch, 'player1')}
        {renderSbPlayer(currentMatch, 'player2')}

        {/* Phase tabs at bottom */}
        {bracketData.length > 1 && (
          <div style={{
            display: 'flex', flexShrink: 0,
            borderRadius: 6, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {bracketData.map((round, rIdx) => {
              const isActive = rIdx === bracketActiveRound;
              return (
                <div key={rIdx} style={{
                  flex: 1, textAlign: 'center',
                  padding: 'clamp(4px, 0.6vw, 8px) 4px',
                  fontSize: 'clamp(8px, 1.1vw, 12px)',
                  fontWeight: 800, fontFamily: sbFont,
                  textTransform: 'uppercase', letterSpacing: '0.8px',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                  background: isActive ? sbTabActive : sbTabBg,
                  transition: 'all 0.2s',
                  cursor: 'default',
                  borderRight: rIdx < bracketData.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}>
                  {round.label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     GRID — Phase-aware bracket layout with clear round labels
     Groups matches by bracket phase (Quarters / Semis / Final)
     ═══════════════════════════════════════════════════════════════ */
  const renderGrid = () => {
    const gCyan   = c.esCyan   || '#00e5ff';
    const gPurple = c.esPurple || '#a855f7';
    const gGold   = c.esGold   || '#fbbf24';
    const gBg     = c.esBg     || '#030712';
    const gBorder = c.esBorder || 'rgba(0,229,255,0.18)';
    const gFont   = fontFamily;
    const gGreen  = '#39ff14';
    const gRed    = '#ff3b5c';

    /* ── Match classification (same as esports) ── */
    const isShatterHolding = shatterMatchIdx != null && shatterInfo;
    const currentMatch = isShatterHolding
      ? (allMatches[shatterMatchIdx] || matches[currentMatchIdx] || matches[0])
      : (matches[currentMatchIdx] || matches[0]);
    const otherMatches = matches.filter((_, i) => i !== currentMatchIdx);
    const queuedMatches = otherMatches.filter(m => m.winner == null);
    const doneMatches = isShatterHolding
      ? otherMatches.filter(m => m.winner != null && m !== allMatches[shatterMatchIdx])
      : otherMatches.filter(m => m.winner != null);

    /* ── Phase info from bracket data ── */
    const bracketData = c.bracketData || [];
    const bracketActiveRound = c.bracketActiveRound ?? 0;
    const totalPhases = bracketData.length;
    const activePhaseLabel = bracketData[bracketActiveRound]?.label || null;
    const isFinalPhase = bracketActiveRound === totalPhases - 1 && totalPhases > 1;
    /* Champion celebration only when the LAST match of the entire tournament is decided */
    const isGrandFinalMatch = isFinalPhase && currentMatch?.winner != null
      && matches.every(m => m.winner != null);

    /* Get cost & payment (Bo3 sums all rounds) */
    const getVals = (match, playerKey) => {
      if (!match?.rounds) return { cost: null, pay: null };
      if (match.type === 'bonus_bo3' || match.type === 'bonus_bo3_classic') {
        let totalCost = 0, totalPay = 0, any = false;
        for (const round of match.rounds) {
          const rd = round[playerKey];
          if (!rd) continue;
          const c2 = parseFloat(rd.bonusCost), p2 = parseFloat(rd.bonusPayout);
          if (!isNaN(c2)) { totalCost += c2; any = true; }
          if (!isNaN(p2)) { totalPay += p2; any = true; }
        }
        return any ? { cost: totalCost, pay: totalPay } : { cost: null, pay: null };
      }
      const rd = match.rounds[0]?.[playerKey];
      if (!rd) return { cost: null, pay: null };
      if (match.type === 'spins') {
        const s = parseFloat(rd.startBalance), e = parseFloat(rd.endBalance);
        return { cost: isNaN(s) ? null : s, pay: isNaN(e) ? null : e };
      }
      const cost = parseFloat(rd.bonusCost), pay = parseFloat(rd.bonusPayout);
      return { cost: isNaN(cost) ? null : cost, pay: isNaN(pay) ? null : pay };
    };

    /* ── Bo3 pip system ── */
    const renderPips = (match, playerKey) => {
      if (match.type !== 'bonus_bo3' && match.type !== 'bonus_bo3_classic') return null;
      const scoreboard = getBoScoreboard(match);
      if (!scoreboard) return null;
      return (
        <div style={{
          display: 'flex', gap: 'clamp(3px, 0.5vw, 5px)',
          justifyContent: 'center', marginTop: 2,
        }}>
          {scoreboard.roundResults.map((rr, i) => {
            const won = rr.winner === playerKey;
            const lost = rr.winner && rr.winner !== playerKey && rr.winner !== 'draw';
            const draw = rr.winner === 'draw';
            const played = rr.winner != null;
            return (
              <div key={i} style={{
                width: 'clamp(8px, 1.2vw, 12px)', height: 'clamp(8px, 1.2vw, 12px)',
                borderRadius: '50%',
                background: won ? gGreen : lost ? gRed : draw ? gGold : 'rgba(255,255,255,0.12)',
                boxShadow: won ? `0 0 6px ${gGreen}80, 0 0 12px ${gGreen}30`
                  : lost ? `0 0 6px ${gRed}60` : 'none',
                border: played ? 'none' : '1px solid rgba(255,255,255,0.15)',
                transition: 'all 0.4s ease',
              }} />
            );
          })}
        </div>
      );
    };

    /* ── Enhanced player card (full-bleed image, neon glow, pips, cost/pay) ── */
    const renderCard = (match, playerKey, large = false, isChampion = false, showStats = true) => {
      const name = match[playerKey] || 'TBD';
      const pSlot = playerKey === 'player1' ? match.slot1 : match.slot2;
      const slotImage = pSlot?.image || null;
      const result = getPlayerResult(match, playerKey);
      const hasWinner = match.winner != null;
      const isWinner = match.winner === playerKey;
      const isLoser = hasWinner && !isWinner;
      const vals = getVals(match, playerKey);

      const nameFs = large ? 'clamp(12px, 1.8vw, 16px)' : 'clamp(10px, 1.4vw, 13px)';
      const statFs = large ? 'clamp(12px, 1.4vw, 14px)' : 'clamp(10px, 1.1vw, 12px)';
      const labelFs = large ? 'clamp(7px, 0.7vw, 9px)' : 'clamp(6px, 0.6vw, 8px)';
      const resultFs = large ? 'clamp(16px, 2.5vw, 28px)' : 'clamp(12px, 1.6vw, 16px)';

      /* Neon status system — Super = gold glow, Extreme = red glow */
      const slotTag = pSlot?.tag; // 'super' | 'extreme' | null
      const isSuper = slotTag === 'super';
      const isExtreme = slotTag === 'extreme';
      const gGoldBorder = '#fbbf24';
      const gExtremeRed = '#ef4444';
      const borderCol = isWinner ? gGreen : isLoser ? gRed
        : isSuper ? gGoldBorder : isExtreme ? gExtremeRed : gBorder;
      const glowShadow = isWinner
        ? `0 0 16px ${gGreen}50, 0 0 40px ${gGreen}18`
        : isLoser
          ? `0 0 8px ${gRed}25`
          : isSuper
            ? `0 0 14px ${gGoldBorder}60, 0 0 36px ${gGoldBorder}25, 0 4px 20px rgba(0,0,0,0.5)`
            : isExtreme
              ? `0 0 14px ${gExtremeRed}60, 0 0 36px ${gExtremeRed}25, 0 4px 20px rgba(0,0,0,0.5)`
              : `0 4px 20px rgba(0,0,0,0.5), 0 0 12px ${gCyan}10`;

      return (
        <div style={{
          width: '100%', height: '100%', position: 'relative',
          display: 'flex', flexDirection: 'column',
          border: `2px solid ${borderCol}`,
          borderRadius: large ? 14 : 8,
          overflow: 'hidden',
          transition: 'all 0.5s ease',
          boxShadow: glowShadow,
          /* Loser gray-out animation */
          opacity: isLoser ? 0.35 : 1,
          filter: isLoser ? 'grayscale(0.85) brightness(0.5)' : 'none',
          ...(isLoser ? { animation: 'grid-loser-fade 0.8s ease-out forwards' } : {}),
          /* Champion holographic border */
          ...(isChampion ? { animation: 'grid-champion-holo 3s linear infinite' } : {}),
        }}>
          {/* Holographic foil overlay for champion */}
          {isChampion && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
              background: 'linear-gradient(135deg, transparent 20%, rgba(57,255,20,0.08) 30%, rgba(0,229,255,0.1) 40%, rgba(251,191,36,0.08) 50%, transparent 60%)',
              backgroundSize: '300% 300%',
              animation: 'grid-holo-sweep 3s linear infinite',
              mixBlendMode: 'screen', borderRadius: 'inherit',
            }} />
          )}

          {/* Full-bleed slot image */}
          {slotImage ? (
            <img src={slotImage} alt={name} style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', display: 'block',
            }} />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(135deg, ${gBg}, rgba(0,229,255,0.05))`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: large ? 28 : 16, color: 'rgba(255,255,255,0.06)',
            }}>⚔</div>
          )}

          {/* Winner emoji (non-champion) */}
          {isWinner && !isChampion && (
            <div style={{
              position: 'absolute', top: 4, right: 4, zIndex: 5,
              fontSize: large ? 20 : 14,
              filter: `drop-shadow(0 0 6px ${gGold})`,
            }}>🏆</div>
          )}

          {/* Champion trophy emoji */}
          {isChampion && (
            <div style={{
              position: 'absolute', top: 4, right: 4, zIndex: 5,
              fontSize: large ? 20 : 14,
              filter: `drop-shadow(0 0 6px ${gGold})`,
            }}>🏆</div>
          )}

          {/* Super / Extreme tag badge — outer edge, vertical */}
          {!isLoser && (isSuper || isExtreme) && (() => {
            const isLeft = playerKey === 'player1';
            const badgeText = isSuper ? 'SUPER' : 'EXTREME';
            return (
              <div style={{
                position: 'absolute',
                top: '50%', transform: 'translateY(-50%)',
                ...(isLeft ? { left: 0 } : { right: 0 }),
                zIndex: 6,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                ...(isLeft ? { transform: 'translateY(-50%)' } : {}),
                fontSize: 'clamp(7px, 0.85vw, 11px)', fontWeight: 900,
                color: '#fff', textTransform: 'uppercase',
                fontFamily: gFont, lineHeight: 1.3,
                padding: 'clamp(4px, 0.5vw, 8px) clamp(3px, 0.4vw, 5px)',
                borderRadius: isLeft ? '0 4px 4px 0' : '4px 0 0 4px',
                background: isSuper
                  ? `linear-gradient(180deg, ${gGoldBorder}, #d97706)`
                  : `linear-gradient(180deg, ${gExtremeRed}, #b91c1c)`,
                boxShadow: isSuper
                  ? `0 0 12px ${gGoldBorder}70, inset 0 0 6px ${gGoldBorder}30`
                  : `0 0 12px ${gExtremeRed}70, inset 0 0 6px ${gExtremeRed}30`,
              }}>
                {(isSuper ? '⭐' : '🔥')}
                {badgeText.split('').map((ch, ci) => <span key={ci} style={{ display: 'block' }}>{ch}</span>)}
              </div>
            );
          })()}

          {/* Name stripe + Bo3 pips — top */}
          <div style={{
            position: 'relative', zIndex: 2,
            padding: large ? '5px 8px 3px' : '3px 6px 2px',
            background: 'rgba(0,0,0,0.75)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: nameFs, fontWeight: 800, fontFamily: gFont,
              color: isWinner ? gGreen : isLoser ? 'rgba(255,255,255,0.3)' : '#fff',
              textTransform: 'uppercase', letterSpacing: '0.8px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              textShadow: isWinner ? `0 0 8px ${gGreen}40` : `0 0 8px ${gCyan}30`,
            }}>{name}</div>
            {showStats && renderPips(match, playerKey)}
          </div>

          {/* Spacer — lets image show through */}
          <div style={{ flex: 1 }} />

          {/* Result overlay with neon glow */}
          {result !== null && (
            <div style={{
              position: 'relative', zIndex: 2,
              textAlign: 'center', padding: '2px 0',
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(4px)',
            }}>
              <span style={{
                fontSize: resultFs, fontWeight: 900, fontFamily: gFont,
                color: result > 0 ? gGreen : result < 0 ? gRed : '#94a3b8',
                textShadow: result > 0
                  ? `0 0 12px ${gGreen}70, 0 0 24px ${gGreen}30`
                  : result < 0
                    ? `0 0 10px ${gRed}60, 0 0 20px ${gRed}25`
                    : 'none',
              }}>{fmtResult(result, match)}</span>
            </div>
          )}

          {/* Cost / Payment stats bar — only on active match */}
          {showStats && (
          <div style={{
            position: 'relative', zIndex: 2,
            display: 'flex', background: 'rgba(0,0,0,0.85)',
          }}>
            <div style={{ flex: 1, textAlign: 'center', padding: large ? '4px 3px' : '2px 2px' }}>
              <div style={{
                fontSize: labelFs, fontWeight: 600, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: gFont,
                lineHeight: 1,
              }}>Cost</div>
              <div style={{
                fontSize: statFs, fontWeight: 900, color: gCyan, fontFamily: gFont,
                textShadow: `0 0 6px ${gCyan}30`, lineHeight: 1.2,
              }}>{vals.cost !== null ? `${currency}${vals.cost.toFixed(0)}` : '—'}</div>
            </div>
            <div style={{ width: 1, background: gBorder }} />
            <div style={{ flex: 1, textAlign: 'center', padding: large ? '4px 3px' : '2px 2px' }}>
              <div style={{
                fontSize: labelFs, fontWeight: 600, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: gFont,
                lineHeight: 1,
              }}>Pay</div>
              <div style={{
                fontSize: statFs, fontWeight: 900, fontFamily: gFont, lineHeight: 1.2,
                color: vals.pay > (vals.cost || 0) ? gGreen : gRed,
                textShadow: vals.pay > (vals.cost || 0)
                  ? `0 0 8px ${gGreen}40` : `0 0 6px ${gRed}30`,
              }}>{vals.pay !== null ? `${currency}${vals.pay.toFixed(0)}` : '—'}</div>
            </div>
          </div>
          )}
        </div>
      );
    };

    /* ── VS badge (⚔️ emoji) ── */
    const renderVs = (large = false, isLive = false) => {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0, gap: 2,
          padding: 0, background: 'none', border: 'none',
          width: large ? 'clamp(30px, 4vw, 50px)' : 'clamp(20px, 3vw, 36px)',
        }}>
          {/* LIVE badge */}
          {isLive && (
            <div style={{
              fontSize: 'clamp(6px, 0.7vw, 8px)', fontWeight: 900,
              color: '#fff', background: '#ef4444',
              padding: '1px 5px', borderRadius: 3, letterSpacing: '1px',
              textTransform: 'uppercase', fontFamily: gFont,
              animation: 'grid-live-pulse 1.5s ease-in-out infinite',
              boxShadow: '0 0 8px rgba(239,68,68,0.5)',
            }}>LIVE</div>
          )}
          <div style={{
            width: large ? 'clamp(36px, 4.5vw, 56px)' : 'clamp(24px, 3.2vw, 38px)',
            height: large ? 'clamp(36px, 4.5vw, 56px)' : 'clamp(24px, 3.2vw, 38px)',
            borderRadius: '50%',
            background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            filter: `drop-shadow(0 0 10px ${gCyan}80) drop-shadow(0 0 22px ${gPurple}50)`,
            ...(large ? { animation: 'es-vs-pulse 2s ease-in-out infinite' } : {}),
          }}>
            <span style={{
              fontSize: large ? 'clamp(22px, 3.2vw, 38px)' : 'clamp(16px, 2.4vw, 28px)',
              lineHeight: 1,
            }}>⚔️</span>
          </div>
          {/* WINNER label for grand final */}
          {isGrandFinalMatch && large && (
            <div style={{
              fontSize: 'clamp(7px, 0.9vw, 10px)', fontWeight: 900,
              color: gGold, fontFamily: gFont, letterSpacing: '1.5px',
              textTransform: 'uppercase',
              textShadow: `0 0 10px ${gGold}60, 0 0 20px ${gGold}30`,
              animation: 'grid-winner-scale 1s ease-out forwards, es-text-glow 2s ease-in-out 1s infinite',
            }}>WINNER</div>
          )}
        </div>
      );
    };

    /* ── Queued match row (3D perspective) ── */
    const renderQueuedMatch = (match, idx) => (
      <div key={idx} style={{
        display: 'flex', alignItems: 'stretch', gap: 'clamp(1px, 0.2vw, 3px)',
        background: 'transparent',
        borderRadius: 10, padding: 'clamp(2px, 0.3vw, 4px)',
        position: 'relative', overflow: 'visible',
        minHeight: 'clamp(60px, 12vh, 110px)',
        perspective: '600px',
      }}>
        <div style={{ flex: 1, minWidth: 0, transform: 'rotateY(8deg)', transformOrigin: 'right center', transition: 'transform 0.3s ease' }}>
          {renderCard(match, 'player1', false, false, false)}
        </div>
        {renderVs(false)}
        <div style={{ flex: 1, minWidth: 0, transform: 'rotateY(-8deg)', transformOrigin: 'left center', transition: 'transform 0.3s ease' }}>
          {renderCard(match, 'player2', false, false, false)}
        </div>
      </div>
    );

    /* ── Done match row ── */
    const renderDoneRow = (match, idx) => {
      const winner = match.winner;
      const p1Won = winner === 'player1';
      const p2Won = winner === 'player2';
      const p1 = match.player1 || 'TBD';
      const p2 = match.player2 || 'TBD';
      const fs = 'clamp(9px, 1.3vw, 14px)';
      return (
        <div key={idx} style={{
          display: 'flex', alignItems: 'center', gap: 'clamp(4px, 0.6vw, 8px)',
          padding: 'clamp(2px, 0.35vw, 5px) clamp(6px, 0.8vw, 10px)',
          background: 'rgba(0,0,0,0.35)',
          border: `1px solid ${p1Won || p2Won ? `${gGreen}25` : gBorder}`,
          borderRadius: 6,
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        }}>
          <span style={{
            flex: 1, textAlign: 'right', fontSize: fs, fontWeight: 800, fontFamily: gFont,
            color: p1Won ? gGreen : 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            letterSpacing: '0.5px',
            textShadow: p1Won ? `0 0 8px ${gGreen}50` : 'none',
            textDecoration: !p1Won ? 'line-through' : 'none',
            textDecorationColor: !p1Won ? '#ef4444' : undefined,
            textDecorationThickness: '2px',
          }}>{p1Won ? '🏆 ' : ''}{p1}</span>
          <span style={{
            fontSize: 'clamp(10px, 1.2vw, 14px)', flexShrink: 0,
            width: 'clamp(18px, 2vw, 24px)', height: 'clamp(18px, 2vw, 24px)',
            borderRadius: '50%', overflow: 'hidden',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            filter: `drop-shadow(0 0 4px ${gCyan}50)`,
          }}>⚔️</span>
          <span style={{
            flex: 1, textAlign: 'left', fontSize: fs, fontWeight: 800, fontFamily: gFont,
            color: p2Won ? gGreen : 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            letterSpacing: '0.5px',
            textShadow: p2Won ? `0 0 8px ${gGreen}50` : 'none',
            textDecoration: !p2Won ? 'line-through' : 'none',
            textDecorationColor: !p2Won ? '#ef4444' : undefined,
            textDecorationThickness: '2px',
          }}>{p2}{p2Won ? ' 🏆' : ''}</span>
        </div>
      );
    };

    const hasCurrentWinner = currentMatch?.winner != null;
    const isCurrentLive = !hasCurrentWinner;

    /* ── Phase lookup by flat index: map each allMatches index → phase label ── */
    const phaseLabelByIdx = (() => {
      const map = {};
      let flatIdx = 0;
      for (const round of bracketData) {
        for (let m = 0; m < (round.matches?.length || 0); m++) {
          map[flatIdx] = round.label || null;
          flatIdx++;
        }
      }
      return map;
    })();
    const getMatchPhaseLabel = (match) => {
      const idx = allMatches.indexOf(match);
      return idx >= 0 ? (phaseLabelByIdx[idx] || null) : null;
    };

    /* ── Bo3 current round indicator ── */
    const getCurrentBoRound = (match) => {
      if (match.type !== 'bonus_bo3' && match.type !== 'bonus_bo3_classic') return null;
      if (match.winner != null) return null; // match done
      const scoreboard = getBoScoreboard(match);
      if (!scoreboard) return 1;
      // Current round = first round with no winner yet
      const idx = scoreboard.roundResults.findIndex(rr => rr.winner == null);
      return idx >= 0 ? idx + 1 : scoreboard.roundResults.length;
    };

    /* ── Flipper state: alternates between "Now Playing" and phase label ── */
    const flipperShowPhase = flipperTick % 2 === 1 && activePhaseLabel;
    const boRound = getCurrentBoRound(currentMatch);

    /* ── Queued matches: later phases on top, next-to-play near Now Playing ── */
    const visibleQueued = [...queuedMatches].reverse().slice(0, 3);

    /* ── Group queued matches by phase, show divider label between phase groups ── */
    const queuedWithPhase = visibleQueued.map((m, i) => {
      const label = getMatchPhaseLabel(m);
      const prevLabel = i > 0 ? getMatchPhaseLabel(visibleQueued[i - 1]) : null;
      // Show phase label above the first match of each new phase
      return { match: m, showLabel: label && (i === 0 || label !== prevLabel) ? label : null };
    });

    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', fontFamily: gFont,
        background: 'transparent',
      }}>
        {/* ── Tournament title ── */}
        {c.bracketName && (
          <div style={{
            textAlign: 'center', padding: 'clamp(3px, 0.4vw, 6px) 0',
          }}>
            <span style={{
              fontSize: 'clamp(11px, 1.5vw, 18px)', fontWeight: 900,
              color: '#fff', textTransform: 'uppercase', letterSpacing: '2.5px',
              fontFamily: gFont, textShadow: `0 0 14px ${gCyan}35`,
            }}>⚔ {c.bracketName}</span>
          </div>
        )}

        {/* ── Queued matches (max 3 rows, phase label on first of each group) ── */}
        {visibleQueued.length > 0 && (
          <div style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column',
            gap: 'clamp(3px, 0.5vw, 8px)',
            padding: 'clamp(3px, 0.5vw, 8px)',
          }}>
            {queuedWithPhase.map((item, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Phase label — above the first match of each phase group */}
                {item.showLabel && (
                  <div style={{
                    textAlign: 'center',
                    fontSize: 'clamp(8px, 1vw, 12px)', fontWeight: 800,
                    color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
                    letterSpacing: '2.5px', fontFamily: gFont,
                    padding: 'clamp(2px, 0.3vw, 4px) 0 clamp(4px, 0.6vw, 8px)',
                    textShadow: `0 0 10px ${gCyan}30`,
                  }}>— {item.showLabel} —</div>
                )}
                {renderQueuedMatch(item.match, i)}
              </div>
            ))}
          </div>
        )}

        {/* ── Energy divider ── */}
        <div style={{
          height: 2, flexShrink: 0, position: 'relative',
          background: `linear-gradient(90deg, transparent, ${gCyan}60, ${gPurple}60, transparent)`,
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '30%', height: '100%',
            background: `linear-gradient(90deg, transparent, ${gCyan}, transparent)`,
            animation: 'es-energy-line 2.5s linear infinite',
          }} />
        </div>

        {/* ── Current match (Now Playing) ── */}
        {currentMatch && (
          <div style={{
            flexShrink: 0, padding: 'clamp(4px, 0.8vw, 12px)',
            position: 'relative',
          }}>
            {/* Pulsing bg glow */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0,
              background: isGrandFinalMatch
                ? `radial-gradient(ellipse at center, ${gGold}15, transparent 70%)`
                : `radial-gradient(ellipse at center, ${gPurple}12, transparent 70%)`,
              animation: 'es-bg-pulse 3s ease-in-out infinite',
            }} />

            {/* Grand final particle burst */}
            {isGrandFinalMatch && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
                background: `radial-gradient(circle at 30% 40%, ${gGold}10 0%, transparent 50%), radial-gradient(circle at 70% 60%, ${gCyan}08 0%, transparent 50%)`,
                animation: 'grid-sparkle-drift 4s linear infinite',
              }} />
            )}

            {/* Flipper header: alternates "Now Playing" ↔ phase label every 15s */}
            <div style={{
              textAlign: 'center', marginBottom: 'clamp(2px, 0.4vh, 6px)',
              position: 'relative', zIndex: 1,
            }}>
              <div style={{
                position: 'relative', overflow: 'hidden',
                height: 'clamp(16px, 2.4vw, 26px)',
              }}>
                {/* "Now Playing" or phase label — CSS flip */}
                <span key={flipperTick} style={{
                  display: 'inline-block',
                  fontSize: 'clamp(10px, 1.5vw, 17px)', fontWeight: 900,
                  color: isGrandFinalMatch ? gGold : flipperShowPhase ? gCyan : gGold,
                  textTransform: 'uppercase', letterSpacing: '3.5px',
                  fontFamily: gFont,
                  textShadow: isGrandFinalMatch
                    ? `0 0 14px ${gGold}60, 0 0 28px ${gGold}25`
                    : flipperShowPhase
                      ? `0 0 12px ${gCyan}70, 0 0 24px ${gCyan}30`
                      : `0 0 14px ${gGold}60, 0 0 28px ${gGold}25`,
                  animation: 'grid-flipper-in 0.5s ease-out forwards',
                }}>
                  {isGrandFinalMatch
                    ? '🏆 Champion Crowned 🏆'
                    : flipperShowPhase
                      ? `▸ ${activePhaseLabel}`
                      : '⚡ Now Playing ⚡'}
                </span>
              </div>

              {/* Bo3 Round indicator */}
              {boRound && !isGrandFinalMatch && (
                <div style={{
                  fontSize: 'clamp(8px, 0.9vw, 11px)', fontWeight: 800,
                  color: gPurple, textTransform: 'uppercase', letterSpacing: '2px',
                  fontFamily: gFont, marginTop: 2,
                  textShadow: `0 0 10px ${gPurple}50, 0 0 20px ${gPurple}20`,
                }}>Round {boRound}</div>
              )}
            </div>

            {/* Match cards */}
            <div style={{
              display: 'flex', alignItems: 'stretch',
              gap: 'clamp(3px, 0.5vw, 8px)',
              background: 'transparent',
              borderRadius: 12, padding: 'clamp(2px, 0.3vw, 4px)',
              position: 'relative', zIndex: 1, overflow: 'visible',
              minHeight: 'clamp(110px, 24vh, 200px)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {renderCard(currentMatch, 'player1', true, isGrandFinalMatch && currentMatch.winner === 'player1')}
              </div>
              {renderVs(true, isCurrentLive)}
              <div style={{ flex: 1, minWidth: 0 }}>
                {renderCard(currentMatch, 'player2', true, isGrandFinalMatch && currentMatch.winner === 'player2')}
              </div>

              {/* Shatter overlay */}
              {layout === 'grid' && shatterInfo && (
                <ShatterEffect
                  imageUrl={shatterInfo.imageUrl}
                  side={shatterInfo.side}
                  accentColor={gCyan}
                  onComplete={() => { setShatterInfo(null); setShatterMatchIdx(null); }}
                />
              )}
            </div>
          </div>
        )}

        {/* ── CHAMPION CELEBRATION OVERLAY — confetti + 3D winner display ── */}
        {isGrandFinalMatch && (() => {
          const champName = currentMatch.winner === 'player1' ? currentMatch.player1 : currentMatch.player2;
          const champSlot = currentMatch.winner === 'player1' ? currentMatch.slot1 : currentMatch.slot2;
          const champImg = champSlot?.image || null;
          /* 30 confetti pieces with random positions, colours, delays */
          const confettiColors = ['#fbbf24', '#39ff14', '#00e5ff', '#ff3e9d', '#7c3aed', '#ef4444', '#f472b6', '#34d399', '#facc15', '#60a5fa'];
          const confetti = Array.from({ length: 40 }, (_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            delay: `${Math.random() * 2.5}s`,
            dur: `${2.5 + Math.random() * 2}s`,
            size: 4 + Math.random() * 6,
            color: confettiColors[i % confettiColors.length],
            shape: i % 3, // 0=square, 1=circle, 2=rect
            drift: (Math.random() - 0.5) * 80,
            spin: Math.random() * 720 - 360,
          }));
          return (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.85) 100%)',
              animation: 'grid-champ-overlay-in 0.6s ease-out forwards',
            }}>
              {/* Confetti pieces */}
              {confetti.map(p => (
                <div key={p.id} style={{
                  position: 'absolute', top: -10,
                  left: p.left,
                  width: p.shape === 2 ? p.size * 2 : p.size,
                  height: p.shape === 2 ? p.size * 0.6 : p.size,
                  borderRadius: p.shape === 1 ? '50%' : '1px',
                  background: p.color,
                  animationName: 'grid-confetti-fall',
                  animationDuration: p.dur,
                  animationDelay: p.delay,
                  animationTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  animationIterationCount: 'infinite',
                  animationFillMode: 'forwards',
                  opacity: 0.9,
                  '--confetti-drift': `${p.drift}px`,
                  '--confetti-spin': `${p.spin}deg`,
                }} />
              ))}

              {/* 3D Champion card */}
              <div style={{
                animation: 'grid-champ-card-in 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                perspective: '800px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                transformStyle: 'preserve-3d',
              }}>
                {/* "CHAMPION" title */}
                <div style={{
                  fontSize: 'clamp(16px, 3vw, 32px)', fontWeight: 900,
                  color: gGold, textTransform: 'uppercase',
                  letterSpacing: '6px', fontFamily: gFont,
                  textShadow: `0 0 20px ${gGold}80, 0 0 40px ${gGold}40, 0 2px 4px rgba(0,0,0,0.6)`,
                  marginBottom: 'clamp(8px, 1.5vh, 16px)',
                  animation: 'grid-champ-title-in 0.8s ease-out 0.4s both',
                }}>🏆 CHAMPION 🏆</div>

                {/* Slot image in 3D rotating frame */}
                {champImg && (
                  <div style={{
                    width: 'clamp(120px, 22vw, 220px)', height: 'clamp(90px, 16vw, 165px)',
                    borderRadius: 16, overflow: 'hidden', position: 'relative',
                    border: `3px solid ${gGold}`,
                    boxShadow: `0 0 30px ${gGold}50, 0 0 60px ${gGold}20, 0 8px 32px rgba(0,0,0,0.6)`,
                    animation: 'grid-champ-3d-float 4s ease-in-out 1.2s infinite',
                    transformStyle: 'preserve-3d',
                  }}>
                    <img src={champImg} alt={champName} style={{
                      width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                    }} />
                    {/* Shimmer sweep */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.15) 55%, transparent 60%)',
                      backgroundSize: '300% 100%',
                      animation: 'grid-champ-shimmer 3s ease-in-out 1.5s infinite',
                    }} />
                  </div>
                )}

                {/* Winner name */}
                <div style={{
                  marginTop: 'clamp(8px, 1.5vh, 16px)',
                  fontSize: 'clamp(14px, 2.5vw, 26px)', fontWeight: 900,
                  color: '#fff', textTransform: 'uppercase',
                  letterSpacing: '4px', fontFamily: gFont,
                  textShadow: `0 0 12px ${gCyan}60, 0 0 24px ${gCyan}30, 0 2px 4px rgba(0,0,0,0.6)`,
                  animation: 'grid-champ-name-in 0.8s ease-out 0.8s both',
                }}>{champName}</div>

                {/* Animated star/sparkle ring */}
                <div style={{
                  marginTop: 'clamp(4px, 0.8vh, 8px)',
                  fontSize: 'clamp(12px, 2vw, 20px)',
                  animation: 'grid-champ-stars-in 1s ease-out 1s both',
                  letterSpacing: '4px',
                  filter: `drop-shadow(0 0 6px ${gGold})`,
                }}>✦ ✦ ✦ ✦ ✦</div>
              </div>
            </div>
          );
        })()}

        {/* ── Done matches ── */}
        {doneMatches.length > 0 && (
          <div style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column',
            gap: 'clamp(1px, 0.15vw, 2px)',
            padding: 'clamp(2px, 0.3vw, 4px) clamp(3px, 0.5vw, 8px)',
          }}>
            {doneMatches.map((m, i) => renderDoneRow(m, i))}
          </div>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     MAIN RETURN
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className={`tw-root${isMinimalLayout ? ' tw-root--minimal' : ''}`} style={{
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
        @keyframes grid-loser-fade {
          0%   { opacity: 1; filter: grayscale(0) brightness(1); }
          40%  { filter: grayscale(0.5) brightness(0.8); }
          100% { opacity: 0.35; filter: grayscale(0.85) brightness(0.5); }
        }
        @keyframes grid-flipper-in {
          0%   { opacity: 0; transform: translateY(8px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes grid-live-border {
          0%, 100% { border-color: rgba(0,229,255,0.6); box-shadow: 0 0 10px rgba(0,229,255,0.15); }
          50%      { border-color: rgba(0,229,255,1); box-shadow: 0 0 20px rgba(0,229,255,0.3), 0 0 40px rgba(0,229,255,0.1); }
        }
        @keyframes grid-live-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes grid-line-glow {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }
        @keyframes grid-champion-holo {
          0%   { border-color: #39ff14; box-shadow: 0 0 15px rgba(57,255,20,0.4), 0 0 30px rgba(57,255,20,0.15); }
          33%  { border-color: #00e5ff; box-shadow: 0 0 15px rgba(0,229,255,0.4), 0 0 30px rgba(0,229,255,0.15); }
          66%  { border-color: #fbbf24; box-shadow: 0 0 15px rgba(251,191,36,0.4), 0 0 30px rgba(251,191,36,0.15); }
          100% { border-color: #39ff14; box-shadow: 0 0 15px rgba(57,255,20,0.4), 0 0 30px rgba(57,255,20,0.15); }
        }
        @keyframes grid-holo-sweep {
          0%   { background-position: 200% 200%; }
          100% { background-position: -100% -100%; }
        }
        @keyframes grid-finale-burst {
          0%   { opacity: 0; transform: scale(0.5); }
          50%  { opacity: 1; }
          100% { opacity: 0.6; transform: scale(1); }
        }
        @keyframes grid-sparkle-drift {
          0%   { opacity: 0.3; transform: rotate(0deg); }
          50%  { opacity: 0.6; }
          100% { opacity: 0.3; transform: rotate(360deg); }
        }
        @keyframes grid-winner-scale {
          0%   { opacity: 0; transform: scale(0.3); }
          60%  { opacity: 1; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes grid-champ-overlay-in {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes grid-confetti-fall {
          0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0.9; }
          10%  { opacity: 1; }
          100% { transform: translateY(110vh) translateX(var(--confetti-drift, 0px)) rotate(var(--confetti-spin, 360deg)); opacity: 0; }
        }
        @keyframes grid-champ-card-in {
          0%   { opacity: 0; transform: perspective(800px) rotateX(40deg) rotateY(-15deg) scale(0.3) translateY(40px); }
          60%  { opacity: 1; transform: perspective(800px) rotateX(-5deg) rotateY(5deg) scale(1.05) translateY(-10px); }
          80%  { transform: perspective(800px) rotateX(2deg) rotateY(-2deg) scale(0.98) translateY(2px); }
          100% { opacity: 1; transform: perspective(800px) rotateX(0) rotateY(0) scale(1) translateY(0); }
        }
        @keyframes grid-champ-3d-float {
          0%, 100% { transform: perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0px); }
          25%      { transform: perspective(800px) rotateY(6deg) rotateX(3deg) translateY(-4px); }
          50%      { transform: perspective(800px) rotateY(0deg) rotateX(-3deg) translateY(-6px); }
          75%      { transform: perspective(800px) rotateY(-6deg) rotateX(2deg) translateY(-3px); }
        }
        @keyframes grid-champ-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -100% 0; }
        }
        @keyframes grid-champ-title-in {
          0%   { opacity: 0; transform: translateY(-20px) scale(0.7); }
          60%  { opacity: 1; transform: translateY(2px) scale(1.1); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes grid-champ-name-in {
          0%   { opacity: 0; transform: translateY(15px) scale(0.9); letter-spacing: 12px; }
          100% { opacity: 1; transform: translateY(0) scale(1); letter-spacing: 4px; }
        }
        @keyframes grid-champ-stars-in {
          0%   { opacity: 0; transform: scale(0) rotate(-180deg); }
          60%  { opacity: 1; transform: scale(1.2) rotate(10deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
      `}</style>

      {/* ── Layout-specific content ── */}
      {layout === 'scoreboard' ? renderScoreboard()
        : layout === 'esports' ? renderEsports()
        : layout === 'arena' ? renderArena()
        : layout === 'grid' ? renderGrid()
        : (layout === 'vertical' || layout === 'minimal') ? renderVertical()
        : renderEsports()}
    </div>
  );
}

export default React.memo(TournamentWidget);
