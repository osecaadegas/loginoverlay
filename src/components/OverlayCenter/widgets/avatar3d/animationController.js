/**
 * animationController.js — Master orchestrator
 *
 * Called every frame from useFrame. Composites all behavior layers:
 *   1. State manager tick (blend weights)
 *   2. Idle behavior (always running, weight-blended)
 *   3. Talking behavior (weight-blended)
 *   4. Reaction system (additive, on top)
 *
 * Owns the morph-target fade system: when leaving talking state,
 * morphs that were driven by talking fade out smoothly rather
 * than snapping to zero.
 */

import { createStateManager } from './stateManager';
import { createIdleBehavior } from './idleBehavior';
import { createTalkingBehavior } from './talkingBehavior';
import { createReactionSystem } from './reactionSystem';
import { smoothLerp } from './noise';

// Morphs that need smooth fade-out when talking ends
const FADE_MORPHS = [
  'mouthOpen', 'jawOpen', 'mouthSmile', 'browInnerUp',
  'viseme_aa','viseme_oh','viseme_ee','viseme_ih','viseme_ou',
  'viseme_ff','viseme_ss','viseme_ch','viseme_dd','viseme_pp',
  'viseme_nn','viseme_kk','viseme_rr','viseme_th','viseme_sil',
];

export function createAnimationController() {
  const state = createStateManager();
  const idle = createIdleBehavior();
  const talking = createTalkingBehavior();
  const reactions = createReactionSystem();

  let prevState = 'idle';
  let morphFade = {}; // morph name → current fade value
  let talkingWasActive = false;
  let totalTime = 0;
  let logged = false;

  return {
    state,
    idle,
    talking,
    reactions,

    /**
     * Set the avatar state from external (matches widget prop).
     * @param {'idle'|'thinking'|'speaking'|'listening'} newState
     */
    setState(newState) {
      state.setState(newState);
    },

    /**
     * Trigger a reaction by name.
     */
    triggerReaction(name, behavior) {
      reactions.trigger(name, behavior);
    },

    /**
     * Main tick — call from useFrame.
     *
     * @param {number} dt       — seconds since last frame
     * @param {Object} rig      — from resolveRig()
     * @param {Object} params   — user config { breathing, sway, headMove, armMove, gestures, animSpeed }
     * @param {Object} groupRef — React ref to the group Object3D
     */
    update(dt, rig, params, groupRef) {
      if (!rig) return;

      const speed = params.animSpeed ?? 1;
      const scaledDt = dt * speed;
      totalTime += scaledDt;

      // ── 1. STATE TICK ──
      state.update(scaledDt);
      const w = state.weights;

      // ── 2. DETECT STATE TRANSITIONS ──
      const currentState = state.active;
      if (currentState !== prevState) {
        if (currentState === 'talking') {
          talking.onEnter(rig.behavior);
          talkingWasActive = true;
        }
        if (prevState === 'talking' && currentState !== 'talking') {
          // Start morph fade-out
          for (const m of FADE_MORPHS) {
            const val = rig.morphs.get(m);
            if (val > 0.01) morphFade[m] = val;
          }
          talkingWasActive = false;
        }
        prevState = currentState;
      }

      // ── 3. MORPH FADE-OUT (smooth transition from talking → idle) ──
      if (Object.keys(morphFade).length > 0) {
        for (const m of Object.keys(morphFade)) {
          morphFade[m] = smoothLerp(morphFade[m], 0, 4, scaledDt);
          if (morphFade[m] < 0.01) {
            rig.morphs.set(m, 0);
            delete morphFade[m];
          } else {
            rig.morphs.set(m, morphFade[m]);
          }
        }
      }

      // ── 4. T-POSE BREAK (unconditional, before any behavior) ──
      // Must run every frame so no behavior layer can leave arms horizontal.
      if (rig.needsArmDown) {
        const { bones: b, restPose } = rig;
        const rg = (bone, axis) => restPose[bone]?.[axis] ?? 0;
        const laTarget = rg('LeftArm', 'z') + 1.1;
        const raTarget = rg('RightArm', 'z') - 1.1;
        const lfTarget = rg('LeftForeArm', 'z') + 0.15;
        const rfTarget = rg('RightForeArm', 'z') - 0.15;

        // First 2s: hard-set to avoid any convergence issues
        if (totalTime < 2.0) {
          if (b.LeftArm) b.LeftArm.rotation.z = laTarget;
          if (b.RightArm) b.RightArm.rotation.z = raTarget;
          if (b.LeftForeArm) b.LeftForeArm.rotation.z = lfTarget;
          if (b.RightForeArm) b.RightForeArm.rotation.z = rfTarget;
        } else {
          if (b.LeftArm) b.LeftArm.rotation.z = smoothLerp(b.LeftArm.rotation.z, laTarget, 2.5, scaledDt);
          if (b.RightArm) b.RightArm.rotation.z = smoothLerp(b.RightArm.rotation.z, raTarget, 2.5, scaledDt);
          if (b.LeftForeArm) b.LeftForeArm.rotation.z = smoothLerp(b.LeftForeArm.rotation.z, lfTarget, 2.5, scaledDt);
          if (b.RightForeArm) b.RightForeArm.rotation.z = smoothLerp(b.RightForeArm.rotation.z, rfTarget, 2.5, scaledDt);
        }

        // One-time diagnostic log
        if (!logged) {
          logged = true;
          console.warn('[T-POSE BREAK] needsArmDown:', true,
            '| LeftArm:', !!b.LeftArm, '| RightArm:', !!b.RightArm,
            '| laTarget:', laTarget.toFixed(3), '| raTarget:', raTarget.toFixed(3),
            '| actual LeftArm.z:', b.LeftArm?.rotation.z?.toFixed(3),
            '| actual RightArm.z:', b.RightArm?.rotation.z?.toFixed(3));
        }
      } else if (!logged) {
        logged = true;
        console.warn('[T-POSE BREAK] needsArmDown: FALSE — arms not detected as T-pose');
      }

      // ── 5. IDLE BEHAVIOR (always running) ──
      idle.update(scaledDt, w.idle, rig, params, groupRef);

      // ── 6. TALKING BEHAVIOR ──
      if (w.talking > 0.01) {
        talking.update(scaledDt, w.talking, rig, params, groupRef);
      }

      // ── 7. THINKING STATE (subtle fidget overlay) ──
      if (w.thinking > 0.05) {
        _applyThinking(scaledDt, w.thinking, rig, params);
      }

      // ── 8. LISTENING STATE (attentive pose) ──
      if (w.listening > 0.05) {
        _applyListening(scaledDt, w.listening, rig, params);
      }

      // ── 9. REACTIONS (additive, on top) ──
      if (reactions.isPlaying) {
        reactions.update(scaledDt, rig, groupRef);
      }
    },
  };
}

// ── Thinking: subtle thoughtful overlay ──
let thinkTime = 0;
function _applyThinking(dt, weight, rig, params) {
  thinkTime += dt;
  const { bones: b, morphs, behavior } = rig;
  const w = weight;
  const ge = (params.gestures ?? 1) * behavior.gestureScale;

  // Chin touch gesture (one arm comes up)
  const cycle = Math.sin(thinkTime * 0.4);
  if (b.RightArm) b.RightArm.rotation.x = smoothLerp(b.RightArm.rotation.x, -0.6 * ge * w, 2, dt);
  if (b.RightForeArm) {
    b.RightForeArm.rotation.x = smoothLerp(b.RightForeArm.rotation.x, -1.2 * ge * w, 2, dt);
  }
  // Head slight tilt
  if (b.Head) {
    b.Head.rotation.z = smoothLerp(b.Head.rotation.z, 0.04 * ge * w, 2, dt);
    b.Head.rotation.x = smoothLerp(b.Head.rotation.x, -0.03 * ge * w, 2, dt);
  }
  // Thoughtful face
  if (behavior.faceScale > 0) {
    morphs.set('browInnerUp', 0.15 * w);
    morphs.set('mouthSmile', cycle * 0.03 * w);
  }
}

// ── Listening: attentive, leaning in ──
let listenTime = 0;
function _applyListening(dt, weight, rig, params) {
  listenTime += dt;
  const { bones: b, morphs, behavior } = rig;
  const w = weight;
  const hm = (params.headMove ?? 1) * behavior.headScale;

  // Lean forward slightly
  if (b.Spine) b.Spine.rotation.x = smoothLerp(b.Spine.rotation.x || 0, 0.03 * w, 2, dt);
  // Head attentive tilt
  if (b.Head) {
    b.Head.rotation.z = smoothLerp(b.Head.rotation.z, Math.sin(listenTime * 0.3) * 0.04 * hm * w, 2, dt);
    b.Head.rotation.y = smoothLerp(b.Head.rotation.y, Math.sin(listenTime * 0.2) * 0.03 * hm * w, 1.5, dt);
  }
  // Attentive face
  if (behavior.faceScale > 0) {
    morphs.set('browInnerUp', (0.08 + Math.sin(listenTime * 0.5) * 0.04) * w);
    morphs.set('mouthSmile', 0.05 * w);
  }
}
