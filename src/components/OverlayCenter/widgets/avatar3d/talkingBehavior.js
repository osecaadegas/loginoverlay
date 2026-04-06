/**
 * talkingBehavior.js — Speech animation system
 *
 * Drives mouth/viseme animation, head movement, gestures,
 * and body language during the talking state.
 *
 * Three speech sub-styles selected per utterance:
 *   conversational — warm, gentle nods, subtle gestures
 *   energetic      — big expressions, bouncy, wide smiles
 *   explaining     — deliberate gestures, teacher-like, reaching/pointing
 *
 * Lip sync uses 3-layer rhythm system:
 *   Syllable (~8Hz)  — fast phoneme-like oscillation
 *   Word (~2Hz)      — grouping with micro-pauses
 *   Sentence (~0.3Hz) — prosody envelope
 *
 * VRC models get true viseme cycling through shape sequences.
 */

import { noise1D, smoothLerp, weightedPick } from './noise';

// Viseme sequence for lip-sync cycling (ordered for natural flow)
const VISEME_SEQUENCE = ['viseme_aa', 'viseme_ee', 'viseme_oh', 'viseme_ch', 'viseme_aa', 'viseme_ou', 'viseme_ff', 'viseme_ee'];
const ALL_VISEMES = ['viseme_aa','viseme_oh','viseme_ee','viseme_ih','viseme_ou','viseme_ff','viseme_ss','viseme_ch','viseme_dd','viseme_pp','viseme_nn','viseme_kk','viseme_rr','viseme_th','viseme_sil'];

export function createTalkingBehavior() {
  // Speech rhythm oscillators
  const phase = { syllable: 0, word: 0, sentence: 0 };
  // Micro-pause system
  const pause = { active: false, timer: 0 };
  // Emphasis system
  const emphasis = { timer: 0, next: 1.2, strength: 0 };
  // Gesture state machine: 0=rest, 1=reach, 2=hold, 3=retract
  const gesture = { beat: 0, timer: 0, side: 1, target: { armX: 0, armZ: 0, foreX: 0, foreY: 0 } };
  // Per-utterance speak style
  let speakStyle = 'conversational';
  let speechTime = 0;
  let initialized = false;

  return {
    get style() { return speakStyle; },

    /**
     * Called when entering talking state. Picks a new speak style.
     */
    onEnter(behavior) {
      speakStyle = weightedPick(behavior.speakWeights, speakStyle);
      // Reset all oscillators
      phase.syllable = 0; phase.word = 0; phase.sentence = 0;
      pause.active = false; pause.timer = 0;
      emphasis.timer = 0; emphasis.next = 0.8 + Math.random() * 1.4; emphasis.strength = 0;
      gesture.beat = 0; gesture.timer = 0;
      gesture.side = Math.random() > 0.5 ? 1 : -1;
      speechTime = 0;
      initialized = true;
    },

    /**
     * Tick every frame during talking state.
     */
    update(dt, weight, rig, params, groupRef) {
      if (weight < 0.01 || !initialized) return;
      const { bones: b, morphs, hasVisemes, restPose, needsArmDown, behavior } = rig;
      const beh = behavior;
      const w = weight;
      speechTime += dt;

      const hm = (params.headMove ?? 1) * beh.headScale;
      const am = (params.armMove ?? 1) * beh.bodyScale;
      const ge = (params.gestures ?? 1) * beh.gestureScale;
      const sw = (params.sway ?? 1) * beh.bodyScale;
      const rg = (bone, axis) => restPose[bone]?.[axis] ?? 0;

      // ─────────────────────────────────────────────
      //  3-LAYER SPEECH RHYTHM
      // ─────────────────────────────────────────────
      phase.syllable += dt * 8.5;
      phase.word += dt * 2.2;
      phase.sentence += dt * 0.35;

      // Random micro-pauses between "words"
      if (!pause.active) {
        if (Math.sin(phase.word) > 0.85 && pause.timer <= 0) {
          pause.active = true;
          pause.timer = 0.08 + Math.random() * 0.14;
        }
      }
      if (pause.active) {
        pause.timer -= dt;
        if (pause.timer <= 0) pause.active = false;
      }

      const pauseMult = pause.active ? 0.05 : 1.0;
      const sentenceEnv = 0.6 + 0.4 * Math.sin(phase.sentence);
      const wordEnv = 0.5 + 0.5 * Math.max(0, Math.sin(phase.word));
      const syl1 = Math.sin(phase.syllable) * 0.35;
      const syl2 = Math.sin(phase.syllable * 1.73 + 0.5) * 0.2;
      const syl3 = Math.sin(phase.syllable * 0.7 + 1.2) * 0.15;
      const rawMouth = (0.25 + syl1 + syl2 + syl3) * wordEnv * sentenceEnv * pauseMult;
      const mouthVal = Math.max(0, Math.min(1, rawMouth));
      const jawVal = mouthVal * 0.55 + Math.max(0, mouthVal - 0.3) * 0.3;

      // ── Apply mouth morphs ──
      morphs.set('mouthOpen', mouthVal * w);
      morphs.set('jawOpen', jawVal * w);

      // ── VRC viseme cycling ──
      if (hasVisemes) {
        for (const v of ALL_VISEMES) morphs.set(v, 0);
        if (mouthVal > 0.05) {
          const idx = Math.floor(phase.syllable * 0.7) % VISEME_SEQUENCE.length;
          const nextIdx = (idx + 1) % VISEME_SEQUENCE.length;
          const blend = (phase.syllable * 0.7) % 1;
          morphs.set(VISEME_SEQUENCE[idx], mouthVal * (1 - blend) * w);
          morphs.set(VISEME_SEQUENCE[nextIdx], mouthVal * blend * w);
        } else {
          morphs.set('viseme_sil', 0.3 * w);
        }
      }

      // ─────────────────────────────────────────────
      //  EMPHASIS SYSTEM (periodic head nods)
      // ─────────────────────────────────────────────
      emphasis.timer += dt;
      if (emphasis.timer >= emphasis.next) {
        emphasis.timer = 0;
        emphasis.next = 0.8 + Math.random() * 1.8;
        emphasis.strength = 0.6 + Math.random() * 0.4;
      }
      emphasis.strength = Math.max(0, emphasis.strength - dt * 2.5);
      const emph = emphasis.strength;

      // ─────────────────────────────────────────────
      //  GESTURE STATE MACHINE
      // ─────────────────────────────────────────────
      gesture.timer += dt;
      if (gesture.beat === 0 && gesture.timer > 1.5 + Math.random() * 2.0) {
        gesture.beat = 1; gesture.timer = 0;
        gesture.side = Math.random() > 0.4 ? gesture.side : -gesture.side;
        const gType = Math.random();
        if (gType < 0.33) gesture.target = { armX: -0.35, armZ: -0.7 * gesture.side, foreX: -0.4, foreY: 0.2 * gesture.side };
        else if (gType < 0.66) gesture.target = { armX: -0.25, armZ: -0.6 * gesture.side, foreX: -0.6, foreY: 0.35 * gesture.side };
        else gesture.target = { armX: -0.45, armZ: -0.55 * gesture.side, foreX: -0.7, foreY: 0.15 * gesture.side };
      } else if (gesture.beat === 1 && gesture.timer > 0.3 + Math.random() * 0.2) {
        gesture.beat = 2; gesture.timer = 0;
      } else if (gesture.beat === 2 && gesture.timer > 0.4 + Math.random() * 0.6) {
        gesture.beat = 3; gesture.timer = 0;
      } else if (gesture.beat === 3 && gesture.timer > 0.3 + Math.random() * 0.2) {
        gesture.beat = 0; gesture.timer = 0;
      }

      let gestureBlend = 0;
      if (gesture.beat === 1) gestureBlend = Math.min(gesture.timer / 0.3, 1);
      else if (gesture.beat === 2) gestureBlend = 1;
      else if (gesture.beat === 3) gestureBlend = 1 - Math.min(gesture.timer / 0.35, 1);
      const holdWobble = gesture.beat === 2 ? Math.sin(gesture.timer * 3) * 0.02 : 0;

      // ── Weight shift ──
      const wsN = noise1D(speechTime, 400, 0.12);
      if (b.Hips) {
        b.Hips.position.x = smoothLerp(b.Hips.position.x || 0, wsN * 0.008 * sw * w, 1.5, dt);
        b.Hips.rotation.z = smoothLerp(b.Hips.rotation.z, wsN * 0.012 * sw * w, 1.5, dt);
      }

      // ── Return group X to center ──
      if (groupRef?.current) {
        groupRef.current.position.x = smoothLerp(groupRef.current.position.x, 0, 3, dt);
      }

      // ── Return legs to rest ──
      if (b.LeftUpLeg) b.LeftUpLeg.rotation.x = smoothLerp(b.LeftUpLeg.rotation.x, rg('LeftUpLeg', 'x'), 4, dt);
      if (b.RightUpLeg) b.RightUpLeg.rotation.x = smoothLerp(b.RightUpLeg.rotation.x, rg('RightUpLeg', 'x'), 4, dt);
      if (b.LeftLeg) b.LeftLeg.rotation.x = smoothLerp(b.LeftLeg.rotation.x, rg('LeftLeg', 'x'), 4, dt);
      if (b.RightLeg) b.RightLeg.rotation.x = smoothLerp(b.RightLeg.rotation.x, rg('RightLeg', 'x'), 4, dt);

      // ═══════════════════════════════════════════════
      //  SPEAK STYLE: Conversational
      // ═══════════════════════════════════════════════
      if (speakStyle === 'conversational') {
        // Face: gentle smile
        if (beh.faceScale > 0) {
          const smile = (0.12 + sentenceEnv * 0.06 + Math.sin(phase.word * 0.8) * 0.04 + emph * 0.08) * w;
          morphs.set('mouthSmile', smile);
          morphs.set('browInnerUp', (0.05 + emph * 0.2 + sentenceEnv * 0.04) * w);
        }
        // Head: emphasis nods + drift
        if (b.Head) {
          const nodX = -emph * 0.06 * ge + Math.sin(phase.word * 0.5) * 0.015 * ge;
          const driftY = Math.sin(phase.sentence * 1.1) * 0.04 * ge + Math.sin(phase.word * 0.3) * 0.02 * ge;
          const tiltZ = Math.sin(phase.sentence * 0.7 + 0.5) * 0.015 * ge;
          b.Head.rotation.x = smoothLerp(b.Head.rotation.x, nodX * w, 5, dt);
          b.Head.rotation.y = smoothLerp(b.Head.rotation.y, driftY * w, 2.5, dt);
          b.Head.rotation.z = smoothLerp(b.Head.rotation.z, tiltZ * w, 2, dt);
        }
        if (b.Neck) {
          b.Neck.rotation.y = smoothLerp(b.Neck.rotation.y, Math.sin(phase.sentence * 0.6) * 0.02 * ge * w, 2, dt);
          b.Neck.rotation.x = smoothLerp(b.Neck.rotation.x, -emph * 0.02 * ge * w, 4, dt);
        }
        // Shoulders micro-lift
        if (b.LeftShoulder) b.LeftShoulder.rotation.z = smoothLerp(b.LeftShoulder.rotation.z || 0, emph * 0.015 * ge * w, 4, dt);
        if (b.RightShoulder) b.RightShoulder.rotation.z = smoothLerp(b.RightShoulder.rotation.z || 0, -emph * 0.015 * ge * w, 4, dt);
        // Spine drift
        if (b.Spine) b.Spine.rotation.y = smoothLerp(b.Spine.rotation.y || 0, Math.sin(phase.sentence * 0.5) * 0.01 * ge * w, 1.5, dt);
        if (b.Spine2) b.Spine2.rotation.y = smoothLerp(b.Spine2.rotation.y || 0, Math.sin(phase.sentence * 0.4 + 0.3) * 0.008 * ge * w, 1.5, dt);
        // Arms: subtle fidget
        const armD = Math.sin(phase.sentence * 0.4) * 0.02 * am;
        if (b.LeftArm) b.LeftArm.rotation.x = smoothLerp(b.LeftArm.rotation.x, armD * w, 2, dt);
        if (b.RightArm) b.RightArm.rotation.x = smoothLerp(b.RightArm.rotation.x, -armD * 0.7 * w, 2, dt);
      }

      // ═══════════════════════════════════════════════
      //  SPEAK STYLE: Energetic
      // ═══════════════════════════════════════════════
      else if (speakStyle === 'energetic') {
        // Face: wide smile
        if (beh.faceScale > 0) {
          morphs.set('mouthSmile', Math.min(0.85, (0.35 + sentenceEnv * 0.12 + emph * 0.15) * w));
          morphs.set('browInnerUp', Math.min(0.6, (0.15 + emph * 0.25 + Math.sin(phase.word * 0.6) * 0.08) * w));
        }
        // Head: bigger nods + side motion
        if (b.Head) {
          const bigNod = -emph * 0.09 * ge + Math.sin(phase.word * 0.7) * 0.025 * ge;
          const side = Math.sin(phase.sentence * 1.5) * 0.06 * ge + Math.sin(phase.word * 0.4) * 0.03 * ge;
          const tilt = Math.sin(phase.sentence * 0.8) * 0.03 * ge + emph * 0.02 * ge;
          b.Head.rotation.x = smoothLerp(b.Head.rotation.x, bigNod * w, 5, dt);
          b.Head.rotation.y = smoothLerp(b.Head.rotation.y, side * w, 3, dt);
          b.Head.rotation.z = smoothLerp(b.Head.rotation.z, tilt * w, 3, dt);
        }
        if (b.Neck) {
          b.Neck.rotation.x = smoothLerp(b.Neck.rotation.x, -emph * 0.03 * ge * w, 4, dt);
          b.Neck.rotation.y = smoothLerp(b.Neck.rotation.y, Math.sin(phase.sentence) * 0.03 * ge * w, 2, dt);
        }
        // Body bounce
        if (groupRef?.current) {
          const bounce = Math.max(0, Math.sin(phase.word)) * 0.006 * ge + emph * 0.004 * ge;
          groupRef.current.position.y += bounce * w;
        }
        // Arms: animated
        const armEnergy = 0.06 + emph * 0.12;
        const armCycle = Math.sin(phase.word * 0.6);
        const laBase = needsArmDown ? rg('LeftArm', 'z') + 1.1 : rg('LeftArm', 'z');
        const raBase = needsArmDown ? rg('RightArm', 'z') - 1.1 : rg('RightArm', 'z');
        if (b.LeftArm) {
          b.LeftArm.rotation.x = smoothLerp(b.LeftArm.rotation.x, rg('LeftArm', 'x') + armCycle * armEnergy * ge * w, 4, dt);
          b.LeftArm.rotation.z = smoothLerp(b.LeftArm.rotation.z, laBase + Math.sin(phase.sentence * 1.2) * 0.2 * ge * w + emph * 0.15 * w, 3, dt);
        }
        if (b.RightArm) {
          b.RightArm.rotation.x = smoothLerp(b.RightArm.rotation.x, rg('RightArm', 'x') - armCycle * armEnergy * 0.8 * ge * w, 4, dt);
          b.RightArm.rotation.z = smoothLerp(b.RightArm.rotation.z, raBase - Math.sin(phase.sentence * 1.1 + 0.5) * 0.2 * ge * w - emph * 0.15 * w, 3, dt);
        }
        // Torso energy
        if (b.Hips) b.Hips.rotation.y = smoothLerp(b.Hips.rotation.y, Math.sin(phase.sentence * 0.8) * 0.02 * sw * w, 2, dt);
        if (b.Spine) b.Spine.rotation.y = smoothLerp(b.Spine.rotation.y || 0, Math.sin(phase.sentence * 0.6) * 0.015 * ge * w, 2, dt);
        // Shoulders pop
        if (b.LeftShoulder) b.LeftShoulder.rotation.z = smoothLerp(b.LeftShoulder.rotation.z || 0, emph * 0.025 * ge * w, 5, dt);
        if (b.RightShoulder) b.RightShoulder.rotation.z = smoothLerp(b.RightShoulder.rotation.z || 0, -emph * 0.025 * ge * w, 5, dt);
      }

      // ═══════════════════════════════════════════════
      //  SPEAK STYLE: Explaining (uses gesture state machine)
      // ═══════════════════════════════════════════════
      else if (speakStyle === 'explaining') {
        // Face: thoughtful
        if (beh.faceScale > 0) {
          morphs.set('mouthSmile', (0.08 + Math.sin(phase.sentence * 0.6) * 0.04 + emph * 0.06) * w);
          morphs.set('browInnerUp', Math.min(0.5, (0.1 + emph * 0.25 + Math.sin(phase.word * 0.4) * 0.06) * w));
        }
        // Head: deliberate nods
        if (b.Head) {
          const nodX = -emph * 0.07 * ge + 0.02 * ge;
          const scanY = Math.sin(phase.sentence * 0.8) * 0.05 * ge + Math.sin(phase.word * 0.2) * 0.02 * ge;
          const thinkTilt = Math.sin(phase.sentence * 0.5 + 1) * 0.02 * ge;
          b.Head.rotation.x = smoothLerp(b.Head.rotation.x, nodX * w, 4, dt);
          b.Head.rotation.y = smoothLerp(b.Head.rotation.y, scanY * w, 2, dt);
          b.Head.rotation.z = smoothLerp(b.Head.rotation.z, thinkTilt * w, 2, dt);
        }
        if (b.Neck) b.Neck.rotation.y = smoothLerp(b.Neck.rotation.y, Math.sin(phase.sentence * 0.5) * 0.025 * ge * w, 2, dt);

        // Gesture arm: reach/hold/retract
        const gt = gesture.target;
        const gSide = gesture.side;
        const useRight = gSide > 0;
        const gestArm = useRight ? b.RightArm : b.LeftArm;
        const gestFore = useRight ? b.RightForeArm : b.LeftForeArm;
        const restArm = useRight ? b.LeftArm : b.RightArm;
        const restFore = useRight ? b.LeftForeArm : b.RightForeArm;

        if (gestArm) {
          const gestArmName = useRight ? 'RightArm' : 'LeftArm';
          const armBase = needsArmDown ? rg(gestArmName, 'z') + (useRight ? -1.1 : 1.1) : rg(gestArmName, 'z');
          gestArm.rotation.x = smoothLerp(gestArm.rotation.x, rg(gestArmName, 'x') + gt.armX * ge * gestureBlend * w + holdWobble * ge, 4, dt);
          gestArm.rotation.z = smoothLerp(gestArm.rotation.z, armBase + gt.armZ * ge * gestureBlend * w, 3.5, dt);
        }
        if (gestFore) {
          gestFore.rotation.x = smoothLerp(gestFore.rotation.x, gt.foreX * ge * gestureBlend * w + holdWobble * 0.5, 4, dt);
          gestFore.rotation.y = smoothLerp(gestFore.rotation.y || 0, gt.foreY * ge * gestureBlend * w, 3.5, dt);
        }
        if (restArm) restArm.rotation.x = smoothLerp(restArm.rotation.x, Math.sin(phase.sentence * 0.3) * 0.015 * am * w, 2, dt);
        if (restFore) restFore.rotation.y = smoothLerp(restFore.rotation.y || 0, Math.sin(phase.word * 0.15) * 0.02 * am * w, 2, dt);

        // Lean forward
        if (b.Spine) b.Spine.rotation.x = smoothLerp(b.Spine.rotation.x || 0, (0.03 * ge + emph * 0.015) * w, 2, dt);
        if (b.Spine2) b.Spine2.rotation.y = smoothLerp(b.Spine2.rotation.y || 0, Math.sin(phase.sentence * 0.4) * 0.012 * ge * w, 2, dt);
        // Micro-shrug
        if (b.LeftShoulder) b.LeftShoulder.rotation.z = smoothLerp(b.LeftShoulder.rotation.z || 0, emph * 0.012 * ge * w, 4, dt);
        if (b.RightShoulder) b.RightShoulder.rotation.z = smoothLerp(b.RightShoulder.rotation.z || 0, -emph * 0.012 * ge * w, 4, dt);
      }
    },

    /**
     * Clean up morphs when leaving talking state.
     */
    onExit(morphs) {
      // Mouth/visemes fade handled by animation controller's morph fade
    },
  };
}
