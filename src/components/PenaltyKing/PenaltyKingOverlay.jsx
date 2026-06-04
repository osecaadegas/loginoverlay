import { useState, useEffect, useRef, useCallback } from 'react';
import './PenaltyKingOverlay.css';

// ─── Constants ───────────────────────────────────────────────
const MULTIPLIERS = [1.2, 1.5, 2.0, 3.0, 5.0, 8.0, 12.0, 20.0];
const POLL_INTERVAL = 2000;
const ANIM_ANNOUNCE_MS = 900;
const ANIM_COUNTDOWN_MS = 700;
const ANIM_KICK_MS = 800;
const ANIM_DIVE_MS = 700;
const ANIM_RESULT_MS = 2000;
const ANIM_CELEBRATION_MS = 2500;

// Which column a spot belongs to (for GK dive direction)
// Spots: 1=top-left, 2=top-center, 3=top-right, 4=bot-left, 5=bot-center, 6=bot-right
const SPOT_COL = { 1: 'left', 2: 'center', 3: 'right', 4: 'left', 5: 'center', 6: 'right' };
const SPOT_ROW = { 1: 'top', 2: 'top', 3: 'top', 4: 'bottom', 5: 'bottom', 6: 'bottom' };

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getMultiplier(idx) {
  return MULTIPLIERS[Math.min(idx ?? 0, MULTIPLIERS.length - 1)];
}

export default function PenaltyKingOverlay({ config = {} }) {
  const { streamer_id } = config;

  const [gameData, setGameData] = useState({ session: null, shots: [], multipliers: MULTIPLIERS });
  const [animPhase, setAnimPhase] = useState('idle');
  const [countdown, setCountdown] = useState(null);
  const [decisionSeconds, setDecisionSeconds] = useState(null);

  const animatingRef   = useRef(false);
  const lastShotAtRef  = useRef(null);
  const lastRevealedRef = useRef(null);
  const decisionTimerRef = useRef(null);

  // ─── Fetch state ────────────────────────────────────────────
  const fetchState = useCallback(async () => {
    if (!streamer_id) return null;
    try {
      const r = await fetch(
        `/api/chat-commands?action=get_state&streamer_id=${encodeURIComponent(streamer_id)}`
      );
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }, [streamer_id]);

  const revealShot = useCallback(async () => {
    if (!streamer_id) return;
    try {
      await fetch('/api/chat-commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reveal_shot', streamer_id }),
      });
    } catch { /* ok */ }
  }, [streamer_id]);

  // ─── Decision countdown ──────────────────────────────────────
  const startDecisionTimer = useCallback((deadline) => {
    if (decisionTimerRef.current) clearInterval(decisionTimerRef.current);
    decisionTimerRef.current = setInterval(() => {
      const secs = Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000));
      setDecisionSeconds(secs);
      if (secs <= 0) clearInterval(decisionTimerRef.current);
    }, 500);
  }, []);

  const stopDecisionTimer = useCallback(() => {
    if (decisionTimerRef.current) clearInterval(decisionTimerRef.current);
    setDecisionSeconds(null);
  }, []);

  // ─── Animation sequence ──────────────────────────────────────
  const runAnimation = useCallback(async (session) => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    lastShotAtRef.current = session.shot_at;

    try {
      setAnimPhase('announce');
      await delay(ANIM_ANNOUNCE_MS);

      for (let i = 3; i >= 1; i--) {
        setCountdown(i);
        setAnimPhase('countdown');
        await delay(ANIM_COUNTDOWN_MS);
      }
      setCountdown(null);

      setAnimPhase('kick');
      await delay(ANIM_KICK_MS);

      setAnimPhase('dive');
      await delay(ANIM_DIVE_MS);

      // Call API to finalize result
      await revealShot();

      setAnimPhase(session.is_goal ? 'goal' : 'saved');
      await delay(ANIM_RESULT_MS);

      if (session.is_goal) {
        setAnimPhase('celebration');
        await delay(ANIM_CELEBRATION_MS);
      }

      // Re-fetch to get updated state
      const data = await fetchState();
      if (data) {
        setGameData(data);
        if (data.session?.status === 'waiting_decision') {
          setAnimPhase('decision');
          lastRevealedRef.current = data.session.id + data.session.streak;
          startDecisionTimer(data.session.decision_deadline);
        } else {
          setAnimPhase('ended');
        }
      } else {
        setAnimPhase('idle');
      }
    } finally {
      animatingRef.current = false;
    }
  }, [fetchState, revealShot, startDecisionTimer]);

  // ─── Polling loop ────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function poll() {
      if (!mounted) return;
      const data = await fetchState();
      if (!mounted || !data) return;
      const { session } = data;

      setGameData(data);

      if (!session) {
        setAnimPhase('idle');
        stopDecisionTimer();
        animatingRef.current = false;
        return;
      }

      if (session.status === 'shooting' && !animatingRef.current) {
        // Detect new shot (different shot_at than last animated)
        const shotKey = session.shot_at;
        if (shotKey && shotKey !== lastShotAtRef.current) {
          stopDecisionTimer();
          runAnimation(session);
          return;
        }
        // If we already animated this shot but haven't revealed yet (edge case)
      }

      if (session.status === 'waiting_decision' && !animatingRef.current) {
        const revealKey = session.id + session.streak;
        if (revealKey !== lastRevealedRef.current) {
          lastRevealedRef.current = revealKey;
          setAnimPhase('decision');
          startDecisionTimer(session.decision_deadline);
        }
        return;
      }

      if (session.status === 'ended' && !animatingRef.current) {
        setAnimPhase('ended');
        stopDecisionTimer();
      }
    }

    const timer = setInterval(poll, POLL_INTERVAL);
    poll(); // immediate first poll
    return () => {
      mounted = false;
      clearInterval(timer);
      stopDecisionTimer();
    };
  }, [fetchState, runAnimation, startDecisionTimer, stopDecisionTimer]);

  // ─── Derived state ───────────────────────────────────────────
  const { session, shots } = gameData;
  const streak      = session?.streak ?? 0;
  const multIdx     = session?.multiplier_idx ?? 0;
  const multiplier  = getMultiplier(multIdx);
  const potential   = session ? Math.floor(session.wager * multiplier) : 0;
  const isBossMode  = streak >= 5;
  const isLegend    = streak >= 10;

  // Which spot the player aimed at (current / last shot)
  const currentShotSpot = session?.shot_spot;
  const currentGkSpot   = session?.gk_spot;
  const gkDir = currentGkSpot ? SPOT_COL[currentGkSpot] : 'center';
  const gkRow = currentGkSpot ? SPOT_ROW[currentGkSpot] : null;

  const showPitch    = animPhase !== 'idle';
  const showBall     = ['kick', 'dive', 'goal', 'saved'].includes(animPhase);
  const showResult   = ['goal', 'saved', 'celebration', 'decision', 'ended'].includes(animPhase);
  const isGoalResult = session?.is_goal;

  // Build shot history (most recent first, max 8)
  const recentShots = [...shots].reverse().slice(0, 8);

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className={[
      'pk-overlay',
      isBossMode && 'pk-boss-mode',
      isLegend   && 'pk-legend-mode',
      `pk-phase-${animPhase}`,
    ].filter(Boolean).join(' ')}>

      {/* Idle state – shows goal preview with standing GK */}
      {animPhase === 'idle' && (
        <div className="pk-idle">
          <h1 className="pk-idle__title">⚽ PENALTY KING</h1>
          <p className="pk-idle__cmd">!remate [pontos] [spot 1-6]</p>

          {/* Goal preview with GK */}
          <div className="pk-idle__pitch">
            <div className="pk-idle__goal">
              <div className="pk-goal__crossbar" />
              <div className="pk-goal__post pk-goal__post--left" />
              <div className="pk-goal__post pk-goal__post--right" />
              <div className="pk-idle__spots">
                {[1,2,3,4,5,6].map(n => (
                  <div key={n} className="pk-spot">
                    <span className="pk-spot__label">{n}</span>
                  </div>
                ))}
              </div>
              {/* Standing goalkeeper */}
              <div className="pk-gk pk-gk--idle">
                <div className="pk-gk__head">😤</div>
                <div className="pk-gk__torso">
                  <span className="pk-gk__glove">🧤</span>
                  <span className="pk-gk__label">GK</span>
                  <span className="pk-gk__glove">🧤</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active game panel */}
      {session && animPhase !== 'idle' && (
        <div className={['pk-game', isBossMode && 'pk-game--boss', isLegend && 'pk-game--legend'].filter(Boolean).join(' ')}>

          {/* Header */}
          <div className="pk-header">
            <span className="pk-header__title">⚽ PENALTY KING</span>
            {isBossMode && <span className="pk-header__boss">🔥 BOSS MODE</span>}
            {isLegend   && <span className="pk-header__legend">👑 LEGEND</span>}
          </div>

          {/* Main content row */}
          <div className="pk-content">

            {/* Left: Player info */}
            <div className="pk-player">
              <div className="pk-player__avatar">⚽</div>
              <div className="pk-player__name">{session.player_username}</div>
              <div className="pk-player__wager">{session.wager.toLocaleString()} pts wagered</div>

              {/* Streak dots */}
              <div className="pk-streak">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span
                    key={i}
                    className={['pk-streak__dot', i < streak ? 'pk-streak__dot--lit' : ''].filter(Boolean).join(' ')}
                  >
                    {i < streak ? '⚽' : '⚪'}
                  </span>
                ))}
              </div>

              <div className="pk-multiplier">
                <span className="pk-multiplier__label">MULTIPLIER</span>
                <span className={['pk-multiplier__value', isBossMode && 'pk-multiplier__value--boss'].filter(Boolean).join(' ')}>
                  {multiplier}x
                </span>
              </div>

              {animPhase === 'decision' && (
                <div className="pk-potential">
                  <span className="pk-potential__label">POTENTIAL</span>
                  <span className="pk-potential__value">{potential.toLocaleString()} pts</span>
                </div>
              )}
            </div>

            {/* Center: Pitch + Goal */}
            <div className="pk-pitch">

              {/* Announce banner */}
              {animPhase === 'announce' && (
                <div className="pk-announce">
                  <span className="pk-announce__name">{session.player_username}</span>
                  <span className="pk-announce__text">steps up…</span>
                </div>
              )}

              {/* Countdown */}
              {animPhase === 'countdown' && countdown !== null && (
                <div className="pk-countdown">{countdown}</div>
              )}

              {/* Goal frame */}
              <div className="pk-goal">
                <div className="pk-goal__crossbar" />
                <div className="pk-goal__post pk-goal__post--left" />
                <div className="pk-goal__post pk-goal__post--right" />

                {/* 6-spot grid */}
                <div className="pk-spots">
                  {[1,2,3,4,5,6].map(n => (
                    <div
                      key={n}
                      className={[
                        'pk-spot',
                        currentShotSpot === n && showBall ? 'pk-spot--target' : '',
                        currentGkSpot   === n && showBall ? 'pk-spot--defended' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <span className="pk-spot__label">{n}</span>
                    </div>
                  ))}
                </div>

                {/* Goalkeeper */}
                <div className={[
                  'pk-gk',
                  ['kick','dive','goal','saved','celebration'].includes(animPhase) && `pk-gk--dive-${gkDir}`,
                  gkRow && ['kick','dive','goal','saved'].includes(animPhase) && `pk-gk--row-${gkRow}`,
                  animPhase === 'goal' && 'pk-gk--beaten',
                  animPhase === 'saved' && 'pk-gk--saved',
                ].filter(Boolean).join(' ')}>
                  <div className="pk-gk__head">😤</div>
                  <div className="pk-gk__torso">
                    <span className="pk-gk__glove pk-gk__glove--l">🧤</span>
                    <span className="pk-gk__label">GK</span>
                    <span className="pk-gk__glove pk-gk__glove--r">🧤</span>
                  </div>
                </div>

                {/* Ball */}
                {showBall && currentShotSpot && (
                  <div className={[
                    'pk-ball',
                    `pk-ball--spot-${currentShotSpot}`,
                    animPhase === 'kick' && 'pk-ball--flying',
                  ].filter(Boolean).join(' ')}>
                    ⚽
                  </div>
                )}
              </div>

              {/* Result banner */}
              {showResult && (
                <div className={[
                  'pk-result',
                  isGoalResult && 'pk-result--goal',
                  !isGoalResult && 'pk-result--saved',
                ].filter(Boolean).join(' ')}>
                  {isGoalResult
                    ? (streak >= 10 ? '🏆 LEGENDARY!' : streak >= 5 ? '🔥 GOOOAL!' : '⚽ GOAL!')
                    : '🧤 SAVED!'}
                </div>
              )}

              {/* Decision prompt */}
              {animPhase === 'decision' && (
                <div className="pk-decision">
                  <div className="pk-decision__timer">{decisionSeconds ?? 30}s</div>
                  <div className="pk-decision__actions">
                    <span className="pk-decision__cashout">!cashout → {potential.toLocaleString()} pts</span>
                    <span className="pk-decision__or">or</span>
                    <span className="pk-decision__continue">!continue [spot] → risk it</span>
                  </div>
                </div>
              )}

              {/* Final ended screen */}
              {animPhase === 'ended' && session.status === 'ended' && (
                <div className="pk-ended">
                  {(session.final_payout ?? 0) > 0 ? (
                    <>
                      <div className="pk-ended__emoji">💰</div>
                      <div className="pk-ended__label">CASHED OUT</div>
                      <div className="pk-ended__payout">{(session.final_payout ?? 0).toLocaleString()} pts</div>
                    </>
                  ) : (
                    <>
                      <div className="pk-ended__emoji">😢</div>
                      <div className="pk-ended__label">SHOT SAVED</div>
                      <div className="pk-ended__sublabel">Streak: {session.streak} goals</div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right: Shot history */}
            <div className="pk-history">
              <div className="pk-history__title">SHOTS</div>
              {recentShots.length === 0 && (
                <div className="pk-history__empty">—</div>
              )}
              {recentShots.map((s, i) => (
                <div key={s.id ?? i} className={['pk-history__item', s.is_goal ? 'pk-history__item--goal' : 'pk-history__item--miss'].join(' ')}>
                  <span className="pk-history__icon">{s.is_goal ? '⚽' : '❌'}</span>
                  <span className="pk-history__mult">{Number(s.multiplier).toFixed(1)}x</span>
                  <span className="pk-history__spots">
                    {s.spot_chosen}→{s.gk_spot}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Boss mode fire overlay */}
      {isBossMode && animPhase !== 'idle' && (
        <div className="pk-fire-border" aria-hidden="true">
          <div className="pk-fire-border__inner" />
        </div>
      )}
    </div>
  );
}
