import { useRef, useEffect, useCallback } from 'react';

/**
 * RouletteWheel - Canvas-based realistic roulette wheel with physics
 * Features:
 * - Independent wheel and ball rotation
 * - Realistic deceleration curves
 * - Ball bouncing physics
 * - 60fps smooth animation
 * - Result-targeted landing
 */

// European roulette wheel order (clockwise from 0)
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

// Colors for each number
const getNumberColor = (num) => {
  if (num === 0) return '#0d8f4f'; // Green
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  return redNumbers.includes(num) ? '#c41e3a' : '#1a1a2e';
};

export default function RouletteWheel({ 
  isSpinning, 
  targetNumber, 
  onSpinComplete,
  size = 400 
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const stateRef = useRef({
    wheelAngle: 0,
    wheelSpeed: 0,
    ballAngle: 0,
    ballSpeed: 0,
    ballRadius: 0,
    phase: 'idle', // idle, spinning, dropping, bouncing, settled
    bounceCount: 0,
    targetSlotAngle: 0,
    startTime: 0
  });

  const audioRef = useRef({
    spinning: null,
    clicking: null,
    landing: null
  });

  // Initialize audio
  useEffect(() => {
    // Create audio context for sounds (will be implemented with actual audio files)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Calculate target angle for a specific number
  const getSlotAngle = useCallback((number) => {
    const slotIndex = WHEEL_NUMBERS.indexOf(number);
    const slotAngle = (slotIndex / 37) * Math.PI * 2;
    return slotAngle;
  }, []);

  // Main render function
  const render = useCallback((ctx, width, height) => {
    const state = stateRef.current;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 10;
    const innerRadius = outerRadius * 0.65;
    const numberRadius = outerRadius * 0.82;
    const ballTrackRadius = outerRadius * 0.92;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw outer rim (gold)
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#2a2a3e';
    ctx.fill();
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw ball track
    ctx.beginPath();
    ctx.arc(centerX, centerY, ballTrackRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#3a3a4e';
    ctx.lineWidth = 15;
    ctx.stroke();

    // Save context for wheel rotation
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(state.wheelAngle);

    // Draw number slots
    const slotAngle = (Math.PI * 2) / 37;
    for (let i = 0; i < 37; i++) {
      const num = WHEEL_NUMBERS[i];
      const startAngle = i * slotAngle - Math.PI / 2;
      const endAngle = startAngle + slotAngle;

      // Draw slot
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, innerRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = getNumberColor(num);
      ctx.fill();
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Draw number
      ctx.save();
      ctx.rotate(startAngle + slotAngle / 2 + Math.PI / 2);
      ctx.translate(0, -numberRadius + 15);
      ctx.rotate(Math.PI);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.floor(outerRadius / 18)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(num.toString(), 0, 0);
      ctx.restore();

      // Draw pocket dividers
      ctx.beginPath();
      ctx.moveTo(
        Math.cos(startAngle) * (innerRadius - 5),
        Math.sin(startAngle) * (innerRadius - 5)
      );
      ctx.lineTo(
        Math.cos(startAngle) * innerRadius,
        Math.sin(startAngle) * innerRadius
      );
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw center hub
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius * 0.3, 0, Math.PI * 2);
    const hubGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, innerRadius * 0.3);
    hubGradient.addColorStop(0, '#4a4a5e');
    hubGradient.addColorStop(1, '#2a2a3e');
    ctx.fillStyle = hubGradient;
    ctx.fill();
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw center logo
    ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.font = `bold ${Math.floor(outerRadius / 12)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♦', 0, 0);

    ctx.restore();

    // Draw ball
    if (state.phase !== 'idle' || state.ballRadius > 0) {
      const ballX = centerX + Math.cos(state.ballAngle) * state.ballRadius;
      const ballY = centerY + Math.sin(state.ballAngle) * state.ballRadius;
      
      // Ball shadow
      ctx.beginPath();
      ctx.arc(ballX + 2, ballY + 2, outerRadius * 0.035, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fill();

      // Ball
      ctx.beginPath();
      ctx.arc(ballX, ballY, outerRadius * 0.035, 0, Math.PI * 2);
      const ballGradient = ctx.createRadialGradient(
        ballX - 3, ballY - 3, 0,
        ballX, ballY, outerRadius * 0.035
      );
      ballGradient.addColorStop(0, '#ffffff');
      ballGradient.addColorStop(0.5, '#e0e0e0');
      ballGradient.addColorStop(1, '#a0a0a0');
      ctx.fillStyle = ballGradient;
      ctx.fill();
    }

    // Draw result highlight if settled
    if (state.phase === 'settled' && targetNumber !== null) {
      const slotIndex = WHEEL_NUMBERS.indexOf(targetNumber);
      const highlightAngle = state.wheelAngle + (slotIndex / 37) * Math.PI * 2 - Math.PI / 2 + slotAngle / 2;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      
      // Glowing effect
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, innerRadius + 5, highlightAngle - slotAngle / 2, highlightAngle + slotAngle / 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.restore();
    }
  }, [targetNumber]);

  // Animation loop
  const animate = useCallback((timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const state = stateRef.current;
    const outerRadius = Math.min(canvas.width, canvas.height) / 2 - 10;
    const ballTrackRadius = outerRadius * 0.88;
    const innerRadius = outerRadius * 0.65;

    // Update physics based on phase
    switch (state.phase) {
      case 'spinning':
        // Wheel spins at constant speed initially
        state.wheelAngle += state.wheelSpeed;
        state.wheelSpeed *= 0.9995; // Very slow deceleration

        // Ball travels opposite direction, faster
        state.ballAngle -= state.ballSpeed;
        state.ballSpeed *= 0.997; // Decelerate ball

        // Ball stays on outer track
        state.ballRadius = ballTrackRadius;

        // Transition to dropping when ball slows enough
        if (state.ballSpeed < 0.02) {
          state.phase = 'dropping';
          state.bounceCount = 0;
        }
        break;

      case 'dropping':
        // Wheel continues to slow
        state.wheelAngle += state.wheelSpeed;
        state.wheelSpeed *= 0.998;

        // Ball drops toward center with bounces
        state.ballAngle -= state.ballSpeed * 0.5;
        state.ballSpeed *= 0.99;
        
        // Calculate target radius (where ball should land)
        const targetRadius = innerRadius + 10;
        const dropSpeed = 2;
        
        if (state.ballRadius > targetRadius) {
          state.ballRadius -= dropSpeed;
          
          // Simulate bouncing
          if (Math.random() < 0.05 && state.bounceCount < 5) {
            state.ballRadius += 8;
            state.ballAngle += (Math.random() - 0.5) * 0.2;
            state.bounceCount++;
          }
        } else {
          state.phase = 'settling';
        }
        break;

      case 'settling':
        // Final settling into pocket
        state.wheelAngle += state.wheelSpeed;
        state.wheelSpeed *= 0.99;

        // Calculate where the target number currently is
        const slotIndex = WHEEL_NUMBERS.indexOf(targetNumber);
        const slotAngle = (slotIndex / 37) * Math.PI * 2;
        const targetBallAngle = -state.wheelAngle + slotAngle - Math.PI / 2;

        // Smoothly move ball to target slot
        const angleDiff = targetBallAngle - state.ballAngle;
        state.ballAngle += angleDiff * 0.1;
        state.ballRadius = innerRadius + 8;

        // Check if settled
        if (state.wheelSpeed < 0.001 && Math.abs(angleDiff) < 0.01) {
          state.phase = 'settled';
          state.wheelSpeed = 0;
          if (onSpinComplete) {
            onSpinComplete(targetNumber);
          }
        }
        break;

      case 'settled':
        // Keep ball in winning slot, slight wheel drift
        const settledSlotIndex = WHEEL_NUMBERS.indexOf(targetNumber);
        const settledSlotAngle = (settledSlotIndex / 37) * Math.PI * 2;
        state.ballAngle = -state.wheelAngle + settledSlotAngle - Math.PI / 2;
        state.ballRadius = innerRadius + 8;
        break;

      case 'idle':
      default:
        // Gentle idle rotation
        state.wheelAngle += 0.002;
        break;
    }

    render(ctx, canvas.width, canvas.height);
    animationRef.current = requestAnimationFrame(animate);
  }, [render, targetNumber, onSpinComplete]);

  // Start spinning when triggered
  useEffect(() => {
    if (isSpinning && stateRef.current.phase === 'idle') {
      const state = stateRef.current;
      state.phase = 'spinning';
      state.wheelSpeed = 0.08 + Math.random() * 0.02;
      state.ballSpeed = 0.15 + Math.random() * 0.05;
      state.ballAngle = Math.random() * Math.PI * 2;
      state.ballRadius = (Math.min(size, size) / 2 - 10) * 0.88;
      state.startTime = performance.now();
    }
  }, [isSpinning, size]);

  // Reset for new spin
  useEffect(() => {
    if (!isSpinning && stateRef.current.phase === 'settled') {
      // Keep in settled state until next spin
    }
  }, [isSpinning]);

  // Start animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = size;
    canvas.height = size;

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size, animate]);

  // Reset wheel for new round
  const resetWheel = useCallback(() => {
    const state = stateRef.current;
    state.phase = 'idle';
    state.ballRadius = 0;
    state.bounceCount = 0;
  }, []);

  // Expose reset function
  useEffect(() => {
    if (!isSpinning && stateRef.current.phase !== 'idle' && stateRef.current.phase !== 'settled') {
      // If spinning stopped externally, reset
    }
  }, [isSpinning]);

  return (
    <div className="roulette-wheel-container">
      <canvas 
        ref={canvasRef} 
        className="roulette-wheel-canvas"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

// Export wheel numbers for use in betting logic
export { WHEEL_NUMBERS, getNumberColor };
