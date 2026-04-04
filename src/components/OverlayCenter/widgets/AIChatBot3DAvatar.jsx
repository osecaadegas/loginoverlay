import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import { AnimationMixer, MathUtils } from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * AIChatBot3DAvatar — Renders a GLB avatar (Avaturn, Sketchfab, etc.) with:
 *  - Idle: breathing, random eye blinks, subtle body sway
 *  - Speaking: mouth movement synced to word boundaries, subtle gestures
 *  - Thinking: head tilt, look up
 */

/* ── Morph target helpers ────────────────────────────── */
function findMorphMeshes(scene) {
  const meshes = [];
  scene.traverse((child) => {
    if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
      meshes.push(child);
    }
  });
  return meshes;
}

function setMorph(meshes, name, value) {
  for (const mesh of meshes) {
    const idx = mesh.morphTargetDictionary?.[name];
    if (idx !== undefined) {
      mesh.morphTargetInfluences[idx] = value;
    }
  }
}

function getMorphValue(meshes, name) {
  for (const mesh of meshes) {
    const idx = mesh.morphTargetDictionary?.[name];
    if (idx !== undefined) return mesh.morphTargetInfluences[idx];
  }
  return 0;
}

/* ── Idle animation bank ─────────────────────────────── */
const IDLE_ANIMS = ['standing', 'pacing', 'lookAround', 'stretch'];
const SPEAK_ANIMS = ['talking', 'excited', 'explaining'];
const IDLE_MIN_SECS = 8, IDLE_MAX_SECS = 16;

function pickRandom(arr, exclude) {
  const pool = arr.filter(a => a !== exclude);
  return pool[Math.floor(Math.random() * pool.length)] || arr[0];
}

/* ── Avatar Model ────────────────────────────────────── */
function AvatarModel({ url, state, accentColor, flipModel, modelScale, breathing, sway, headMove, armMove, gestures, animSpeed, reaction }) {
  const { scene, animations } = useGLTF(url);
  const groupRef = useRef();
  const morphMeshes = useRef([]);
  const bones = useRef({});
  const mixerRef = useRef(null);
  const blinkTimer = useRef(0);
  const nextBlink = useRef(Math.random() * 4 + 2);
  const breathPhase = useRef(0);
  const swayPhase = useRef(0);
  const mouthPhase = useRef(0);
  const lookPhase = useRef(0);
  const idlePhase = useRef(Math.random() * 100);

  // Multi-idle state
  const idleAnim = useRef('standing');
  const idleTimer = useRef(0);
  const idleDuration = useRef(IDLE_MIN_SECS + Math.random() * (IDLE_MAX_SECS - IDLE_MIN_SECS));
  const paceDir = useRef(1);
  const pacePos = useRef(0);
  const stretchProgress = useRef(0);

  // Multi-speak state
  const speakAnim = useRef('talking');
  const prevState = useRef(state);

  // Reaction (jump) state
  const jumpPhase = useRef(0);
  const jumpActive = useRef(false);
  const lastReaction = useRef(0);

  // Clone scene for isolation
  const clonedScene = useMemo(() => {
    let clone;
    try { clone = skeletonClone(scene); } catch { clone = scene.clone(true); }
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  // Find morph meshes
  useEffect(() => {
    morphMeshes.current = findMorphMeshes(clonedScene);
  }, [clonedScene]);

  // Find common bones in the skeleton
  useEffect(() => {
    const boneMap = {};
    const boneNames = [
      'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
      'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
      'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
      'LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg',
    ];
    clonedScene.traverse((child) => {
      if (child.isBone || child.type === 'Bone') {
        for (const name of boneNames) {
          if (child.name.includes(name) && !boneMap[name]) {
            boneMap[name] = child;
          }
        }
      }
    });
    bones.current = boneMap;
    console.log('[3DAvatar] Found bones:', Object.keys(boneMap).join(', ') || 'none');
    console.log('[3DAvatar] Animations:', animations?.length || 0);
  }, [clonedScene, animations]);

  // Play built-in animations if they exist
  useEffect(() => {
    if (animations && animations.length > 0 && clonedScene) {
      const mixer = new AnimationMixer(clonedScene);
      mixerRef.current = mixer;
      const clip = animations[0];
      const action = mixer.clipAction(clip);
      action.play();
      return () => { mixer.stopAllAction(); mixer.uncacheRoot(clonedScene); };
    }
  }, [animations, clonedScene]);

  // Pick new speak anim each time we enter speaking state
  useEffect(() => {
    if (state === 'speaking' && prevState.current !== 'speaking') {
      speakAnim.current = pickRandom(SPEAK_ANIMS, speakAnim.current);
    }
    prevState.current = state;
  }, [state]);

  // Trigger jump on new reaction
  useEffect(() => {
    if (reaction && reaction !== lastReaction.current) {
      lastReaction.current = reaction;
      jumpActive.current = true;
      jumpPhase.current = 0;
    }
  }, [reaction]);

  useFrame((_, delta) => {
    const meshes = morphMeshes.current;
    const b = bones.current;
    const dt = Math.min(delta, 0.1) * (animSpeed || 1);
    const br = breathing ?? 1;
    const sw = sway ?? 1;
    const hm = headMove ?? 1;
    const am = armMove ?? 1;
    const ge = gestures ?? 1;
    const noBuiltin = !animations?.length;

    // Update built-in animation mixer
    if (mixerRef.current) mixerRef.current.update(dt);

    // ── Cycle idle animations ──
    if (state === 'idle') {
      idleTimer.current += dt;
      if (idleTimer.current >= idleDuration.current) {
        idleTimer.current = 0;
        idleDuration.current = IDLE_MIN_SECS + Math.random() * (IDLE_MAX_SECS - IDLE_MIN_SECS);
        idleAnim.current = pickRandom(IDLE_ANIMS, idleAnim.current);
        stretchProgress.current = 0;
      }
    }

    // ── BREAK T-POSE: Lower arms naturally ──
    if (b.LeftArm && noBuiltin) {
      b.LeftArm.rotation.z = MathUtils.lerp(b.LeftArm.rotation.z, 1.1, dt * 2);
    }
    if (b.RightArm && noBuiltin) {
      b.RightArm.rotation.z = MathUtils.lerp(b.RightArm.rotation.z, -1.1, dt * 2);
    }
    if (b.LeftForeArm && noBuiltin) {
      b.LeftForeArm.rotation.z = MathUtils.lerp(b.LeftForeArm.rotation.z, 0.15, dt * 2);
    }
    if (b.RightForeArm && noBuiltin) {
      b.RightForeArm.rotation.z = MathUtils.lerp(b.RightForeArm.rotation.z, -0.15, dt * 2);
    }

    // ── BREATHING (always active) ──
    breathPhase.current += dt * 0.8;
    const breathVal = Math.sin(breathPhase.current);
    if (b.Spine1) b.Spine1.rotation.x = breathVal * 0.008 * br;
    if (b.Spine2) b.Spine2.rotation.x = breathVal * 0.006 * br;

    // ── REACTION: JUMP ──
    let jumpY = 0;
    if (jumpActive.current) {
      jumpPhase.current += dt * 4;
      if (jumpPhase.current < Math.PI) {
        // Anticipation dip + jump arc
        jumpY = Math.sin(jumpPhase.current) * 0.25;
        if (jumpPhase.current < 0.5) jumpY = -0.03 * (jumpPhase.current / 0.5); // squat before jump
        // Happy face
        if (meshes.length) {
          setMorph(meshes, 'mouthSmile', 0.7);
          setMorph(meshes, 'browInnerUp', 0.3);
        }
        // Arms up during peak
        if (jumpPhase.current > 1 && jumpPhase.current < 2.5) {
          if (b.LeftArm && noBuiltin) b.LeftArm.rotation.z = MathUtils.lerp(b.LeftArm.rotation.z, 2.5, dt * 8);
          if (b.RightArm && noBuiltin) b.RightArm.rotation.z = MathUtils.lerp(b.RightArm.rotation.z, -2.5, dt * 8);
        }
      } else {
        jumpActive.current = false;
        jumpPhase.current = 0;
      }
    }

    // ── Group position: breathing bounce + jump ──
    if (groupRef.current) {
      const baseY = breathVal * 0.002 * br;
      groupRef.current.position.y = baseY + jumpY;
    }

    // ── EYE BLINKS ──
    if (meshes.length) {
      blinkTimer.current += dt;
      if (blinkTimer.current >= nextBlink.current) {
        blinkTimer.current = 0;
        nextBlink.current = Math.random() * 4 + 2;
      }
      const blinkProgress = blinkTimer.current < 0.15
        ? blinkTimer.current / 0.15
        : blinkTimer.current < 0.3
          ? 1 - (blinkTimer.current - 0.15) / 0.15
          : 0;
      setMorph(meshes, 'eyeBlinkLeft', blinkProgress);
      setMorph(meshes, 'eyeBlinkRight', blinkProgress);
    }

    // ─────────────────────────────────────────────────
    //  STATE: IDLE — multiple variations
    // ─────────────────────────────────────────────────
    if (state === 'idle') {
      // Clean up mouth from previous speaking
      if (meshes.length) {
        const currentMouth = getMorphValue(meshes, 'mouthOpen');
        setMorph(meshes, 'mouthOpen', currentMouth * 0.85);
        setMorph(meshes, 'jawOpen', currentMouth * 0.5);
        if (!jumpActive.current) {
          setMorph(meshes, 'mouthSmile', Math.sin(breathPhase.current * 0.2) * 0.05);
          setMorph(meshes, 'browInnerUp', 0);
        }
      }
      mouthPhase.current = 0;
      idlePhase.current += dt;
      lookPhase.current += dt * 0.15;
      swayPhase.current += dt * 0.3;

      const curIdle = idleAnim.current;

      // ── IDLE: Standing (weight shift + subtle sway) ──
      if (curIdle === 'standing') {
        if (b.Hips && noBuiltin) {
          b.Hips.rotation.z = MathUtils.lerp(b.Hips.rotation.z, Math.sin(swayPhase.current) * 0.015 * sw, dt * 3);
          b.Hips.rotation.y = MathUtils.lerp(b.Hips.rotation.y, Math.sin(swayPhase.current * 0.7) * 0.01 * sw, dt * 3);
          b.Hips.position.x = MathUtils.lerp(b.Hips.position.x, Math.sin(swayPhase.current) * 0.003 * sw, dt * 3);
        }
        if (b.Spine) b.Spine.rotation.z = Math.sin(swayPhase.current * 0.5 + 0.5) * -0.008 * sw;
        // Subtle arm movement
        if (noBuiltin) {
          const armSway = Math.sin(idlePhase.current * 0.4) * 0.03 * am;
          if (b.LeftArm) b.LeftArm.rotation.x = MathUtils.lerp(b.LeftArm.rotation.x, armSway, dt * 3);
          if (b.RightArm) b.RightArm.rotation.x = MathUtils.lerp(b.RightArm.rotation.x, -armSway * 0.7, dt * 3);
          if (b.LeftForeArm) b.LeftForeArm.rotation.y = Math.sin(idlePhase.current * 0.3) * 0.04 * am;
          if (b.RightForeArm) b.RightForeArm.rotation.y = Math.sin(idlePhase.current * 0.35 + 1) * -0.04 * am;
        }
      }

      // ── IDLE: Pacing (walk back and forth) ──
      else if (curIdle === 'pacing') {
        const paceSpeed = 0.3 * sw;
        const paceRange = 0.4 * sw;
        pacePos.current += dt * paceSpeed * paceDir.current;
        if (Math.abs(pacePos.current) > paceRange) {
          paceDir.current *= -1;
          pacePos.current = Math.sign(pacePos.current) * paceRange;
        }
        // Move the group horizontally
        if (groupRef.current) {
          groupRef.current.position.x = MathUtils.lerp(groupRef.current.position.x, pacePos.current, dt * 3);
        }
        // Walk leg animation
        const walkCycle = idlePhase.current * 3 * sw;
        if (b.LeftUpLeg && noBuiltin) b.LeftUpLeg.rotation.x = Math.sin(walkCycle) * 0.25 * am;
        if (b.RightUpLeg && noBuiltin) b.RightUpLeg.rotation.x = Math.sin(walkCycle + Math.PI) * 0.25 * am;
        if (b.LeftLeg && noBuiltin) b.LeftLeg.rotation.x = Math.max(0, Math.sin(walkCycle + 0.5)) * 0.3 * am;
        if (b.RightLeg && noBuiltin) b.RightLeg.rotation.x = Math.max(0, Math.sin(walkCycle + Math.PI + 0.5)) * 0.3 * am;
        // Arm swing (opposite to legs)
        if (noBuiltin) {
          if (b.LeftArm) b.LeftArm.rotation.x = MathUtils.lerp(b.LeftArm.rotation.x, Math.sin(walkCycle + Math.PI) * 0.15 * am, dt * 4);
          if (b.RightArm) b.RightArm.rotation.x = MathUtils.lerp(b.RightArm.rotation.x, Math.sin(walkCycle) * 0.15 * am, dt * 4);
        }
        // Subtle body bounce
        const walkBounce = Math.abs(Math.sin(walkCycle * 2)) * 0.008;
        if (groupRef.current) groupRef.current.position.y += walkBounce;
        // Hip rotation toward walk direction
        if (b.Hips && noBuiltin) {
          b.Hips.rotation.y = MathUtils.lerp(b.Hips.rotation.y, paceDir.current * 0.2, dt * 2);
          b.Hips.rotation.z = Math.sin(walkCycle) * 0.02 * sw;
        }
        if (b.Spine) b.Spine.rotation.y = MathUtils.lerp(b.Spine.rotation.y, -paceDir.current * 0.05, dt * 3);
      }

      // ── IDLE: Look Around (curious head scanning) ──
      else if (curIdle === 'lookAround') {
        if (b.Hips && noBuiltin) {
          b.Hips.rotation.z = MathUtils.lerp(b.Hips.rotation.z, 0, dt * 2);
          b.Hips.position.x = MathUtils.lerp(b.Hips.position.x, 0, dt * 2);
        }
        // Exaggerated head movement
        const bigLookY = (Math.sin(lookPhase.current * 0.6) * 0.15 + Math.sin(lookPhase.current * 0.25) * 0.1) * hm;
        const bigLookX = (Math.sin(lookPhase.current * 0.8 + 1) * 0.1 + Math.cos(lookPhase.current * 0.3) * 0.05) * hm;
        if (b.Head) {
          b.Head.rotation.y = MathUtils.lerp(b.Head.rotation.y, bigLookY, dt * 2);
          b.Head.rotation.x = MathUtils.lerp(b.Head.rotation.x, bigLookX, dt * 2);
        }
        if (b.Neck) b.Neck.rotation.y = MathUtils.lerp(b.Neck.rotation.y, bigLookY * 0.4, dt * 2);
        // Upper body follows head slightly
        if (b.Spine2) b.Spine2.rotation.y = bigLookY * 0.15;
        // Subtle arm idle
        if (noBuiltin) {
          if (b.LeftArm) b.LeftArm.rotation.x = MathUtils.lerp(b.LeftArm.rotation.x, 0, dt * 2);
          if (b.RightArm) b.RightArm.rotation.x = MathUtils.lerp(b.RightArm.rotation.x, 0, dt * 2);
        }
      }

      // ── IDLE: Stretch (arms up, lean back, relax) ──
      else if (curIdle === 'stretch') {
        stretchProgress.current = Math.min(stretchProgress.current + dt * 0.4, 1);
        const sp = stretchProgress.current;
        // Phase 1 (0-0.4): arms go up; Phase 2 (0.4-0.7): hold + lean; Phase 3 (0.7-1): arms down
        const liftPhase = sp < 0.4 ? sp / 0.4 : sp < 0.7 ? 1 : 1 - (sp - 0.7) / 0.3;
        const leanPhase = sp > 0.2 && sp < 0.7 ? Math.sin((sp - 0.2) / 0.5 * Math.PI) : 0;
        if (noBuiltin) {
          if (b.LeftArm) b.LeftArm.rotation.z = MathUtils.lerp(b.LeftArm.rotation.z, 1.1 + liftPhase * 1.5 * am, dt * 4);
          if (b.RightArm) b.RightArm.rotation.z = MathUtils.lerp(b.RightArm.rotation.z, -1.1 - liftPhase * 1.5 * am, dt * 4);
          if (b.LeftForeArm) b.LeftForeArm.rotation.z = MathUtils.lerp(b.LeftForeArm.rotation.z, 0.15 + liftPhase * 0.3, dt * 4);
          if (b.RightForeArm) b.RightForeArm.rotation.z = MathUtils.lerp(b.RightForeArm.rotation.z, -0.15 - liftPhase * 0.3, dt * 4);
        }
        // Lean back during hold
        if (b.Spine1) b.Spine1.rotation.x += leanPhase * -0.08 * ge;
        if (b.Spine2) b.Spine2.rotation.x += leanPhase * -0.06 * ge;
        if (b.Head) {
          b.Head.rotation.x = MathUtils.lerp(b.Head.rotation.x, leanPhase * -0.1, dt * 3);
        }
        // Happy face during stretch
        if (meshes.length && sp > 0.3 && sp < 0.8) {
          setMorph(meshes, 'mouthSmile', 0.2);
        }
        // Return hips to center
        if (b.Hips && noBuiltin) {
          b.Hips.rotation.z = MathUtils.lerp(b.Hips.rotation.z, 0, dt * 2);
          b.Hips.position.x = MathUtils.lerp(b.Hips.position.x, 0, dt * 2);
        }
      }

      // Default head look for standing-type idles (not pacing/lookAround which have their own)
      if (curIdle === 'standing' || curIdle === 'stretch') {
        if (b.Head) {
          const lookX = (Math.sin(lookPhase.current * 1.3) * 0.04 + Math.sin(lookPhase.current * 0.4) * 0.03) * hm;
          const lookY = (Math.sin(lookPhase.current) * 0.06 + Math.sin(lookPhase.current * 0.6 + 1) * 0.04) * hm;
          b.Head.rotation.y = MathUtils.lerp(b.Head.rotation.y, lookY, dt * 1.5);
          b.Head.rotation.x = MathUtils.lerp(b.Head.rotation.x, lookX + (b.Head.rotation.x || 0) * 0.1, dt * 1.5);
        }
        if (b.Neck) {
          const neckY = Math.sin(lookPhase.current * 0.8 + 0.3) * 0.025 * hm;
          b.Neck.rotation.y = MathUtils.lerp(b.Neck.rotation.y, neckY, dt * 2);
        }
      }

      // Return pace position to center when not pacing
      if (curIdle !== 'pacing' && groupRef.current) {
        groupRef.current.position.x = MathUtils.lerp(groupRef.current.position.x, 0, dt * 2);
        pacePos.current = MathUtils.lerp(pacePos.current, 0, dt * 2);
      }
      // Reset legs when not pacing
      if (curIdle !== 'pacing' && noBuiltin) {
        if (b.LeftUpLeg) b.LeftUpLeg.rotation.x = MathUtils.lerp(b.LeftUpLeg.rotation.x, 0, dt * 4);
        if (b.RightUpLeg) b.RightUpLeg.rotation.x = MathUtils.lerp(b.RightUpLeg.rotation.x, 0, dt * 4);
        if (b.LeftLeg) b.LeftLeg.rotation.x = MathUtils.lerp(b.LeftLeg.rotation.x, 0, dt * 4);
        if (b.RightLeg) b.RightLeg.rotation.x = MathUtils.lerp(b.RightLeg.rotation.x, 0, dt * 4);
      }
    }

    // ─────────────────────────────────────────────────
    //  STATE: SPEAKING — multiple variations
    // ─────────────────────────────────────────────────
    else if (state === 'speaking') {
      mouthPhase.current += dt * 12;
      const mouthBase = 0.3;
      const mouthVar = Math.sin(mouthPhase.current) * 0.25 + Math.sin(mouthPhase.current * 2.3) * 0.15;
      swayPhase.current += dt * 0.3;

      // Common mouth movement for all speak variants
      if (meshes.length) {
        setMorph(meshes, 'mouthOpen', Math.max(0, mouthBase + mouthVar));
        setMorph(meshes, 'jawOpen', Math.max(0, (mouthBase + mouthVar) * 0.6));
      }

      // Return pace position / legs to center
      if (groupRef.current) groupRef.current.position.x = MathUtils.lerp(groupRef.current.position.x, 0, dt * 3);
      if (noBuiltin) {
        if (b.LeftUpLeg) b.LeftUpLeg.rotation.x = MathUtils.lerp(b.LeftUpLeg.rotation.x, 0, dt * 4);
        if (b.RightUpLeg) b.RightUpLeg.rotation.x = MathUtils.lerp(b.RightUpLeg.rotation.x, 0, dt * 4);
        if (b.LeftLeg) b.LeftLeg.rotation.x = MathUtils.lerp(b.LeftLeg.rotation.x, 0, dt * 4);
        if (b.RightLeg) b.RightLeg.rotation.x = MathUtils.lerp(b.RightLeg.rotation.x, 0, dt * 4);
      }

      const curSpeak = speakAnim.current;

      // ── SPEAK: Talking (calm nod + subtle gestures) ──
      if (curSpeak === 'talking') {
        if (meshes.length) {
          setMorph(meshes, 'mouthSmile', 0.15 + Math.sin(mouthPhase.current * 0.5) * 0.08);
          setMorph(meshes, 'browInnerUp', 0.1 + Math.sin(mouthPhase.current * 0.3) * 0.08);
        }
        if (b.Head) {
          b.Head.rotation.x = Math.sin(mouthPhase.current * 0.8) * 0.04 * ge;
          b.Head.rotation.y = Math.sin(mouthPhase.current * 0.3) * 0.05 * ge;
        }
        if (b.LeftShoulder) b.LeftShoulder.rotation.z = Math.sin(mouthPhase.current * 0.5) * 0.02 * ge;
        if (b.RightShoulder) b.RightShoulder.rotation.z = Math.sin(mouthPhase.current * 0.4 + 1) * -0.02 * ge;
        if (b.Spine2) b.Spine2.rotation.y = Math.sin(mouthPhase.current * 0.25) * 0.015 * ge;
        if (b.Hips && noBuiltin) {
          b.Hips.rotation.z = MathUtils.lerp(b.Hips.rotation.z, 0, dt * 3);
        }
      }

      // ── SPEAK: Excited (big nods, bouncy, expressive) ──
      else if (curSpeak === 'excited') {
        if (meshes.length) {
          setMorph(meshes, 'mouthSmile', 0.4 + Math.sin(mouthPhase.current * 0.7) * 0.15);
          setMorph(meshes, 'browInnerUp', 0.25 + Math.sin(mouthPhase.current * 0.5) * 0.15);
        }
        if (b.Head) {
          b.Head.rotation.x = Math.sin(mouthPhase.current * 1.2) * 0.07 * ge;
          b.Head.rotation.y = Math.sin(mouthPhase.current * 0.5) * 0.08 * ge;
          b.Head.rotation.z = Math.sin(mouthPhase.current * 0.4) * 0.04 * ge;
        }
        // Body bounce while excited
        if (groupRef.current) {
          groupRef.current.position.y += Math.abs(Math.sin(mouthPhase.current * 1.5)) * 0.008 * ge;
        }
        // Arms more animated
        if (noBuiltin) {
          if (b.LeftArm) b.LeftArm.rotation.x = MathUtils.lerp(b.LeftArm.rotation.x, Math.sin(mouthPhase.current * 0.8) * 0.12 * ge, dt * 4);
          if (b.RightArm) b.RightArm.rotation.x = MathUtils.lerp(b.RightArm.rotation.x, Math.sin(mouthPhase.current * 0.6 + 1) * -0.12 * ge, dt * 4);
          if (b.LeftArm) b.LeftArm.rotation.z = MathUtils.lerp(b.LeftArm.rotation.z, 1.1 + Math.sin(mouthPhase.current * 0.5) * 0.3 * ge, dt * 3);
          if (b.RightArm) b.RightArm.rotation.z = MathUtils.lerp(b.RightArm.rotation.z, -1.1 - Math.sin(mouthPhase.current * 0.4 + 0.5) * 0.3 * ge, dt * 3);
        }
        // Energetic sway
        if (b.Hips && noBuiltin) {
          b.Hips.rotation.z = Math.sin(swayPhase.current * 1.5) * 0.025 * sw;
          b.Hips.rotation.y = Math.sin(swayPhase.current) * 0.02 * sw;
        }
        if (b.Spine) b.Spine.rotation.y = Math.sin(mouthPhase.current * 0.3) * 0.02 * ge;
      }

      // ── SPEAK: Explaining (hand gestures, deliberate movements) ──
      else if (curSpeak === 'explaining') {
        if (meshes.length) {
          setMorph(meshes, 'mouthSmile', 0.1 + Math.sin(mouthPhase.current * 0.4) * 0.06);
          setMorph(meshes, 'browInnerUp', 0.15 + Math.sin(mouthPhase.current * 0.6) * 0.12);
        }
        if (b.Head) {
          b.Head.rotation.x = Math.sin(mouthPhase.current * 0.6) * 0.03 * ge;
          b.Head.rotation.y = Math.sin(mouthPhase.current * 0.2) * 0.06 * ge;
          b.Head.rotation.z = Math.sin(mouthPhase.current * 0.15) * 0.02 * ge;
        }
        // One hand gesturing outward (explaining hand)
        if (noBuiltin) {
          const gestureWave = Math.sin(mouthPhase.current * 0.4);
          if (b.RightArm) {
            b.RightArm.rotation.x = MathUtils.lerp(b.RightArm.rotation.x, -0.4 * ge + gestureWave * 0.15 * ge, dt * 3);
            b.RightArm.rotation.z = MathUtils.lerp(b.RightArm.rotation.z, -0.8 * ge, dt * 3);
          }
          if (b.RightForeArm) {
            b.RightForeArm.rotation.x = MathUtils.lerp(b.RightForeArm.rotation.x, -0.5 * ge + gestureWave * 0.2 * ge, dt * 3);
            b.RightForeArm.rotation.y = MathUtils.lerp(b.RightForeArm.rotation.y, gestureWave * 0.3 * ge, dt * 3);
          }
          // Left arm relaxed
          if (b.LeftArm) b.LeftArm.rotation.x = MathUtils.lerp(b.LeftArm.rotation.x, 0, dt * 3);
        }
        // Lean forward slightly (like explaining to someone)
        if (b.Spine) b.Spine.rotation.x = MathUtils.lerp(b.Spine.rotation.x || 0, 0.04 * ge, dt * 2);
        if (b.Hips && noBuiltin) {
          b.Hips.rotation.z = MathUtils.lerp(b.Hips.rotation.z, Math.sin(swayPhase.current * 0.5) * 0.01, dt * 2);
        }
      }
    }

    // ─────────────────────────────────────────────────
    //  STATE: THINKING
    // ─────────────────────────────────────────────────
    else if (state === 'thinking') {
      breathPhase.current += 0; // already incremented above
      if (meshes.length) {
        setMorph(meshes, 'mouthOpen', 0);
        setMorph(meshes, 'jawOpen', 0);
        setMorph(meshes, 'browInnerUp', 0.35 + Math.sin(breathPhase.current * 2) * 0.1);
        setMorph(meshes, 'mouthSmile', 0.05);
      }
      if (b.Head) {
        b.Head.rotation.x = MathUtils.lerp(b.Head.rotation.x, -0.12 * ge, dt * 3);
        b.Head.rotation.z = MathUtils.lerp(b.Head.rotation.z, 0.08 * ge, dt * 3);
        b.Head.rotation.y = Math.sin(breathPhase.current * 0.5) * 0.04 * ge;
      }
      if (b.RightForeArm && noBuiltin) {
        b.RightForeArm.rotation.x = MathUtils.lerp(b.RightForeArm.rotation.x, -0.8 * ge, dt * 2);
        b.RightForeArm.rotation.z = MathUtils.lerp(b.RightForeArm.rotation.z, -0.3 * ge, dt * 2);
      }
      // Return to center
      if (groupRef.current) groupRef.current.position.x = MathUtils.lerp(groupRef.current.position.x, 0, dt * 3);
      if (b.Hips && noBuiltin) {
        b.Hips.rotation.z = MathUtils.lerp(b.Hips.rotation.z, 0, dt * 2);
      }
      if (noBuiltin) {
        if (b.LeftUpLeg) b.LeftUpLeg.rotation.x = MathUtils.lerp(b.LeftUpLeg.rotation.x, 0, dt * 4);
        if (b.RightUpLeg) b.RightUpLeg.rotation.x = MathUtils.lerp(b.RightUpLeg.rotation.x, 0, dt * 4);
        if (b.LeftLeg) b.LeftLeg.rotation.x = MathUtils.lerp(b.LeftLeg.rotation.x, 0, dt * 4);
        if (b.RightLeg) b.RightLeg.rotation.x = MathUtils.lerp(b.RightLeg.rotation.x, 0, dt * 4);
      }
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} scale={modelScale || 1} rotation={[0, flipModel ? Math.PI : 0, 0]} />
    </group>
  );
}

/* ── Camera setup ────────────────────────────────────── */
function CameraRig({ cameraDistance, cameraHeight }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, cameraHeight, cameraDistance);
    camera.lookAt(0, cameraHeight, 0);
  }, [camera, cameraDistance, cameraHeight]);
  return null;
}

/* ── Particle effect (cyberpunk feel) ────────────────── */
function FloatingParticles({ count = 30, color = '#9146FF' }) {
  const meshRef = useRef();
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 3;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return pos;
  }, [count]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const posArr = meshRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      posArr[i * 3 + 1] += delta * 0.1;
      if (posArr[i * 3 + 1] > 1.5) posArr[i * 3 + 1] = -1.5;
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.015} color={color} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

/* ── Main exported component ─────────────────────────── */
export default function AIChatBot3DAvatar({
  avatarUrl,
  state = 'idle',
  accentColor = '#9146FF',
  width = 380,
  height = 400,
  bgColor = 'transparent',
  showParticles = true,
  flipModel = false,
  cameraDistance = 2.2,
  cameraHeight = 0.85,
  modelScale = 1,
  breathing = 1,
  sway = 1,
  headMove = 1,
  armMove = 1,
  gestures = 1,
  animSpeed = 1,
  reaction = 0,
}) {
  const [error, setError] = useState(null);

  if (!avatarUrl) {
    return (
      <div style={{
        width, height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 20,
      }}>
        Set a 3D Avatar URL in config<br />
        <span style={{ fontSize: 10 }}>Create one free at avaturn.me or download from Sketchfab</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        width, height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#ef4444', fontSize: 11, textAlign: 'center', padding: 20,
      }}>
        Failed to load avatar model.<br />
        <span style={{ fontSize: 10, color: '#94a3b8' }}>Check the URL ends in .glb</span>
      </div>
    );
  }

  return (
    <div style={{ width, height, background: 'transparent', border: 'none', overflow: 'hidden', position: 'relative', pointerEvents: 'auto' }}>
      {/* State indicator */}
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        padding: '3px 12px', borderRadius: 99, fontSize: 10, fontWeight: 600, zIndex: 10,
        background: state === 'speaking' ? `${accentColor}33` : state === 'thinking' ? 'rgba(251,191,36,0.2)' : 'transparent',
        color: state === 'speaking' ? accentColor : state === 'thinking' ? '#fbbf24' : 'transparent',
        transition: 'all 0.3s',
      }}>
        {state === 'speaking' ? '🗣️ Speaking' : state === 'thinking' ? '💭 Thinking' : ''}
      </div>

      <Canvas
        shadows
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
        onError={() => setError(true)}
      >
        <CameraRig cameraDistance={cameraDistance} cameraHeight={cameraHeight} />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={1.2} castShadow />
        <directionalLight position={[-1, 2, -1]} intensity={0.4} color="#8b5cf6" />
        <pointLight position={[0, 1, 2]} intensity={0.3} color={accentColor} />

        {/* Avatar */}
        <React.Suspense fallback={null}>
          <AvatarModel url={avatarUrl} state={state} accentColor={accentColor} flipModel={flipModel}
            modelScale={modelScale} breathing={breathing} sway={sway} headMove={headMove}
            armMove={armMove} gestures={gestures} animSpeed={animSpeed} reaction={reaction} />
        </React.Suspense>

        {/* Particles */}
        {showParticles && <FloatingParticles color={accentColor} count={40} />}



        {/* Environment */}
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
