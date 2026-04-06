/**
 * reactionSystem.js — One-shot reaction animations
 *
 * Triggered by Twitch events (new sub, raid, !hype, etc.)
 * Each reaction is a short procedural animation that plays
 * once and fades out, layered ON TOP of the current behavior.
 */

import { smoothLerp } from './noise';

/**
 * Reaction definitions.
 * Each has a duration and an `apply` function that receives
 * (progress 0..1, rig, weight, dt) and mutates bones/morphs.
 */
const REACTIONS = {
  jump: {
    duration: 0.7,
    apply(p, { bones: b, morphs, needsArmDown, restPose }, w) {
      const rg = (bone, axis) => restPose[bone]?.[axis] ?? 0;
      // Parabolic jump curve
      const jump = Math.sin(p * Math.PI) * 0.08 * w;
      // Arms fly up
      const armLift = Math.sin(p * Math.PI);
      const laBase = needsArmDown ? rg('LeftArm', 'z') + 1.1 : rg('LeftArm', 'z');
      const raBase = needsArmDown ? rg('RightArm', 'z') - 1.1 : rg('RightArm', 'z');
      if (b.LeftArm) b.LeftArm.rotation.z += armLift * 1.2 * w;
      if (b.RightArm) b.RightArm.rotation.z -= armLift * 1.2 * w;
      // Head tilts back
      if (b.Head) b.Head.rotation.x += Math.sin(p * Math.PI) * -0.15 * w;
      // Happy face
      morphs.set('mouthSmile', Math.sin(p * Math.PI) * 0.5 * w);
      morphs.set('browInnerUp', Math.sin(p * Math.PI) * 0.3 * w);
      return { yOffset: jump };
    },
  },

  nod: {
    duration: 0.8,
    apply(p, { bones: b, morphs }, w) {
      const nods = Math.sin(p * Math.PI * 3) * (1 - p); // 3 nods, decaying
      if (b.Head) b.Head.rotation.x += nods * -0.12 * w;
      if (b.Neck) b.Neck.rotation.x += nods * -0.04 * w;
      morphs.set('mouthSmile', Math.max(0, nods * 0.3 * w));
      return null;
    },
  },

  surprise: {
    duration: 1.0,
    apply(p, { bones: b, morphs, needsArmDown, restPose }, w) {
      const rg = (bone, axis) => restPose[bone]?.[axis] ?? 0;
      const shock = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
      // Lean back
      if (b.Spine1) b.Spine1.rotation.x += shock * -0.06 * w;
      if (b.Spine2) b.Spine2.rotation.x += shock * -0.04 * w;
      // Head back
      if (b.Head) b.Head.rotation.x += shock * -0.12 * w;
      // Arms spread
      if (b.LeftArm) b.LeftArm.rotation.z += shock * 0.5 * w;
      if (b.RightArm) b.RightArm.rotation.z -= shock * 0.5 * w;
      // Face: open mouth, raised brows
      morphs.set('mouthOpen', shock * 0.5 * w);
      morphs.set('jawOpen', shock * 0.3 * w);
      morphs.set('browInnerUp', shock * 0.5 * w);
      return null;
    },
  },

  cheer: {
    duration: 1.2,
    apply(p, { bones: b, morphs }, w) {
      const wave = Math.sin(p * Math.PI * 4) * (1 - p * 0.7);
      const lift = Math.sin(p * Math.PI);
      // Both arms pump
      if (b.LeftArm) b.LeftArm.rotation.z += lift * 1.4 * w + wave * 0.15 * w;
      if (b.RightArm) b.RightArm.rotation.z -= lift * 1.4 * w + wave * 0.15 * w;
      if (b.LeftForeArm) b.LeftForeArm.rotation.z += lift * 0.4 * w;
      if (b.RightForeArm) b.RightForeArm.rotation.z -= lift * 0.4 * w;
      // Body bounce
      if (b.Hips) b.Hips.rotation.z += wave * 0.02 * w;
      // Head back
      if (b.Head) b.Head.rotation.x += lift * -0.1 * w;
      morphs.set('mouthSmile', lift * 0.6 * w);
      morphs.set('browInnerUp', lift * 0.3 * w);
      return { yOffset: Math.max(0, wave * 0.02 * w) };
    },
  },

  laugh: {
    duration: 1.0,
    apply(p, { bones: b, morphs }, w) {
      const shake = Math.sin(p * Math.PI * 6) * (1 - p);
      // Body shake
      if (b.Spine1) b.Spine1.rotation.x += shake * 0.025 * w;
      if (b.Spine2) b.Spine2.rotation.z += shake * 0.01 * w;
      if (b.Head) {
        b.Head.rotation.x += shake * -0.06 * w;
        b.Head.rotation.z += shake * 0.02 * w;
      }
      // Shoulders bounce
      if (b.LeftShoulder) b.LeftShoulder.rotation.z += shake * 0.025 * w;
      if (b.RightShoulder) b.RightShoulder.rotation.z -= shake * 0.025 * w;
      // Face
      morphs.set('mouthSmile', (0.5 + shake * 0.2) * w);
      morphs.set('mouthOpen', Math.abs(shake) * 0.3 * w);
      return null;
    },
  },

  wave: {
    duration: 1.5,
    apply(p, { bones: b, morphs, needsArmDown, restPose }, w) {
      const rg = (bone, axis) => restPose[bone]?.[axis] ?? 0;
      const lift = p < 0.2 ? p / 0.2 : p > 0.8 ? (1 - p) / 0.2 : 1;
      const waveOsc = Math.sin(p * Math.PI * 5) * lift;
      // Right arm up and waving
      const raBase = needsArmDown ? rg('RightArm', 'z') - 1.1 : rg('RightArm', 'z');
      if (b.RightArm) b.RightArm.rotation.z += -lift * 2.0 * w;
      if (b.RightForeArm) {
        b.RightForeArm.rotation.z += waveOsc * 0.25 * w;
        b.RightForeArm.rotation.y += waveOsc * 0.15 * w;
      }
      // Head tilt toward wave
      if (b.Head) b.Head.rotation.z += lift * 0.06 * w;
      morphs.set('mouthSmile', lift * 0.35 * w);
      return null;
    },
  },

  bigNod: {
    duration: 1.0,
    apply(p, { bones: b, morphs }, w) {
      const env = Math.sin(p * Math.PI);
      const nod = Math.sin(p * Math.PI * 2) * env;
      if (b.Head) b.Head.rotation.x += nod * -0.2 * w;
      if (b.Neck) b.Neck.rotation.x += nod * -0.08 * w;
      if (b.Spine2) b.Spine2.rotation.x += env * 0.025 * w;
      morphs.set('mouthSmile', env * 0.3 * w);
      morphs.set('browInnerUp', env * 0.2 * w);
      return null;
    },
  },
};

// All reaction names
const REACTION_NAMES = Object.keys(REACTIONS);

export function createReactionSystem() {
  let active = null;   // { name, progress, duration }
  let yOffset = 0;

  return {
    get isPlaying() { return active !== null; },
    get currentReaction() { return active?.name ?? null; },
    get yOffset() { return yOffset; },

    /**
     * Trigger a reaction. If one is playing, the new one overrides.
     * @param {string} name — reaction name, or 'random' for weighted random
     * @param {Object} behavior — behavior config with reaction weights
     */
    trigger(name, behavior) {
      const rName = name === 'random'
        ? REACTION_NAMES[Math.floor(Math.random() * REACTION_NAMES.length)]
        : name;
      const reaction = REACTIONS[rName];
      if (!reaction) return;
      active = { name: rName, progress: 0, duration: reaction.duration };
      yOffset = 0;
    },

    /**
     * Tick every frame. Applies reaction on top of existing pose.
     */
    update(dt, rig, groupRef) {
      if (!active) { yOffset = 0; return; }
      active.progress += dt / active.duration;
      if (active.progress >= 1) { active = null; yOffset = 0; return; }
      const reaction = REACTIONS[active.name];
      const result = reaction.apply(active.progress, rig, 1);
      if (result?.yOffset && groupRef?.current) {
        yOffset = result.yOffset;
        groupRef.current.position.y += result.yOffset;
      }
    },
  };
}
