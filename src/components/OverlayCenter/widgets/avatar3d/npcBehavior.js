/**
 * npcBehavior.js — Autonomous NPC behavior scheduler
 *
 * Makes the 3D avatar roam around the overlay canvas like an NPC:
 *  - Walk to the navbar and do push-ups on it
 *  - Walk over to the chat widget and peek / wave
 *  - Idle wander around the canvas
 *  - Return to home position
 *
 * Outputs:
 *  - offsetX / offsetY (px): how far from home the avatar should translate
 *  - pose: 'idle' | 'walking' | 'pushup' | 'peeking' | 'waving' | 'sitting'
 *  - flipX: whether the model faces left
 *  - progress: 0..1 within the current action (for bone animations)
 *
 * The widget applies offsetX/Y via CSS transform on the avatar wrapper,
 * and feeds the pose into the animation controller.
 */

const ACTIONS = ['idle_wander', 'goto_navbar', 'goto_chat', 'return_home'];

// Weighted random pick
function pickAction(weights) {
  const total = weights.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of weights) {
    r -= w.weight;
    if (r <= 0) return w.action;
  }
  return weights[0].action;
}

// Linear interpolation
function lerp(a, b, t) { return a + (b - a) * Math.min(1, Math.max(0, t)); }

// Cubic ease in-out — natural acceleration/deceleration
function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

/**
 * Create the NPC behavior controller.
 *
 * @param {Object} opts
 * @param {number} opts.homeX     — widget's position_x on the canvas
 * @param {number} opts.homeY     — widget's position_y on the canvas
 * @param {number} opts.homeW     — widget width
 * @param {number} opts.homeH     — widget height
 */
export function createNpcBehavior(opts = {}) {
  let homeX = opts.homeX || 0;
  let homeY = opts.homeY || 0;
  let homeW = opts.homeW || 380;
  let homeH = opts.homeH || 400;

  // Current output state
  let offsetX = 0;
  let offsetY = 0;
  let pose = 'idle';
  let flipX = false;
  let actionProgress = 0;

  // Internal state
  let phase = 'idle';           // 'idle' | 'walking_to' | 'performing' | 'walking_home'
  let currentAction = null;
  let phaseTime = 0;
  let phaseDuration = 0;
  let idleCooldown = 0;        // seconds until the next action
  let walkStartX = 0;
  let walkStartY = 0;
  let walkTargetX = 0;
  let walkTargetY = 0;
  let performDuration = 0;
  let walkSpeed = 120;          // px/s
  let totalTime = 0;

  // Widget targets (set externally)
  let targets = {};             // { navbar: {x,y,w,h}, chat: {x,y,w,h}, ... }

  function setHome(x, y, w, h) { homeX = x; homeY = y; homeW = w; homeH = h; }
  function setTargets(t) { targets = t || {}; }
  function setWalkSpeed(s) { walkSpeed = s; }

  function _startIdle() {
    phase = 'idle';
    pose = 'idle';
    currentAction = null;
    idleCooldown = 5 + Math.random() * 8; // 5-13s between actions
    phaseTime = 0;
  }

  function _getTargetPosition(action) {
    if (action === 'goto_navbar' && targets.navbar) {
      const nb = targets.navbar;
      // Stand on top of the navbar (feet on navbar top edge)
      const tx = nb.x + nb.w * 0.5 - homeX - homeW * 0.5;
      const ty = nb.y - homeH * 0.8 - homeY; // above navbar
      return { x: tx, y: ty, found: true };
    }
    if (action === 'goto_chat' && targets.chat) {
      const ch = targets.chat;
      // Stand next to chat widget (right side)
      const tx = ch.x + ch.w + 10 - homeX - homeW * 0.5;
      const ty = ch.y + ch.h * 0.3 - homeY - homeH * 0.5;
      return { x: tx, y: ty, found: true };
    }
    if (action === 'idle_wander') {
      // Random nearby position
      const tx = (Math.random() - 0.5) * 200;
      const ty = (Math.random() - 0.5) * 80;
      return { x: tx, y: ty, found: true };
    }
    return { x: 0, y: 0, found: false };
  }

  function _startAction() {
    const actionWeights = [
      { action: 'idle_wander', weight: 3 },
      { action: 'goto_navbar', weight: targets.navbar ? 4 : 0 },
      { action: 'goto_chat', weight: targets.chat ? 3 : 0 },
    ].filter(w => w.weight > 0);

    if (actionWeights.length === 0) {
      _startIdle();
      return;
    }

    currentAction = pickAction(actionWeights);
    const target = _getTargetPosition(currentAction);

    if (!target.found) {
      _startIdle();
      return;
    }

    // Start walking to target
    phase = 'walking_to';
    walkStartX = offsetX;
    walkStartY = offsetY;
    walkTargetX = target.x;
    walkTargetY = target.y;
    const dist = Math.sqrt((walkTargetX - walkStartX) ** 2 + (walkTargetY - walkStartY) ** 2);
    phaseDuration = Math.max(0.8, dist / walkSpeed);
    phaseTime = 0;
    pose = 'walking';
    flipX = walkTargetX < walkStartX;

    // Set perform duration based on action
    if (currentAction === 'goto_navbar') performDuration = 4 + Math.random() * 3; // 4-7s push-ups
    else if (currentAction === 'goto_chat') performDuration = 3 + Math.random() * 2; // 3-5s peeking
    else performDuration = 2 + Math.random() * 2; // 2-4s wandering idle
  }

  function _startPerform() {
    phase = 'performing';
    phaseTime = 0;
    phaseDuration = performDuration;

    if (currentAction === 'goto_navbar') {
      pose = 'pushup';
    } else if (currentAction === 'goto_chat') {
      pose = Math.random() > 0.5 ? 'peeking' : 'waving';
    } else {
      pose = 'idle';
    }
  }

  function _startWalkHome() {
    phase = 'walking_home';
    walkStartX = offsetX;
    walkStartY = offsetY;
    walkTargetX = 0;
    walkTargetY = 0;
    const dist = Math.sqrt(walkStartX ** 2 + walkStartY ** 2);
    phaseDuration = Math.max(0.8, dist / walkSpeed);
    phaseTime = 0;
    pose = 'walking';
    flipX = walkTargetX < walkStartX;
  }

  return {
    get offsetX() { return offsetX; },
    get offsetY() { return offsetY; },
    get pose() { return pose; },
    get flipX() { return flipX; },
    get actionProgress() { return actionProgress; },
    get phase() { return phase; },
    get currentAction() { return currentAction; },

    setHome,
    setTargets,
    setWalkSpeed,

    /**
     * Tick every frame.
     * @param {number} dt — seconds
     * @returns {{ offsetX, offsetY, pose, flipX, actionProgress }}
     */
    update(dt) {
      totalTime += dt;
      phaseTime += dt;

      switch (phase) {
        case 'idle': {
          idleCooldown -= dt;
          actionProgress = 0;
          if (idleCooldown <= 0) {
            _startAction();
          }
          break;
        }

        case 'walking_to': {
          const t = easeInOut(Math.min(1, phaseTime / phaseDuration));
          offsetX = lerp(walkStartX, walkTargetX, t);
          offsetY = lerp(walkStartY, walkTargetY, t);
          actionProgress = t;
          // Walking bob
          flipX = walkTargetX < walkStartX;
          if (phaseTime >= phaseDuration) {
            offsetX = walkTargetX;
            offsetY = walkTargetY;
            _startPerform();
          }
          break;
        }

        case 'performing': {
          actionProgress = Math.min(1, phaseTime / phaseDuration);
          if (phaseTime >= phaseDuration) {
            _startWalkHome();
          }
          break;
        }

        case 'walking_home': {
          const t = easeInOut(Math.min(1, phaseTime / phaseDuration));
          offsetX = lerp(walkStartX, 0, t);
          offsetY = lerp(walkStartY, 0, t);
          actionProgress = t;
          flipX = 0 < walkStartX ? false : true;
          if (phaseTime >= phaseDuration) {
            offsetX = 0;
            offsetY = 0;
            _startIdle();
          }
          break;
        }
      }

      return { offsetX, offsetY, pose, flipX, actionProgress };
    },

    /** Force the NPC back to idle at home position */
    reset() {
      offsetX = 0;
      offsetY = 0;
      _startIdle();
    },
  };
}
