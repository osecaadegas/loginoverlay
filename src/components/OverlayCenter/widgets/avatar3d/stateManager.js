/**
 * stateManager.js — Avatar state machine with smooth blending
 *
 * States: idle | listening | thinking | talking
 *
 * Each state has a blend weight (0..1). The active state blends UP
 * while others blend DOWN, ensuring the idle base layer never fully
 * stops and transitions are always smooth.
 */

const STATES = ['idle', 'listening', 'thinking', 'talking'];

const BLEND_SPEEDS = {
  idle:      { in: 2.5, out: 3.0 },
  listening: { in: 4.0, out: 3.0 },
  thinking:  { in: 3.5, out: 2.5 },
  talking:   { in: 5.0, out: 3.0 },
};

// Minimum idle weight — idle never fully stops
const IDLE_FLOOR = 0.3;

export function createStateManager() {
  const weights = { idle: 1, listening: 0, thinking: 0, talking: 0 };
  let active = 'idle';
  let prevActive = 'idle';
  let transitionTime = 0;

  return {
    /** Current blend weights (read-only snapshot) */
    get weights() { return { ...weights }; },

    /** The current active state name */
    get active() { return active; },

    /** The previous state (for transition detection) */
    get previous() { return prevActive; },

    /** How long since last state change */
    get timeSinceTransition() { return transitionTime; },

    /**
     * Set the target state.
     * Maps external state strings to internal: 'speaking' → 'talking'
     */
    setState(newState) {
      const mapped = newState === 'speaking' ? 'talking' : newState;
      const s = STATES.includes(mapped) ? mapped : 'idle';
      if (s !== active) {
        prevActive = active;
        active = s;
        transitionTime = 0;
      }
    },

    /**
     * Tick every frame. Blends weights toward the active state.
     * @param {number} dt — delta time in seconds
     */
    update(dt) {
      transitionTime += dt;
      for (const s of STATES) {
        const target = s === active ? 1 : (s === 'idle' ? IDLE_FLOOR : 0);
        const speed = s === active ? BLEND_SPEEDS[s].in : BLEND_SPEEDS[s].out;
        weights[s] += (target - weights[s]) * (1 - Math.exp(-speed * dt));
        // Clamp
        weights[s] = Math.max(0, Math.min(1, weights[s]));
      }
    },

    /** True if we just entered a new state (within 0.1s) */
    justEntered(state) {
      return active === state && transitionTime < 0.1;
    },
  };
}
