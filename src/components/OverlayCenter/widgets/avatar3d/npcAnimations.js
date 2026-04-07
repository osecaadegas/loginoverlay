/**
 * npcAnimations.js — Procedural bone poses for NPC behaviors
 *
 * Each pose function receives (dt, progress, rig, weight, npcTime) and mutates
 * bones/morphs. npcTime is seconds since this NPC pose began (resets on change).
 *
 * KEY FIX: Uses absolute bone targets (never +=) to prevent accumulation drift.
 * Applies only via smoothLerp to get smooth transitions between poses.
 *
 * Called from animationController when NPC is active.
 */

import { smoothLerp } from './noise';

/* ── Helpers ── */

// Hermite ease — holds longer at 0 and 1 vs simple sine
function smoothstep(t) { return t * t * (3 - 2 * t); }

// Rest-aware target: offset from the bone's rest pose
function rTarget(rig, boneName, axis, offset) {
  return (rig.restPose?.[boneName]?.[axis] ?? 0) + offset;
}

/**
 * Walking cycle — proper gait with coordinated limbs.
 * ~1.6 steps/sec (natural walk cadence), phase-consistent.
 */
export function applyWalking(dt, progress, rig, weight, npcTime) {
  const { bones: b, morphs, restPose } = rig;
  const w = weight;

  // Walk frequency: 1.6 Hz = ~96 steps/min (natural cadence)
  const freq = 1.6;
  const phase = npcTime * freq * Math.PI * 2;
  const step = Math.sin(phase);                    // -1..1 oscillation
  const stepAbs = Math.abs(step);
  const halfStep = Math.sin(phase * 2);            // double freq for bob

  // ── Legs: swing ±0.4 rad ──
  const legSwing = step * 0.4 * w;
  if (b.LeftUpLeg)  b.LeftUpLeg.rotation.x  = smoothLerp(b.LeftUpLeg.rotation.x,  rTarget(rig, 'LeftUpLeg', 'x', legSwing), 8, dt);
  if (b.RightUpLeg) b.RightUpLeg.rotation.x = smoothLerp(b.RightUpLeg.rotation.x, rTarget(rig, 'RightUpLeg', 'x', -legSwing), 8, dt);

  // ── Knees: bend on trailing leg ──
  const lKnee = Math.max(0, -step) * 0.6 * w;  // left knee bends when left leg goes back
  const rKnee = Math.max(0,  step) * 0.6 * w;  // right knee bends when right leg goes back
  if (b.LeftLeg)  b.LeftLeg.rotation.x  = smoothLerp(b.LeftLeg.rotation.x,  rTarget(rig, 'LeftLeg', 'x', lKnee), 8, dt);
  if (b.RightLeg) b.RightLeg.rotation.x = smoothLerp(b.RightLeg.rotation.x, rTarget(rig, 'RightLeg', 'x', rKnee), 8, dt);

  // ── Counter arm swing: ±0.25 rad, opposite to legs ──
  const armSwing = step * 0.25 * w;
  if (b.LeftArm)  b.LeftArm.rotation.x  = smoothLerp(b.LeftArm.rotation.x,  rTarget(rig, 'LeftArm', 'x', -armSwing), 6, dt);
  if (b.RightArm) b.RightArm.rotation.x = smoothLerp(b.RightArm.rotation.x, rTarget(rig, 'RightArm', 'x', armSwing), 6, dt);

  // ── Elbow: slight bend during arm forward swing ──
  const lElbow = Math.max(0, -step) * 0.2 * w;
  const rElbow = Math.max(0,  step) * 0.2 * w;
  if (b.LeftForeArm)  b.LeftForeArm.rotation.x  = smoothLerp(b.LeftForeArm.rotation.x,  rTarget(rig, 'LeftForeArm', 'x', -lElbow), 6, dt);
  if (b.RightForeArm) b.RightForeArm.rotation.x = smoothLerp(b.RightForeArm.rotation.x, rTarget(rig, 'RightForeArm', 'x', -rElbow), 6, dt);

  // ── Hip bob: absolute Y offset (double frequency — one bob per step) ──
  if (b.Hips) {
    const restY = b.Hips._restY ?? b.Hips.position.y;
    if (b.Hips._restY === undefined) b.Hips._restY = b.Hips.position.y;
    const bobTarget = restY + (1 - stepAbs) * 0.008 * w; // dip at midstep
    b.Hips.position.y = smoothLerp(b.Hips.position.y, bobTarget, 10, dt);
  }

  // ── Torso twist: follows legs ──
  if (b.Spine) b.Spine.rotation.y = smoothLerp(b.Spine.rotation.y, step * 0.04 * w, 5, dt);

  // ── Slight forward lean ──
  if (b.Spine1) b.Spine1.rotation.x = smoothLerp(b.Spine1.rotation.x || 0, 0.03 * w, 3, dt);

  // ── Head: subtle opposite twist + slight nod ──
  if (b.Head) {
    b.Head.rotation.y = smoothLerp(b.Head.rotation.y, -step * 0.02 * w, 4, dt);
    b.Head.rotation.x = smoothLerp(b.Head.rotation.x, stepAbs * -0.015 * w, 4, dt);
  }

  // Neutral/pleasant face
  morphs.set('mouthSmile', 0.1 * w);
}

/**
 * Push-up cycle — body tilts forward, arms push up and down.
 * ~0.6 reps/sec with hold at top and bottom (smoothstep timing).
 */
export function applyPushUp(dt, progress, rig, weight, npcTime) {
  const { bones: b, morphs, restPose } = rig;
  const w = weight;

  // Rep cycle: 0.6 Hz = ~1.67s per rep, smoothstep for top/bottom hold
  const rawCycle = (npcTime * 0.6) % 1.0;           // 0→1 sawtooth
  const down = smoothstep(Math.abs(rawCycle * 2 - 1)); // 0→1→0 with holds

  // ── Torso: tilt forward significantly ──
  if (b.Spine)  b.Spine.rotation.x  = smoothLerp(b.Spine.rotation.x,  1.1 * w, 4, dt);
  if (b.Spine1) b.Spine1.rotation.x = smoothLerp(b.Spine1.rotation.x, 0.2 * w, 4, dt);
  if (b.Spine2) b.Spine2.rotation.x = smoothLerp(b.Spine2.rotation.x, 0.15 * w, 4, dt);

  // ── Arms: reach forward and down, elbows bend on "down" ──
  const armForward = -0.7 * w;                       // arms point down/forward
  const elbowBend = down * 1.2 * w;                  // deep elbow bend at bottom
  if (b.LeftArm)  b.LeftArm.rotation.x  = smoothLerp(b.LeftArm.rotation.x,  armForward, 5, dt);
  if (b.RightArm) b.RightArm.rotation.x = smoothLerp(b.RightArm.rotation.x, armForward, 5, dt);
  if (b.LeftForeArm)  b.LeftForeArm.rotation.x  = smoothLerp(b.LeftForeArm.rotation.x,  -elbowBend, 6, dt);
  if (b.RightForeArm) b.RightForeArm.rotation.x = smoothLerp(b.RightForeArm.rotation.x, -elbowBend, 6, dt);

  // ── Head: look up (watching stream) ──
  if (b.Head) b.Head.rotation.x = smoothLerp(b.Head.rotation.x, -0.5 * w, 3, dt);
  if (b.Neck) b.Neck.rotation.x = smoothLerp(b.Neck.rotation.x, -0.25 * w, 3, dt);

  // ── Legs: straight back ──
  if (b.LeftUpLeg)  b.LeftUpLeg.rotation.x  = smoothLerp(b.LeftUpLeg.rotation.x,  0, 4, dt);
  if (b.RightUpLeg) b.RightUpLeg.rotation.x = smoothLerp(b.RightUpLeg.rotation.x, 0, 4, dt);
  if (b.LeftLeg)  b.LeftLeg.rotation.x  = smoothLerp(b.LeftLeg.rotation.x,  0, 4, dt);
  if (b.RightLeg) b.RightLeg.rotation.x = smoothLerp(b.RightLeg.rotation.x, 0, 4, dt);

  // ── Hip Y: absolute vertical offset for body dip (NOT +=) ──
  if (b.Hips) {
    const restY = b.Hips._restY ?? b.Hips.position.y;
    if (b.Hips._restY === undefined) b.Hips._restY = b.Hips.position.y;
    const dipTarget = restY - down * 0.025 * w;
    b.Hips.position.y = smoothLerp(b.Hips.position.y, dipTarget, 8, dt);
  }

  // ── Effort face ──
  morphs.set('mouthOpen', down * 0.3 * w);
  morphs.set('browInnerUp', down * 0.45 * w);
  morphs.set('mouthSmile', (1 - down) * 0.15 * w);
}

/**
 * Peeking at chat — lean toward chat, hand shading eyes.
 */
export function applyPeeking(dt, progress, rig, weight, npcTime) {
  const { bones: b, morphs } = rig;
  const w = weight;
  const sway = Math.sin(npcTime * 1.2) * 0.02;

  // Lean toward chat
  if (b.Spine) b.Spine.rotation.z = smoothLerp(b.Spine.rotation.z || 0, -0.12 * w + sway, 3, dt);
  if (b.Spine1) b.Spine1.rotation.z = smoothLerp(b.Spine1.rotation.z || 0, -0.06 * w, 3, dt);

  // Hand above eyes (peering gesture)
  if (b.RightArm) b.RightArm.rotation.x = smoothLerp(b.RightArm.rotation.x, -0.8 * w, 4, dt);
  if (b.RightArm) b.RightArm.rotation.z = smoothLerp(b.RightArm.rotation.z, -0.3 * w, 4, dt);
  if (b.RightForeArm) b.RightForeArm.rotation.x = smoothLerp(b.RightForeArm.rotation.x, -1.2 * w, 4, dt);

  // Head tilted, squinting
  if (b.Head) {
    b.Head.rotation.z = smoothLerp(b.Head.rotation.z, -0.08 * w, 3, dt);
    b.Head.rotation.y = smoothLerp(b.Head.rotation.y, -0.1 * w, 3, dt);
  }

  // Squint + curious face
  morphs.set('browInnerUp', 0.3 * w);
  morphs.set('mouthSmile', 0.15 * w);
}

/**
 * Waving at chat — friendly wave with one hand.
 */
export function applyNpcWaving(dt, progress, rig, weight, npcTime) {
  const { bones: b, morphs } = rig;
  const w = weight;
  const waveOsc = Math.sin(npcTime * 6) * (0.8 + Math.sin(npcTime * 0.5) * 0.2);

  // Right arm up
  if (b.RightArm) {
    b.RightArm.rotation.z = smoothLerp(b.RightArm.rotation.z, -2.0 * w, 5, dt);
    b.RightArm.rotation.x = smoothLerp(b.RightArm.rotation.x, 0, 4, dt);
  }
  if (b.RightForeArm) {
    b.RightForeArm.rotation.z = smoothLerp(b.RightForeArm.rotation.z, waveOsc * 0.3 * w, 6, dt);
    b.RightForeArm.rotation.y = smoothLerp(b.RightForeArm.rotation.y || 0, waveOsc * 0.15 * w, 6, dt);
  }

  // Slight body lean toward wave
  if (b.Spine) b.Spine.rotation.z = smoothLerp(b.Spine.rotation.z || 0, 0.04 * w, 3, dt);

  // Head tilt
  if (b.Head) b.Head.rotation.z = smoothLerp(b.Head.rotation.z, 0.06 * w, 3, dt);

  // Friendly face
  morphs.set('mouthSmile', 0.4 * w);
  morphs.set('browInnerUp', 0.15 * w);
}

/**
 * Map pose names to animation functions.
 */
export const NPC_POSE_MAP = {
  walking: applyWalking,
  pushup: applyPushUp,
  peeking: applyPeeking,
  waving: applyNpcWaving,
};
