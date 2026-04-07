/**
 * npcAnimations.js — Procedural bone poses for NPC behaviors
 *
 * Each pose function receives (dt, progress, rig, weight) and mutates
 * bones/morphs. Progress is 0..1 within the current action phase.
 *
 * Called from animationController when NPC is active.
 */

import { smoothLerp } from './noise';

/**
 * Walking cycle — rhythmic leg/arm swing with body bob.
 */
export function applyWalking(dt, progress, rig, weight, totalTime) {
  const { bones: b, morphs, behavior } = rig;
  const w = weight;
  const t = totalTime * 4; // cycle speed (4 Hz)
  const step = Math.sin(t * Math.PI);
  const stepAbs = Math.abs(step);

  // Leg swing (alternating)
  if (b.LeftUpLeg) b.LeftUpLeg.rotation.x = smoothLerp(b.LeftUpLeg.rotation.x, step * 0.35 * w, 6, dt);
  if (b.RightUpLeg) b.RightUpLeg.rotation.x = smoothLerp(b.RightUpLeg.rotation.x, -step * 0.35 * w, 6, dt);
  if (b.LeftLeg) b.LeftLeg.rotation.x = smoothLerp(b.LeftLeg.rotation.x, Math.max(0, -step) * 0.5 * w, 6, dt);
  if (b.RightLeg) b.RightLeg.rotation.x = smoothLerp(b.RightLeg.rotation.x, Math.max(0, step) * 0.5 * w, 6, dt);

  // Counter arm swing
  if (b.LeftArm) b.LeftArm.rotation.x = smoothLerp(b.LeftArm.rotation.x, -step * 0.2 * w, 5, dt);
  if (b.RightArm) b.RightArm.rotation.x = smoothLerp(b.RightArm.rotation.x, step * 0.2 * w, 5, dt);

  // Body bob (up-down on each step)
  if (b.Hips) {
    b.Hips.position.y = (b.Hips.position.y || 0) + stepAbs * 0.003 * w;
  }

  // Slight torso twist
  if (b.Spine) b.Spine.rotation.y = smoothLerp(b.Spine.rotation.y || 0, step * 0.03 * w, 4, dt);

  // Head bobs slightly
  if (b.Head) b.Head.rotation.x = smoothLerp(b.Head.rotation.x, stepAbs * -0.02 * w, 3, dt);

  // Neutral face
  morphs.set('mouthSmile', 0.1 * w);
}

/**
 * Push-up cycle — chest goes down and up, arms bend, body horizontal.
 */
export function applyPushUp(dt, progress, rig, weight, totalTime) {
  const { bones: b, morphs, behavior } = rig;
  const w = weight;

  // Push-up cycle: ~1.5s per rep
  const cycle = Math.sin(totalTime * 2.1 * Math.PI); // oscillates -1..1
  const down = (cycle + 1) * 0.5; // 0 = up, 1 = down

  // Lean the whole body forward (horizontal-ish)
  if (b.Spine) b.Spine.rotation.x = smoothLerp(b.Spine.rotation.x, 0.8 * w, 4, dt);
  if (b.Spine1) b.Spine1.rotation.x = smoothLerp(b.Spine1.rotation.x, 0.15 * w, 4, dt);
  if (b.Spine2) b.Spine2.rotation.x = smoothLerp(b.Spine2.rotation.x, 0.1 * w, 4, dt);

  // Arms: bend elbows during "down" phase
  const elbowBend = down * 1.0 * w;
  if (b.LeftArm) b.LeftArm.rotation.x = smoothLerp(b.LeftArm.rotation.x, -0.6 * w, 5, dt);
  if (b.RightArm) b.RightArm.rotation.x = smoothLerp(b.RightArm.rotation.x, -0.6 * w, 5, dt);
  if (b.LeftForeArm) b.LeftForeArm.rotation.x = smoothLerp(b.LeftForeArm.rotation.x, -elbowBend, 6, dt);
  if (b.RightForeArm) b.RightForeArm.rotation.x = smoothLerp(b.RightForeArm.rotation.x, -elbowBend, 6, dt);

  // Head looks up (watching stream)
  if (b.Head) b.Head.rotation.x = smoothLerp(b.Head.rotation.x, -0.4 * w, 3, dt);
  if (b.Neck) b.Neck.rotation.x = smoothLerp(b.Neck.rotation.x, -0.2 * w, 3, dt);

  // Legs straight
  if (b.LeftUpLeg) b.LeftUpLeg.rotation.x = smoothLerp(b.LeftUpLeg.rotation.x, 0.0, 4, dt);
  if (b.RightUpLeg) b.RightUpLeg.rotation.x = smoothLerp(b.RightUpLeg.rotation.x, 0.0, 4, dt);

  // Body bobs up/down with the push-up
  if (b.Hips) {
    b.Hips.position.y = (b.Hips.position.y || 0) - down * 0.015 * w;
  }

  // Effort face
  const effort = down;
  morphs.set('mouthOpen', effort * 0.25 * w);
  morphs.set('browInnerUp', effort * 0.4 * w);
  morphs.set('mouthSmile', (1 - effort) * 0.2 * w);
}

/**
 * Peeking at chat — lean toward chat, hand shading eyes.
 */
export function applyPeeking(dt, progress, rig, weight, totalTime) {
  const { bones: b, morphs } = rig;
  const w = weight;
  const sway = Math.sin(totalTime * 1.2) * 0.02;

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
export function applyNpcWaving(dt, progress, rig, weight, totalTime) {
  const { bones: b, morphs } = rig;
  const w = weight;
  const waveOsc = Math.sin(totalTime * 6) * (0.8 + Math.sin(totalTime * 0.5) * 0.2);

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
