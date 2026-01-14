import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';
import './DailyWheel.css';

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
  
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const currentRotationRef = useRef(0);
  const lastSegmentIndexRef = useRef(-1);

  useEffect(() => {
    loadPrizes();
    if (user) {
      checkSpinAvailability();
    }
    fetchRecentSpins();
  }, [user]);

  const loadPrizes = async () => {
    console.log('Loading prizes...');
    try {
      const { data, error } = await supabase
        .from('daily_wheel_prizes')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Database error - using default prizes:', error);
        // Use default prizes if table doesn't exist
        setPrizes([
          { id: '1', label: '500 Points', icon: '💰', color: '#1a1a1a', text_color: '#ffffff', se_points: 500, probability: 15, display_order: 1 },
          { id: '2', label: 'FREE SPIN', icon: '🔄', color: '#e63946', text_color: '#ffffff', se_points: 0, probability: 5, display_order: 2 },
          { id: '3', label: '100 Points', icon: '🔥', color: '#1a1a1a', text_color: '#ffffff', se_points: 100, probability: 20, display_order: 3 },
          { id: '4', label: '1,000 Points', icon: '💵', color: '#ffcf40', text_color: '#000000', se_points: 1000, probability: 10, display_order: 4 },
          { id: '5', label: 'NOTHING', icon: '💀', color: '#1a1a1a', text_color: '#ffffff', se_points: 0, probability: 25, display_order: 5 },
          { id: '6', label: 'JACKPOT', icon: '👑', color: '#8e44ad', text_color: '#ffffff', se_points: 5000, probability: 2, display_order: 6 },
          { id: '7', label: 'TRY AGAIN', icon: '❌', color: '#1a1a1a', text_color: '#ffffff', se_points: 0, probability: 18, display_order: 7 },
          { id: '8', label: '250 Points', icon: '💎', color: '#3498db', text_color: '#ffffff', se_points: 250, probability: 5, display_order: 8 },
        ]);
        setLoading(false);
        return;
      }
      
      console.log('Loaded prizes from database:', data?.length);
      setPrizes(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading prizes:', error);
      setLoading(false);
    }
  };

  const checkSpinAvailability = async () => {
    console.log('Checking spin availability for user:', user?.id);
    
    if (!user) {
      console.log('No user logged in');
      setCanSpin(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('can_user_spin_today', {
        p_user_id: user.id
      });

      if (error) {
        console.warn('Database function not found - allowing spin for demo:', error.message);
        // If function doesn't exist, allow spin
        setCanSpin(true);
        return;
      }
      
      console.log('Can spin today:', data);
      setCanSpin(data);

      if (!data) {
        startCountdown();
      }
    } catch (error) {
      console.error('Error checking spin availability:', error);
      // On error, allow spin for demo
      console.log('Allowing spin due to error');
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
        .order('spun_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get SE usernames
      const { data: seAccounts } = await supabase
        .from('streamelements_connections')
        .select('user_id, se_username');

      // Get Twitch usernames
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

  useEffect(() => {
    if (prizes.length > 0 && canvasRef.current) {
      drawWheel();
    }
  }, [prizes]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    console.log('Drawing wheel:', { canvas: !!canvas, prizesLength: prizes.length });
    
    if (!canvas || prizes.length === 0) {
      console.warn('Cannot draw wheel - missing canvas or prizes');
      return;
    }

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 10;
    const segmentAngle = (2 * Math.PI) / prizes.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    prizes.forEach((prize, i) => {
      const angle = i * segmentAngle;
      
      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + segmentAngle);
      ctx.fillStyle = prize.color;
      ctx.fill();
      
      // Segment Border
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw Text and Icon
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + segmentAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = prize.text_color;
      
      // Label
      ctx.font = 'bold 18px Goldman, cursive';
      ctx.fillText(prize.label, radius - 40, 0);
      
      // Icon
      ctx.font = '24px Arial';
      ctx.fillText(prize.icon, radius - 150, 0);
      ctx.restore();
    });

    // Outer border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 8;
    ctx.stroke();
    
    console.log('Wheel drawn successfully with', prizes.length, 'segments');
  };

  const playSpinSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.25);
    oscillator.type = 'triangle';

    gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const playTickSound = () => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(900, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.06);
  };

  const playWinSound = () => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);
  };

  const selectPrizeWeighted = () => {
    const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0);
    let random = Math.random() * totalProbability;
    
    for (let i = 0; i < prizes.length; i++) {
      random -= prizes[i].probability;
      if (random <= 0) {
        return i;
      }
    }
    return 0;
  };

  const spin = async () => {
    console.log('=== SPIN FUNCTION CALLED ===');
    
    if (isSpinning || !canSpin || !user || prizes.length === 0) {
      console.log('BLOCKED: Cannot spin');
      return;
    }

    console.log('✅ Starting spin!');
    setIsSpinning(true);
    playSpinSound();

    // Get current wheel position
    const currentRotation = currentRotationRef.current;
    
    // Select the winning prize
    const winningIndex = selectPrizeWeighted();
    const winningPrize = prizes[winningIndex];
    
    console.log('🎯 Selected prize:', winningPrize.label, 'at index', winningIndex);
    
    // Calculate spin parameters
    const numSegments = prizes.length;
    const degreesPerSegment = 360 / numSegments;
    
    // The canvas draws segments starting at 0° (pointing right/east)
    // Segment i occupies angles: [i * degreesPerSegment, (i+1) * degreesPerSegment]
    // Segment i's CENTER is at: i * degreesPerSegment + degreesPerSegment/2
    
    // The pointer is at the TOP of the screen (12 o'clock)
    // In our rotation system, top = 270° (or -90°)
    
    // When wheel rotates by angle R (clockwise), 
    // a point at canvas position P ends up at screen position (P + R) mod 360
    
    // We want the winning segment's CENTER to align with the pointer at 270°
    const segmentCenter = winningIndex * degreesPerSegment + degreesPerSegment / 2;
    
    // We need: (segmentCenter + totalRotation) mod 360 = 270
    // So: totalRotation = 270 - segmentCenter (plus any multiple of 360)
    
    let baseRotation = 270 - segmentCenter;
    
    // Normalize to positive
    while (baseRotation < 0) baseRotation += 360;
    
    // We're adding rotation to currentRotation, so we need to account for where we currently are
    // Current position puts things at: (angle + currentRotation) mod 360
    // We want to end at: (angle + currentRotation + additionalRotation) mod 360 = 270
    // For segment center: (segmentCenter + currentRotation + additionalRotation) mod 360 = 270
    // additionalRotation = 270 - segmentCenter - currentRotation
    
    let rotationToAdd = 270 - segmentCenter - (currentRotation % 360);
    
    // Make sure we rotate forward (always positive, at least 360°)
    while (rotationToAdd < 360) rotationToAdd += 360;
    
    // Add extra spins for effect (7-12 full rotations beyond the minimum)
    const extraFullSpins = 7 + Math.floor(Math.random() * 5);
    rotationToAdd += extraFullSpins * 360;
    
    const targetRotation = currentRotation + rotationToAdd;
    
    console.log('Segment center:', segmentCenter, '°');
    console.log('Current rotation:', currentRotation, '°');
    console.log('Rotation to add:', rotationToAdd, '°');
    console.log('Target rotation:', targetRotation, '°');
    console.log('Target mod 360:', targetRotation % 360, '°');
    
    // Animate
    const duration = 5000;
    const startTime = performance.now();
    const startRotation = currentRotation;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    lastSegmentIndexRef.current = -1;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const currentPos = startRotation + rotationToAdd * eased;

      if (canvasRef.current) {
        canvasRef.current.style.transform = `rotate(${currentPos}deg)`;
      }

      // Tick sound on segment changes
      const currentAngle = currentPos % 360;
      const angleAtPointer = (270 - currentAngle + 360) % 360;
      const currentSegmentIndex = Math.floor(angleAtPointer / degreesPerSegment) % numSegments;

      if (currentSegmentIndex !== lastSegmentIndexRef.current) {
        const pointer = document.querySelector('.wheel-pointer');
        if (pointer) {
          pointer.classList.remove('wiggle');
          void pointer.offsetWidth;
          pointer.classList.add('wiggle');
        }
        if (lastSegmentIndexRef.current !== -1) playTickSound();
        lastSegmentIndexRef.current = currentSegmentIndex;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete
        if (canvasRef.current) {
          canvasRef.current.style.transform = `rotate(${targetRotation}deg)`;
        }
        currentRotationRef.current = targetRotation;
        setIsSpinning(false);
        
        // Verify
        const finalAngle = targetRotation % 360;
        const finalAngleAtPointer = (270 - finalAngle + 360) % 360;
        const landedSegment = Math.floor(finalAngleAtPointer / degreesPerSegment) % numSegments;
        
        console.log('🎯 LANDED:');
        console.log('Final rotation:', finalAngle, '°');
        console.log('Angle at pointer:', finalAngleAtPointer, '°');
        console.log('Landed on segment:', landedSegment);
        console.log('Expected segment:', winningIndex);
        console.log('Match:', landedSegment === winningIndex ? '✅' : '❌');
        
        setTimeout(() => {
          handleWin(winningPrize);
        }, 300);
      }
    };

    requestAnimationFrame(animate);
  };

  const handleWin = async (prize) => {
    playWinSound();
    setWonPrize(prize);
    setShowModal(true);
    
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ffcf40', '#ffffff', '#e63946']
    });

    // Record spin in database
    try {
      const { error } = await supabase
        .from('daily_wheel_spins')
        .insert({
          user_id: user.id,
          prize_id: prize.id,
          prize_label: prize.label,
          se_points_won: prize.se_points
        });

      if (error) throw error;

      // Award StreamElements points if applicable
      if (prize.se_points > 0) {
        await awardPoints(prize.se_points);
      }

      setCanSpin(false);
      startCountdown();
      fetchRecentSpins();
    } catch (error) {
      console.error('Error recording spin:', error);
    }
  };

  const awardPoints = async (points) => {
    try {
      // Get user's SE username from profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('streamelements_username')
        .eq('user_id', user.id)
        .single();

      if (!profile?.streamelements_username) {
        console.warn('User has no StreamElements username set');
        return;
      }

      // Call StreamElements API via your backend
      const response = await fetch('/api/streamelements/award-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: profile.streamelements_username,
          points: points
        })
      });

      if (!response.ok) {
        throw new Error('Failed to award points');
      }

      console.log(`Awarded ${points} points to ${profile.streamelements_username}`);
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  if (loading) {
    return (
      <div className="daily-wheel-container">
        <div className="text-center text-gray-400">Loading wheel...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="daily-wheel-container">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-yellow-400 mb-4">Daily Wheel</h2>
          <p className="text-gray-400">Please log in to spin the wheel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-wheel-container">
      <header className="wheel-header text-center">
        <h1 className="goldman text-5xl md:text-6xl text-yellow-400 tracking-tighter drop-shadow-lg mb-2">
          DAILY WHEEL
        </h1>
        <p className="text-gray-400 uppercase tracking-widest text-sm">
          Spin to win StreamElements points
        </p>
      </header>

      <div className="wheel-section" style={{ padding: '0 1rem 2rem' }}>
        <div className="wheel-container-inner">
          {/* LED Lights */}
          <div className="led-container">
            {[...Array(24)].map((_, i) => {
              const angle = (i / 24) * 2 * Math.PI;
              const containerRadius = 210;
              const x = 200 + containerRadius * Math.cos(angle);
              const y = 200 + containerRadius * Math.sin(angle);
              
              return (
                <div 
                  key={i}
                  className="led-light"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              );
            })}
          </div>
          
          {/* Pointer */}
          <div className="wheel-pointer">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-yellow-400 drop-shadow-md">
              <path d="M50 95 L15 10 L85 10 Z" />
            </svg>
            <div className="w-2 h-2 bg-white rounded-full absolute top-4 shadow-inner"></div>
          </div>
          
          {/* The Wheel */}
          <canvas 
            ref={canvasRef}
            id="wheel" 
            width="500" 
            height="500"
            className="wheel-canvas"
          />
          
          {/* Center Button */}
          <div className="wheel-center-button">
            <div className="w-16 h-16 bg-black rounded-full border-4 border-yellow-500 shadow-xl flex items-center justify-center">
              <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="wheel-controls">
          <button 
            onClick={() => {
              console.log('Button clicked!');
              console.log('States:', { loading, isSpinning, canSpin, prizesLength: prizes.length });
              spin();
            }}
            disabled={loading || isSpinning || prizes.length === 0}
            className="spin-btn"
            style={{ opacity: (loading || isSpinning || prizes.length === 0) ? 0.5 : 1 }}
          >
            {loading ? 'LOADING...' : isSpinning ? 'SPINNING...' : 'SPIN NOW'}
          </button>
          
          {!loading && !canSpin && countdown && (
            <div className="timer-msg">
              Next spin available in: <span className="font-bold">{countdown}</span>
            </div>
          )}
          
          {!loading && canSpin && (
            <div className="status-msg" style={{ color: '#4ade80' }}>
              ✓ Ready to spin!
            </div>
          )}
          
          {!loading && !canSpin && !countdown && (
            <div className="status-msg">
              One free spin every 24 hours
            </div>
          )}
        </div>
      </div>

      {/* Winner Modal */}
      {showModal && wonPrize && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="goldman text-3xl text-yellow-400 mb-2">
              {wonPrize.se_points > 0 ? 'JACKPOT!' : 'NICE TRY!'}
            </h2>
            <div className="text-6xl my-6">{wonPrize.icon}</div>
            <p className="text-gray-300 mb-1">You won:</p>
            <h3 className="text-4xl font-black text-white mb-6 uppercase tracking-tight">
              {wonPrize.label}
            </h3>
            {wonPrize.se_points > 0 && (
              <p className="text-green-400 text-sm mb-4">
                +{wonPrize.se_points} StreamElements Points
              </p>
            )}
            <button 
              onClick={() => setShowModal(false)}
              className="claim-btn"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Recent Spins */}
      {recentSpins.length > 0 && (
        <div className="recent-spins-section">
          <h2>🎡 Recent Spins</h2>
          <div className="spins-table">
            <div className="table-header">
              <div className="table-cell">Prize</div>
              <div className="table-cell">Nickname</div>
              <div className="table-cell">Points</div>
              <div className="table-cell">Date</div>
            </div>
            <div className="table-body">
              {recentSpins.map((spin, index) => (
                <div key={index} className="table-row">
                  <div className="table-cell prize">{spin.prize_label}</div>
                  <div className="table-cell username">{spin.username}</div>
                  <div className="table-cell points">
                    {spin.se_points_won > 0 ? `+${spin.se_points_won.toLocaleString()} pts` : '-'}
                  </div>
                  <div className="table-cell date">
                    {new Date(spin.spun_at).toLocaleDateString('en-US', { 
                      month: '2-digit', 
                      day: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
