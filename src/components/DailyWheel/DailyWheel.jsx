import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';
import './DailyWheel.css';

// SVG pie slice path generator
function getPieSlice(cx, cy, r, startAngle, endAngle) {
  const toRad = (deg) => ((deg - 90) * Math.PI) / 180;
  const start = { x: cx + r * Math.cos(toRad(endAngle)), y: cy + r * Math.sin(toRad(endAngle)) };
  const end = { x: cx + r * Math.cos(toRad(startAngle)), y: cy + r * Math.sin(toRad(startAngle)) };
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} L ${cx} ${cy} Z`;
}

// Default fallback prizes
const DEFAULT_PRIZES = [
  { id: '1', label: '500 Points', icon: '💰', color: '#1e293b', text_color: '#f8fafc', se_points: 500, probability: 15, display_order: 1 },
  { id: '2', label: 'FREE SPIN', icon: '🔄', color: '#6366f1', text_color: '#ffffff', se_points: 0, probability: 5, display_order: 2 },
  { id: '3', label: '100 Points', icon: '🔥', color: '#334155', text_color: '#f8fafc', se_points: 100, probability: 20, display_order: 3 },
  { id: '4', label: '1,000 Points', icon: '💵', color: '#eab308', text_color: '#422006', se_points: 1000, probability: 10, display_order: 4 },
  { id: '5', label: 'NOTHING', icon: '💀', color: '#0f172a', text_color: '#64748b', se_points: 0, probability: 25, display_order: 5 },
  { id: '6', label: 'JACKPOT', icon: '👑', color: '#ef4444', text_color: '#ffffff', se_points: 5000, probability: 2, display_order: 6 },
  { id: '7', label: 'TRY AGAIN', icon: '❌', color: '#1e293b', text_color: '#94a3b8', se_points: 0, probability: 18, display_order: 7 },
  { id: '8', label: '250 Points', icon: '💎', color: '#f59e0b', text_color: '#451a03', se_points: 250, probability: 5, display_order: 8 },
];

// Map prize types to reference color palette
function mapPrizeColor(prize, index) {
  const refColors = ['#1e293b', '#334155', '#1e293b', '#334155', '#1e293b', '#334155', '#1e293b', '#334155'];
  const refTextColors = ['#f8fafc', '#f8fafc', '#f8fafc', '#f8fafc', '#f8fafc', '#f8fafc', '#f8fafc', '#f8fafc'];

  const label = (prize.label || '').toLowerCase();
  const isJackpot = label.includes('jackpot');
  const isRespin = label.includes('free') || label.includes('respin');
  const isTryAgain = label.includes('try again');
  const isNothing = label.includes('nothing');
  const hasHighPoints = prize.se_points >= 1000;
  const hasMedPoints = prize.se_points >= 250 && prize.se_points < 1000;

  if (isJackpot) return { color: '#ef4444', text_color: '#ffffff', type: 'jackpot' };
  if (isRespin) return { color: '#6366f1', text_color: '#ffffff', type: 'respin' };
  if (isTryAgain || isNothing) return { color: '#0f172a', text_color: '#64748b', type: 'try_again' };
  if (hasHighPoints) return { color: '#eab308', text_color: '#422006', type: 'win' };
  if (hasMedPoints) return { color: '#f59e0b', text_color: '#451a03', type: 'win' };

  const ci = index % refColors.length;
  return { color: refColors[ci], text_color: refTextColors[ci], type: 'points' };
}

export default function DailyWheel() {
  const { user } = useAuth();
  const [prizes, setPrizes] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [wonPrize, setWonPrize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentSpins, setRecentSpins] = useState([]);
  const [pointsAwarded, setPointsAwarded] = useState(null);
  const [spinsPage, setSpinsPage] = useState(1);
  const SPINS_PER_PAGE = 10;

  const wheelRef = useRef(null);
  const audioContextRef = useRef(null);
  const currentRotationRef = useRef(0);
  const lastSegmentIndexRef = useRef(-1);

  // SVG constants
  const SVG_SIZE = 400;
  const RADIUS = 190; // slightly less than half to leave room for rim
  const CENTER = 200;

  useEffect(() => {
    loadPrizes();
    if (user) {
      checkSpinAvailability();
    }
    fetchRecentSpins();
  }, [user]);

  // Enhanced prize data with reference colors
  const enhancedPrizes = useMemo(() => {
    return prizes.map((prize, i) => {
      const mapped = mapPrizeColor(prize, i);
      return { ...prize, mappedColor: mapped.color, mappedTextColor: mapped.text_color, prizeType: mapped.type };
    });
  }, [prizes]);

  // ---- Supabase Logic (unchanged) ----
  const loadPrizes = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_wheel_prizes')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Database error - using default prizes:', error);
        setPrizes(DEFAULT_PRIZES);
        setLoading(false);
        return;
      }

      setPrizes(data && data.length > 0 ? data : DEFAULT_PRIZES);
      setLoading(false);
    } catch (error) {
      console.error('Error loading prizes:', error);
      setPrizes(DEFAULT_PRIZES);
      setLoading(false);
    }
  };

  const checkSpinAvailability = async () => {
    if (!user) {
      setCanSpin(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('can_user_spin_today', {
        p_user_id: user.id
      });

      if (error) {
        console.warn('Database function not found - allowing spin for demo:', error.message);
        setCanSpin(true);
        return;
      }

      setCanSpin(data);
      if (!data) startCountdown();
    } catch (error) {
      console.error('Error checking spin availability:', error);
      setCanSpin(true);
    }
  };

  const startCountdown = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_next_spin_time', {
        p_user_id: user.id
      });

      if (error) throw error;

      const updateTimer = () => {
        const now = new Date().getTime();
        const nextSpin = new Date(data).getTime();
        const timeLeft = nextSpin - now;

        if (timeLeft > 0) {
          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

          setCountdown(
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          );
          setTimeout(updateTimer, 1000);
        } else {
          setCanSpin(true);
          setCountdown('');
        }
      };

      updateTimer();
    } catch (error) {
      console.error('Error getting next spin time:', error);
    }
  };

  const fetchRecentSpins = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_wheel_spins')
        .select('*')
        .order('spin_date', { ascending: false })
        .limit(100);

      if (error) throw error;

      const { data: seAccounts } = await supabase
        .from('streamelements_connections')
        .select('user_id, se_username');

      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, twitch_username');

      const seUsernameMap = {};
      if (seAccounts) {
        seAccounts.forEach(account => {
          seUsernameMap[account.user_id] = account.se_username;
        });
      }

      const twitchUsernameMap = {};
      if (userProfiles) {
        userProfiles.forEach(profile => {
          if (profile.twitch_username) {
            twitchUsernameMap[profile.user_id] = profile.twitch_username;
          }
        });
      }

      const enriched = data?.map(spin => ({
        ...spin,
        username: seUsernameMap[spin.user_id] || twitchUsernameMap[spin.user_id] || 'Unknown User'
      })) || [];

      setRecentSpins(enriched);
    } catch (error) {
      console.error('Error fetching recent spins:', error);
    }
  };

  // ---- Sound Effects (preserved exactly) ----
  const playSpinSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.25);
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  };

  const playTickSound = () => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  };

  const playWinSound = () => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  };

  // ---- Prize Selection (unchanged) ----
  const selectPrizeWeighted = () => {
    const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0);
    let random = Math.random() * totalProbability;

    for (let i = 0; i < prizes.length; i++) {
      random -= prizes[i].probability;
      if (random <= 0) return i;
    }
    return 0;
  };

  // ---- Spin Animation (SVG rotation via transform) ----
  const spin = async () => {
    if (isSpinning || !canSpin || !user || prizes.length === 0) return;

    setIsSpinning(true);
    playSpinSound();

    const currentRotation = currentRotationRef.current;
    const winningIndex = selectPrizeWeighted();
    const winningPrize = prizes[winningIndex];

    const numSegments = prizes.length;
    const degreesPerSegment = 360 / numSegments;

    // Pointer is at TOP (0 degrees). Segment i center is at i*dps + dps/2.
    // We rotate the wheel clockwise so winning segment aligns under the pointer.
    const segmentCenter = winningIndex * degreesPerSegment + degreesPerSegment / 2;

    let rotationToAdd = 360 - segmentCenter - (currentRotation % 360);
    while (rotationToAdd < 360) rotationToAdd += 360;

    const extraFullSpins = 7 + Math.floor(Math.random() * 5);
    rotationToAdd += extraFullSpins * 360;

    const targetRotation = currentRotation + rotationToAdd;
    const duration = 5000;
    const startTime = performance.now();
    const startRotation = currentRotation;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    lastSegmentIndexRef.current = -1;

    const animateFrame = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const currentPos = startRotation + rotationToAdd * eased;

      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${currentPos}deg)`;
      }

      // Tick sound on segment boundary
      const currentAngle = currentPos % 360;
      const angleAtPointer = (360 - currentAngle + 360) % 360;
      const currentSegmentIndex = Math.floor(angleAtPointer / degreesPerSegment) % numSegments;

      if (currentSegmentIndex !== lastSegmentIndexRef.current) {
        if (lastSegmentIndexRef.current !== -1) playTickSound();
        lastSegmentIndexRef.current = currentSegmentIndex;
      }

      if (progress < 1) {
        requestAnimationFrame(animateFrame);
      } else {
        if (wheelRef.current) {
          wheelRef.current.style.transform = `rotate(${targetRotation}deg)`;
        }
        currentRotationRef.current = targetRotation;
        setIsSpinning(false);

        setTimeout(() => {
          handleWin(winningPrize);
        }, 300);
      }
    };

    requestAnimationFrame(animateFrame);
  };

  // ---- Handle Win (unchanged, with confetti) ----
  const handleWin = async (prize) => {
    playWinSound();
    setWonPrize(prize);
    setPointsAwarded(null);
    setShowModal(true);

    const isJackpot = prize.label?.toLowerCase().includes('jackpot');

    if (isJackpot) {
      const end = Date.now() + 3000;
      const frame = () => {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#ef4444', '#eab308', '#ffffff'] });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ef4444', '#eab308', '#ffffff'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } else if (prize.se_points > 0) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#eab308', '#ffffff'] });
    }

    try {
      const { error } = await supabase
        .from('daily_wheel_spins')
        .insert({
          user_id: user.id,
          prize_id: prize.id,
          prize_label: prize.label,
          se_points_won: prize.se_points
        });

      if (error) console.error('Error recording spin:', error);

      if (prize.se_points > 0) {
        const result = await awardPoints(prize.se_points);
        if (result?.success) {
          setPointsAwarded({ success: true, points: prize.se_points });
        } else {
          setPointsAwarded({ success: false, error: result?.error || 'Unknown error' });
        }
      }

      setCanSpin(false);
      startCountdown();
      fetchRecentSpins();
    } catch (error) {
      console.error('Error in handleWin:', error);
    }
  };

  // ---- Award Points (unchanged) ----
  const awardPoints = async (points) => {
    try {
      let seUsername = null;

      const { data: seConnection } = await supabase
        .from('streamelements_connections')
        .select('se_username')
        .eq('user_id', user.id)
        .single();

      if (seConnection?.se_username) {
        seUsername = seConnection.se_username;
      } else {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('streamelements_username, twitch_username')
          .eq('id', user.id)
          .single();

        if (profile?.streamelements_username) {
          seUsername = profile.streamelements_username;
        } else if (profile?.twitch_username) {
          seUsername = profile.twitch_username;
        }
      }

      if (!seUsername && user.user_metadata) {
        const meta = user.user_metadata;
        seUsername = meta.preferred_username || meta.name || meta.user_name;
      }

      if (!seUsername) {
        return { success: false, error: 'No StreamElements username found' };
      }

      const response = await fetch('/api/streamelements/award-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: seUsername, points })
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to award points');
      }

      return { success: true, data: responseData };
    } catch (error) {
      console.error('Error awarding points:', error);
      return { success: false, error: error.message };
    }
  };

  // ========== RENDER ==========

  if (loading) {
    return (
      <div className="dw-page">
        <div className="dw-loading">
          <div className="dw-spinner" />
          <span>Loading wheel...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dw-page">
        <div className="dw-login-prompt">
          <h2>DAILY WHEEL</h2>
          <p>Please log in to spin the wheel</p>
        </div>
      </div>
    );
  }

  const segmentCount = enhancedPrizes.length;
  const anglePerSegment = segmentCount > 0 ? 360 / segmentCount : 45;
  const isButtonDisabled = loading || isSpinning || prizes.length === 0;
  const isJackpotWin = wonPrize?.label?.toLowerCase().includes('jackpot');
  const isTryAgainWin = wonPrize?.se_points === 0 && !wonPrize?.label?.toLowerCase().includes('free') && !wonPrize?.label?.toLowerCase().includes('respin');

  return (
    <div className="dw-page">
      {/* Background ambient glows */}
      <div className="dw-bg-glow dw-bg-glow-1" />
      <div className="dw-bg-glow dw-bg-glow-2" />

      <div className="dw-content">
        {/* Title */}
        <header className="dw-header">
          <h1 className="dw-title">DAILY WHEEL</h1>
          <p className="dw-subtitle">Spin to win premium rewards</p>
        </header>

        {/* Wheel Assembly */}
        <div className="dw-wheel-assembly">
          {/* Pointer */}
          <div className={`dw-pointer ${isSpinning ? 'dw-pointer-wobble' : ''}`}>
            <div className="dw-pointer-base">
              <svg viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg" className="dw-pointer-svg">
                <defs>
                  <linearGradient id="pointerGold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fde68a" />
                    <stop offset="50%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#a16207" />
                  </linearGradient>
                </defs>
                <polygon points="20,48 4,8 36,8" fill="url(#pointerGold)" />
                <polygon points="20,48 4,8 36,8" fill="none" stroke="#854d0e" strokeWidth="1.5" />
                <ellipse cx="20" cy="16" rx="5" ry="5" fill="white" opacity="0.25" />
              </svg>
            </div>
          </div>

          {/* Outer golden rim */}
          <div className="dw-outer-rim">
            {/* Inner dark border */}
            <div className="dw-inner-rim">
              {/* Rotating wheel */}
              <div className="dw-wheel-rotate" ref={wheelRef}>
                <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="dw-wheel-svg">
                  <defs>
                    <radialGradient id="jackpotGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#991b1b" />
                    </radialGradient>
                    <filter id="neonGlow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {enhancedPrizes.map((prize, i) => {
                    const startAngle = i * anglePerSegment;
                    const endAngle = startAngle + anglePerSegment;
                    const midAngle = startAngle + anglePerSegment / 2;
                    const isJackpot = prize.prizeType === 'jackpot';

                    // Text position along radius
                    const textRadius = RADIUS * 0.62;
                    const textAngleRad = ((midAngle - 90) * Math.PI) / 180;
                    const textX = CENTER + textRadius * Math.cos(textAngleRad);
                    const textY = CENTER + textRadius * Math.sin(textAngleRad);

                    // Icon position
                    const iconRadius = RADIUS * 0.82;
                    const iconX = CENTER + iconRadius * Math.cos(textAngleRad);
                    const iconY = CENTER + iconRadius * Math.sin(textAngleRad);

                    return (
                      <g key={prize.id || i}>
                        {/* Segment slice */}
                        <path
                          d={getPieSlice(CENTER, CENTER, RADIUS, startAngle, endAngle)}
                          fill={isJackpot ? 'url(#jackpotGlow)' : prize.mappedColor}
                          stroke="rgba(30,41,59,0.8)"
                          strokeWidth="1.5"
                        />
                        {/* Jackpot neon edge */}
                        {isJackpot && (
                          <path
                            d={getPieSlice(CENTER, CENTER, RADIUS, startAngle, endAngle)}
                            fill="none"
                            stroke="#fca5a5"
                            strokeWidth="2.5"
                            filter="url(#neonGlow)"
                          />
                        )}
                        {/* Icon emoji */}
                        <text
                          x={iconX}
                          y={iconY}
                          textAnchor="middle"
                          dominantBaseline="central"
                          transform={`rotate(${midAngle}, ${iconX}, ${iconY})`}
                          className="dw-segment-icon"
                        >
                          {prize.icon}
                        </text>
                        {/* Label text */}
                        <text
                          x={textX}
                          y={textY}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={prize.mappedTextColor}
                          transform={`rotate(${midAngle}, ${textX}, ${textY})`}
                          className="dw-segment-text"
                        >
                          {prize.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Center logo knob */}
              <div className="dw-center-knob">
                <img src="/newlogo.png" alt="Logo" className="dw-center-logo" draggable={false} />
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="dw-controls">
          {!canSpin && !isSpinning && countdown && (
            <div className="dw-countdown">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="dw-countdown-time">{countdown}</span>
            </div>
          )}

          <button
            onClick={spin}
            disabled={isButtonDisabled}
            className={`dw-spin-btn ${isButtonDisabled ? 'dw-spin-btn-disabled' : ''}`}
          >
            {loading ? (
              <span className="dw-btn-loading">
                <div className="dw-spinner-small" />
                PREPARING...
              </span>
            ) : isSpinning ? (
              'SPINNING...'
            ) : (
              'SPIN THE WHEEL'
            )}
            {!isButtonDisabled && <div className="dw-btn-shine" />}
          </button>

          {!loading && canSpin && !isSpinning && (
            <div className="dw-status-ready">&#10003; Ready to spin!</div>
          )}

          {!loading && !canSpin && !countdown && !isSpinning && (
            <div className="dw-status-info">One free spin every 24 hours</div>
          )}
        </div>
      </div>

      {/* Winner Modal */}
      {showModal && wonPrize && (
        <div className="dw-modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className={`dw-modal ${isJackpotWin ? 'dw-modal-jackpot' : isTryAgainWin ? 'dw-modal-lose' : 'dw-modal-win'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="dw-modal-close" onClick={() => setShowModal(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {isJackpotWin && <div className="dw-modal-glow" />}

            <div className="dw-modal-body">
              <h2 className={`dw-modal-title ${isJackpotWin ? 'dw-modal-title-jackpot' : isTryAgainWin ? 'dw-modal-title-lose' : 'dw-modal-title-win'}`}>
                {isJackpotWin ? 'MEGA JACKPOT!' : wonPrize.se_points > 0 ? 'YOU WON!' : wonPrize.label?.toLowerCase().includes('free') || wonPrize.label?.toLowerCase().includes('respin') ? 'FREE RESPIN!' : 'UNLUCKY'}
              </h2>

              <div className="dw-modal-icon">{wonPrize.icon}</div>

              <p className="dw-modal-desc">
                {isJackpotWin 
                  ? 'You hit the ultra-rare jackpot!'
                  : wonPrize.se_points > 0
                    ? `${wonPrize.se_points.toLocaleString()} SE Points have been added!`
                    : wonPrize.label?.toLowerCase().includes('free') || wonPrize.label?.toLowerCase().includes('respin')
                      ? 'Spin the wheel one more time!'
                      : 'Better luck next time. Come back tomorrow!'}
              </p>

              {wonPrize.se_points > 0 && (
                <div className="dw-modal-points">
                  +{wonPrize.se_points.toLocaleString()}
                </div>
              )}

              {wonPrize.se_points > 0 && pointsAwarded !== null && (
                <p className={`dw-modal-points-status ${pointsAwarded.success ? 'success' : 'error'}`}>
                  {pointsAwarded.success
                    ? '✅ Points added to your balance!'
                    : `⚠️ ${pointsAwarded.error || 'Could not add points. Please contact support.'}`}
                </p>
              )}

              <button
                onClick={() => setShowModal(false)}
                className={`dw-modal-btn ${isJackpotWin ? 'dw-modal-btn-jackpot' : isTryAgainWin ? 'dw-modal-btn-lose' : 'dw-modal-btn-win'}`}
              >
                AWESOME
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Spins History */}
      {recentSpins.length > 0 && (() => {
        const totalPages = Math.ceil(recentSpins.length / SPINS_PER_PAGE);
        const paginatedSpins = recentSpins.slice((spinsPage - 1) * SPINS_PER_PAGE, spinsPage * SPINS_PER_PAGE);
        return (
          <div className="dw-history">
            <h2 className="dw-history-title">Recent Spins</h2>
            <div className="dw-history-table">
              <div className="dw-history-header">
                <div className="dw-history-cell">Prize</div>
                <div className="dw-history-cell">Nickname</div>
                <div className="dw-history-cell">Points</div>
                <div className="dw-history-cell">Date</div>
              </div>
              <div className="dw-history-body">
                {paginatedSpins.map((spin, index) => (
                  <div key={index} className="dw-history-row">
                    <div className="dw-history-cell prize">{spin.prize_label}</div>
                    <div className="dw-history-cell username">{spin.username}</div>
                    <div className="dw-history-cell points">
                      {spin.se_points_won > 0 ? `+${spin.se_points_won.toLocaleString()} pts` : '-'}
                    </div>
                    <div className="dw-history-cell date">
                      {new Date(spin.spin_date).toLocaleDateString('en-US', {
                        month: '2-digit', day: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {totalPages > 1 && (
              <div className="dw-pagination">
                <button
                  onClick={() => setSpinsPage(p => Math.max(1, p - 1))}
                  disabled={spinsPage === 1}
                  className="dw-page-btn"
                >&#8592;</button>
                <span className="dw-page-info">Page {spinsPage} of {totalPages}</span>
                <button
                  onClick={() => setSpinsPage(p => Math.min(totalPages, p + 1))}
                  disabled={spinsPage === totalPages}
                  className="dw-page-btn"
                >&#8594;</button>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
