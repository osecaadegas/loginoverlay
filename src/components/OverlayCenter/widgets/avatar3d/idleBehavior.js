/**
 * idleBehavior.js — Always-on NPC idle system
 *
 * Layered procedural animation that NEVER stops:
 *   Layer 0: Breathing (chest/spine oscillation)
 *   Layer 1: Micro head movement (look around, slight rotations)
 *   Layer 2: Eye blinks (random timing, natural intervals)
 *   Layer 3: Subtle arm/hand fidget
 *   Layer 4: Weight shifting (hips sway, stance changes)
 *   Layer 5: Idle variations (bigger motions every 5-15s)
 *   Layer 6: Floating drift (slight positional drift)
 *
 * All layers use noise functions (not loops), random timers,
 * and smooth lerp/slerp. Nothing ever repeats exactly.
 */

import { noise1D, noise2D, smoothLerp, weightedPick, shouldTrigger } from './noise';

// ── Idle variation types ──
const IDLE_VARIATIONS = ['standing', 'shifting', 'lookAround', 'stretch'];
const VARIATION_DURATION = { min: 6, max: 16 };

export function createIdleBehavior() {
  // Persistent state (survives across frames)
  const t = { total: 0 };
  const blink = { timer: 0, next: 2 + Math.random() * 3, phase: 0 };
  const variation = { current: 'standing', timer: 0, duration: 8 + Math.random() * 6 };
  const stretch = { progress: 0 };
  const drift = { x: 0, y: 0 };
  const pace = { pos: 0, dir: 1 };

  return {
    get currentVariation() { return variation.current; },

    /**
     * Tick every frame. Returns a pose delta object to apply.
     *
     * @param {number} dt          — frame delta
     * @param {number} weight      — blend weight from state manager (0..1)
     * @param {Object} rig         — { bones, morphs, restPose, needsArmDown, behavior }
     * @param {Object} params      — { breathing, sway, headMove, armMove, gestures }
     * @param {Object} groupRef    — ref to the group Object3D
     * @returns {void} — mutates bones and morph targets directly
     */
    update(dt, weight, rig, params, groupRef) {
      if (weight < 0.01) return;
      const { bones: b, morphs, restPose, needsArmDown, behavior } = rig;
      const w = weight;
      const beh = behavior;
      t.total += dt;

      const br = (params.breathing ?? 1) * beh.bodyScale;
      const sw = (params.sway ?? 1) * beh.bodyScale;
      const hm = (params.headMove ?? 1) * beh.headScale;
      const am = (params.armMove ?? 1) * beh.bodyScale;
      const ge = (params.gestures ?? 1) * beh.gestureScale;

      const rg = (bone, axis) => restPose[bone]?.[axis] ?? 0;

      // ─────────────────────────────────────────────
      //  LAYER 0: BREATHING (always active)
      // ─────────────────────────────────────────────
      const breathVal = noise1D(t.total, 0, 0.8);
      if (b.Spine1) b.Spine1.rotation.x = smoothLerp(b.Spine1.rotation.x, rg('Spine1', 'x') + breathVal * 0.01 * br * w, 4, dt);
      if (b.Spine2) b.Spine2.rotation.x = smoothLerp(b.Spine2.rotation.x, rg('Spine2', 'x') + breathVal * 0.007 * br * w, 4, dt);

      // Breathing bounce on group Y
      if (groupRef?.current) {
        drift.y = breathVal * 0.003 * br;
      }

      // ─────────────────────────────────────────────
      //  LAYER 1: BREAK T-POSE (arms down)
      // ─────────────────────────────────────────────
      if (needsArmDown) {
        if (b.LeftArm) b.LeftArm.rotation.z = smoothLerp(b.LeftArm.rotation.z, rg('LeftArm', 'z') + 1.1, 2.5, dt);
        if (b.RightArm) b.RightArm.rotation.z = smoothLerp(b.RightArm.rotation.z, rg('RightArm', 'z') - 1.1, 2.5, dt);
        if (b.LeftForeArm) b.LeftForeArm.rotation.z = smoothLerp(b.LeftForeArm.rotation.z, rg('LeftForeArm', 'z') + 0.15, 2.5, dt);
        if (b.RightForeArm) b.RightForeArm.rotation.z = smoothLerp(b.RightForeArm.rotation.z, rg('RightForeArm', 'z') - 0.15, 2.5, dt);
      }

      // ─────────────────────────────────────────────
      //  LAYER 2: EYE BLINKS
      // ─────────────────────────────────────────────
      blink.timer += dt;
      if (blink.timer >= blink.next) {
        blink.timer = 0;
        blink.next = 1.5 + Math.random() * 4.5; // 1.5-6s between blinks
        blink.phase = 1; // start blink
      }
      if (blink.phase > 0) {
        blink.phase -= dt * 8; // blink takes ~0.12s
        const blinkVal = Math.max(0, blink.phase < 0.5 ? blink.phase * 2 : (1 - blink.phase) * 2);
        morphs.set('eyeBlinkLeft', blinkVal * w);
        morphs.set('eyeBlinkRight', blinkVal * w);
      } else {
        morphs.set('eyeBlinkLeft', 0);
        morphs.set('eyeBlinkRight', 0);
      }

      // ─────────────────────────────────────────────
      //  LAYER 3: IDLE VARIATIONS (cycle every 6-16s)
      // ─────────────────────────────────────────────
      variation.timer += dt;
      if (variation.timer >= variation.duration) {
        variation.timer = 0;
        variation.duration = VARIATION_DURATION.min + Math.random() * (VARIATION_DURATION.max - VARIATION_DURATION.min);
        variation.current = weightedPick(beh.idleWeights, variation.current);
        stretch.progress = 0;
      }

      const v = variation.current;

      // ── Standing: weight shift + gentle sway ──
      if (v === 'standing') {
        const swayN = noise1D(t.total, 10, 0.3);
        const swayN2 = noise1D(t.total, 20, 0.5);
        if (b.Hips) {
          b.Hips.rotation.z = smoothLerp(b.Hips.rotation.z, swayN * 0.018 * sw * w, 3, dt);
          b.Hips.rotation.y = smoothLerp(b.Hips.rotation.y, swayN2 * 0.012 * sw * w, 3, dt);
          b.Hips.position.x = smoothLerp(b.Hips.position.x || 0, swayN * 0.004 * sw * w, 3, dt);
        }
        if (b.Spine) b.Spine.rotation.z = noise1D(t.total, 30, 0.45) * -0.01 * sw * w;
        // Subtle arm motion
        const armN = noise1D(t.total, 40, 0.4);
        if (b.LeftArm) b.LeftArm.rotation.x = smoothLerp(b.LeftArm.rotation.x, armN * 0.04 * am * w, 3, dt);
        if (b.RightArm) b.RightArm.rotation.x = smoothLerp(b.RightArm.rotation.x, -armN * 0.03 * am * w, 3, dt);
        if (b.LeftForeArm) b.LeftForeArm.rotation.y = noise1D(t.total, 50, 0.35) * 0.05 * am * w;
        if (b.RightForeArm) b.RightForeArm.rotation.y = noise1D(t.total, 60, 0.38) * -0.05 * am * w;

        // Head micro-movement
        const headN = noise2D(t.total, 70, 0.2);
        if (b.Head) {
          b.Head.rotation.y = smoothLerp(b.Head.rotation.y, rg('Head', 'y') + headN.y * 0.07 * hm * w, 1.8, dt);
          b.Head.rotation.x = smoothLerp(b.Head.rotation.x, rg('Head', 'x') + headN.x * 0.04 * hm * w, 1.8, dt);
        }
        if (b.Neck) {
          b.Neck.rotation.y = smoothLerp(b.Neck.rotation.y, rg('Neck', 'y') + headN.y * 0.03 * hm * w, 2, dt);
        }
      }

      // ── Shifting: side-to-side weight shift ──
      else if (v === 'shifting') {
        const shiftN = noise1D(t.total, 80, 0.15);
        if (b.Hips) {
          b.Hips.rotation.z = smoothLerp(b.Hips.rotation.z, shiftN * 0.03 * sw * w, 1.5, dt);
          b.Hips.position.x = smoothLerp(b.Hips.position.x || 0, shiftN * 0.01 * sw * w, 1.5, dt);
        }
        // Counter-rotate spine for natural feel
        if (b.Spine) b.Spine.rotation.z = smoothLerp(b.Spine.rotation.z || 0, -shiftN * 0.015 * sw * w, 2, dt);

        // Arms hang with slight sway
        const armShiftN = noise1D(t.total, 90, 0.25);
        if (b.LeftArm) b.LeftArm.rotation.x = smoothLerp(b.LeftArm.rotation.x, armShiftN * 0.03 * am * w, 2, dt);
        if (b.RightArm) b.RightArm.rotation.x = smoothLerp(b.RightArm.rotation.x, -armShiftN * 0.025 * am * w, 2, dt);

        // Head follows body
        const headShift = noise2D(t.total, 100, 0.18);
        if (b.Head) {
          b.Head.rotation.y = smoothLerp(b.Head.rotation.y, rg('Head', 'y') + headShift.y * 0.05 * hm * w, 1.5, dt);
          b.Head.rotation.x = smoothLerp(b.Head.rotation.x, rg('Head', 'x') + headShift.x * 0.03 * hm * w, 1.5, dt);
        }
      }

      // ── lookAround: exaggerated head scanning ──
      else if (v === 'lookAround') {
        // Center hips
        if (b.Hips) {
          b.Hips.rotation.z = smoothLerp(b.Hips.rotation.z, 0, 2, dt);
          b.Hips.position.x = smoothLerp(b.Hips.position.x || 0, 0, 2, dt);
        }
        // Big head movement using noise for unpredictability
        const lookN = noise2D(t.total, 110, 0.12);
        const bigLookY = lookN.y * 0.18 * hm * w;
        const bigLookX = lookN.x * 0.12 * hm * w;
        if (b.Head) {
          b.Head.rotation.y = smoothLerp(b.Head.rotation.y, bigLookY, 2, dt);
          b.Head.rotation.x = smoothLerp(b.Head.rotation.x, bigLookX, 2, dt);
        }
        if (b.Neck) b.Neck.rotation.y = smoothLerp(b.Neck.rotation.y, bigLookY * 0.4, 2, dt);
        // Spine follows head subtly
        if (b.Spine2) b.Spine2.rotation.y = bigLookY * 0.15;
        // Arms return to rest
        if (b.LeftArm) b.LeftArm.rotation.x = smoothLerp(b.LeftArm.rotation.x, 0, 2, dt);
        if (b.RightArm) b.RightArm.rotation.x = smoothLerp(b.RightArm.rotation.x, 0, 2, dt);
      }

      // ── Stretch: arms up, lean back, relax ──
      else if (v === 'stretch') {
        stretch.progress = Math.min(stretch.progress + dt * 0.35, 1);
        const sp = stretch.progress;
        // Phase 1 (0-0.4): lift; Phase 2 (0.4-0.7): hold; Phase 3 (0.7-1): lower
        const lift = sp < 0.4 ? sp / 0.4 : sp < 0.7 ? 1 : 1 - (sp - 0.7) / 0.3;
        const lean = sp > 0.2 && sp < 0.7 ? Math.sin((sp - 0.2) / 0.5 * Math.PI) : 0;

        const laBase = needsArmDown ? rg('LeftArm', 'z') + 1.1 : rg('LeftArm', 'z');
        const raBase = needsArmDown ? rg('RightArm', 'z') - 1.1 : rg('RightArm', 'z');

        if (b.LeftArm) b.LeftArm.rotation.z = smoothLerp(b.LeftArm.rotation.z, laBase + lift * 1.5 * am * w, 4, dt);
        if (b.RightArm) b.RightArm.rotation.z = smoothLerp(b.RightArm.rotation.z, raBase - lift * 1.5 * am * w, 4, dt);
        if (b.LeftForeArm) b.LeftForeArm.rotation.z = smoothLerp(b.LeftForeArm.rotation.z, (needsArmDown ? rg('LeftForeArm', 'z') + 0.15 : rg('LeftForeArm', 'z')) + lift * 0.3, 4, dt);
        if (b.RightForeArm) b.RightForeArm.rotation.z = smoothLerp(b.RightForeArm.rotation.z, (needsArmDown ? rg('RightForeArm', 'z') - 0.15 : rg('RightForeArm', 'z')) - lift * 0.3, 4, dt);

        if (b.Spine1) b.Spine1.rotation.x += lean * -0.08 * ge * w;
        if (b.Spine2) b.Spine2.rotation.x += lean * -0.06 * ge * w;
        if (b.Head) b.Head.rotation.x = smoothLerp(b.Head.rotation.x, lean * -0.1, 3, dt);
        // Happy face
        if (sp > 0.3 && sp < 0.8) morphs.set('mouthSmile', 0.2 * w);
        // Center hips
        if (b.Hips) {
          b.Hips.rotation.z = smoothLerp(b.Hips.rotation.z, 0, 2, dt);
          b.Hips.position.x = smoothLerp(b.Hips.position.x || 0, 0, 2, dt);
        }
      }

      // ── Return legs to rest when not shifting ──
      if (v !== 'shifting') {
        if (b.LeftUpLeg) b.LeftUpLeg.rotation.x = smoothLerp(b.LeftUpLeg.rotation.x, rg('LeftUpLeg', 'x'), 4, dt);
        if (b.RightUpLeg) b.RightUpLeg.rotation.x = smoothLerp(b.RightUpLeg.rotation.x, rg('RightUpLeg', 'x'), 4, dt);
        if (b.LeftLeg) b.LeftLeg.rotation.x = smoothLerp(b.LeftLeg.rotation.x, rg('LeftLeg', 'x'), 4, dt);
        if (b.RightLeg) b.RightLeg.rotation.x = smoothLerp(b.RightLeg.rotation.x, rg('RightLeg', 'x'), 4, dt);
      }

      // ── Idle face expression (gentle, alive) ──
      const faceW = beh.faceScale * w;
      if (faceW > 0) {
        // Subtle smile that drifts
        morphs.set('mouthSmile', Math.max(0, noise1D(t.total, 200, 0.15) * 0.06 * faceW));
      }

      // ─────────────────────────────────────────────
      //  LAYER 6: FLOATING DRIFT
      // ─────────────────────────────────────────────
      if (groupRef?.current) {
        const driftN = noise2D(t.total, 300, 0.06);
        drift.x = driftN.x * 0.015 * sw * w;
        groupRef.current.position.x = smoothLerp(groupRef.current.position.x, drift.x, 1.5, dt);
        groupRef.current.position.y = smoothLerp(groupRef.current.position.y, drift.y, 2, dt);
      }
    },
  };
}
