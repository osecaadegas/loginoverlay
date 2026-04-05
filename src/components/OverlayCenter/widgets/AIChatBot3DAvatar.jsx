import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, Html } from '@react-three/drei';
import { AnimationMixer, MathUtils } from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * AIChatBot3DAvatar — Renders a GLB avatar (Avaturn, Sketchfab, Mixamo, VRM, CC3, etc.)
 * Universal bone & morph target mapper for cross-format compatibility.
 */

/* ── Universal bone alias map ────────────────────────── */
// Each canonical bone maps to regex patterns matching known formats:
// Mixamo (mixamorig:Hips), Avaturn/RPM (Hips), Blender (hips, upper_arm.L),
// VRM/VRoid (J_Bip_C_Hips), CC3/iClone (CC_Base_Hip), DAZ (hip, lShldr),
// Unreal (pelvis, spine_01), Generic (pelvis, upperarm_l)
const BONE_ALIASES = {
  Hips:          [/\bhips?\b/i, /\bpelvis\b/i, /\bpelvic\b/i, /CC_Base_Hip/i, /J_Bip_C_Hips/i],
  Spine:         [/\bspine\b(?![\d_]*[1-9])/i, /CC_Base_Spine01/i, /J_Bip_C_Spine\b/i, /\babdomen\b/i, /\btorso\b(?!\d)/i, /\bspine lower\b/i, /\bwaist\b/i],
  Spine1:        [/\bspine[_. ]?0?1(?:\b|[_ ])/i, /\bchest\b/i, /CC_Base_Spine02/i, /J_Bip_C_Chest\b/i, /\btorso2\b/i, /\bspine upper\b/i],
  Spine2:        [/\bspine[_. ]?0?2(?:\b|[_ ])/i, /\bupper[_. ]?chest\b/i, /J_Bip_C_UpperChest/i, /J_Bip_C_UpperBody/i],
  Neck:          [/\bneck\b/i, /CC_Base_Neck/i, /J_Bip_C_Neck/i],
  Head:          [/\bhead\b/i, /CC_Base_Head/i, /J_Bip_C_Head/i],
  LeftShoulder:  [/(?<![a-zA-Z])l(?:eft)?[_. ]?shoulder\b/i, /\bshoulder[_. ]?l\b/i, /CC_Base_L_Clavicle/i, /J_Bip_L_Shoulder/i, /(?<![a-zA-Z])l(?:eft)?[_. ]?clav/i, /\bclavicle[_. ]?l\b/i, /\bscapula[_. ]?l\b/i, /\blCollar\b/i],
  LeftArm:       [/(?<![a-zA-Z])l(?:eft)?[_. ]?(?:upper[_. ]?)?arm\b/i, /\bupper[_. ]?arm[_. ]?l\b/i, /\barm[_. ]?l\b/i, /\bup[_. ]?arm[_. ]?l\b/i, /CC_Base_L_Upperarm/i, /J_Bip_L_UpperArm/i, /(?<![a-zA-Z])l(?:eft)?[_. ]?shldr\b/i, /\blShldr\b/i],
  LeftForeArm:   [/(?<![a-zA-Z])l(?:eft)?[_. ]?fore[_. ]?arm/i, /\bfore[_. ]?arm[_. ]?l\b/i, /(?<![a-zA-Z])l(?:eft)?[_. ]?lower[_. ]?arm/i, /\blower[_. ]?arm[_. ]?l\b/i, /\blow[_. ]?arm[_. ]?l\b/i, /CC_Base_L_Forearm/i, /J_Bip_L_LowerArm/i, /\blForeArm\b/i, /(?<![a-zA-Z])l(?:eft)?[_. ]?elbow/i, /\belbow[_. ]?l\b/i],
  LeftHand:      [/(?<![a-zA-Z])l(?:eft)?[_. ]?hand\b/i, /\bhand[_. ]?l\b/i, /CC_Base_L_Hand/i, /J_Bip_L_Hand/i, /\blHand\b/i, /(?<![a-zA-Z])l(?:eft)?[_. ]?wrist/i, /\bwrist[_. ]?l\b/i],
  RightShoulder: [/(?<![a-zA-Z])r(?:ight)?[_. ]?shoulder\b/i, /\bshoulder[_. ]?r\b/i, /CC_Base_R_Clavicle/i, /J_Bip_R_Shoulder/i, /(?<![a-zA-Z])r(?:ight)?[_. ]?clav/i, /\bclavicle[_. ]?r\b/i, /\bscapula[_. ]?r\b/i, /\brCollar\b/i],
  RightArm:      [/(?<![a-zA-Z])r(?:ight)?[_. ]?(?:upper[_. ]?)?arm\b/i, /\bupper[_. ]?arm[_. ]?r\b/i, /\barm[_. ]?r\b/i, /\bup[_. ]?arm[_. ]?r\b/i, /CC_Base_R_Upperarm/i, /J_Bip_R_UpperArm/i, /(?<![a-zA-Z])r(?:ight)?[_. ]?shldr\b/i, /\brShldr\b/i],
  RightForeArm:  [/(?<![a-zA-Z])r(?:ight)?[_. ]?fore[_. ]?arm/i, /\bfore[_. ]?arm[_. ]?r\b/i, /(?<![a-zA-Z])r(?:ight)?[_. ]?lower[_. ]?arm/i, /\blower[_. ]?arm[_. ]?r\b/i, /\blow[_. ]?arm[_. ]?r\b/i, /CC_Base_R_Forearm/i, /J_Bip_R_LowerArm/i, /\brForeArm\b/i, /(?<![a-zA-Z])r(?:ight)?[_. ]?elbow/i, /\belbow[_. ]?r\b/i],
  RightHand:     [/(?<![a-zA-Z])r(?:ight)?[_. ]?hand\b/i, /\bhand[_. ]?r\b/i, /CC_Base_R_Hand/i, /J_Bip_R_Hand/i, /\brHand\b/i, /(?<![a-zA-Z])r(?:ight)?[_. ]?wrist/i, /\bwrist[_. ]?r\b/i],
  LeftUpLeg:     [/(?<![a-zA-Z])l(?:eft)?[_. ]?(?:up[_. ]?)?leg\b/i, /\b(?:thigh|upper[_. ]?leg)[_. ]?l\b/i, /\bleg[_. ]?l\b/i, /(?<![a-zA-Z])l(?:eft)?[_. ]?thigh\b/i, /CC_Base_L_Thigh/i, /J_Bip_L_UpperLeg/i, /\blThigh\b/i, /(?<![a-zA-Z])l(?:eft)?[_. ]?hip\b/i, /\bhip\d?[_. ]?l\b/i],
  LeftLeg:       [/(?<![a-zA-Z])l(?:eft)?[_. ]?knee\b/i, /\b(?:shin|lower[_. ]?leg|calf|knee)[_. ]?l\b/i, /(?<![a-zA-Z])l(?:eft)?[_. ]?(?:lower[_. ]?)?shin\b/i, /(?<![a-zA-Z])l(?:eft)?[_. ]?calf\b/i, /CC_Base_L_Calf/i, /J_Bip_L_LowerLeg/i, /\blShin\b/i],
  RightUpLeg:    [/(?<![a-zA-Z])r(?:ight)?[_. ]?(?:up[_. ]?)?leg\b/i, /\b(?:thigh|upper[_. ]?leg)[_. ]?r\b/i, /\bleg[_. ]?r\b/i, /(?<![a-zA-Z])r(?:ight)?[_. ]?thigh\b/i, /CC_Base_R_Thigh/i, /J_Bip_R_UpperLeg/i, /\brThigh\b/i, /(?<![a-zA-Z])r(?:ight)?[_. ]?hip\b/i, /\bhip\d?[_. ]?r\b/i],
  RightLeg:      [/(?<![a-zA-Z])r(?:ight)?[_. ]?knee\b/i, /\b(?:shin|lower[_. ]?leg|calf|knee)[_. ]?r\b/i, /(?<![a-zA-Z])r(?:ight)?[_. ]?(?:lower[_. ]?)?shin\b/i, /(?<![a-zA-Z])r(?:ight)?[_. ]?calf\b/i, /CC_Base_R_Calf/i, /J_Bip_R_LowerLeg/i, /\brShin\b/i],
};

// Priority order: more specific bones first (ForeArm before Arm, UpLeg before Leg, Spine1/2 before Spine)
const BONE_MATCH_ORDER = [
  'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand',
  'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm',
  'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg',
  'Spine2', 'Spine1', 'Spine', 'Neck', 'Head', 'Hips',
];

/* ── Per-model manual bone maps for non-standard naming conventions ── */
const MODEL_PROFILES = {
  '824022961986602005.glb': {
    bones: { Hips:'Pelvis_M', Spine:'Spine1_M', Spine1:'Spine2_M', Spine2:'Chest_M',
      Neck:'Neck1_M', Head:'Head_M',
      LeftShoulder:'Scapula_L', LeftArm:'Shoulder_L', LeftForeArm:'Elbow_L', LeftHand:'Wrist_L',
      RightShoulder:'Scapula_R', RightArm:'Shoulder_R', RightForeArm:'Elbow_R', RightHand:'Wrist_R',
      LeftUpLeg:'Hip1_L', LeftLeg:'Knee1_L', RightUpLeg:'Hip1_R', RightLeg:'Knee1_R' },
  },
  '3493590446520631963.glb': {
    bones: { Hips:'pelvis adj', Spine:'spine lower', Spine1:'spine upper',
      Neck:'head neck lower', Head:'head neck upper',
      LeftShoulder:'arm left shoulder 1', LeftArm:'g_l_uprarm', LeftForeArm:'g_l_forarm', LeftHand:'arm left wrist',
      RightShoulder:'arm right shoulder 1', RightArm:'g_r_uprarm', RightForeArm:'g_r_forarm', RightHand:'arm right wrist',
      LeftUpLeg:'leg left thigh', LeftLeg:'leg left knee', RightUpLeg:'leg right thigh', RightLeg:'leg right knee' },
  },
};

/**
 * Strip rig-specific prefixes and suffixes from bone names for universal matching.
 */
function stripBoneName(name) {
  let s = name;
  s = s.replace(/^\d+\.!?/, '');                 // numbered prefix: "22.joint_Base X" → "joint_Base X"
  s = s.replace(/^[A-Za-z0-9_]+[:|]/, '');        // Mixamo "mixamorig:" / Blender "Armature|"
  s = s.replace(/^[A-Za-z0-9_]+\./, '');          // dot prefix: "ValveBiped.Bip01_X" → "Bip01_X"
  s = s.replace(/^(Armature_|armature_|Bip0?1[_ ]|Character[_ ]|Root[_ ]|J_Bip_[CLR]_|CC_Base_[LR]?_?|joint_(?:Base )?|G_)/i, '');
  s = s.replace(/JNT$/i, '');                     // JNT suffix: "HeadJNT" → "Head"
  s = s.replace(/[_ ]\d+$/, '');                  // numeric suffix: "ArmL_1" → "ArmL"
  return s.trim();
}

/**
 * Scan a scene and map real bone names to our canonical names.
 * Uses priority ordering so e.g. "LeftForeArm" is matched before "LeftArm".
 * Supports manual per-model bone maps for non-standard rigs.
 */
function mapBones(scene, url) {
  // Check for manual bone map based on filename
  const filename = url ? url.split('/').pop() : '';
  const profile = MODEL_PROFILES[filename];

  const allBones = [];
  scene.traverse((child) => {
    if (child.isBone || child.type === 'Bone') allBones.push(child);
  });
  // Fallback: check non-bone objects that might be skeleton joints
  if (allBones.length === 0) {
    scene.traverse((child) => {
      if (child.isObject3D && child.children.length > 0 && !child.isMesh && !child.isLight && !child.isCamera) {
        if (/hip|spine|head|neck|arm|leg|shoulder|hand|thigh|pelvis|chest|elbow|knee|wrist/i.test(child.name)) {
          allBones.push(child);
        }
      }
    });
  }

  // If manual bone map exists, use it directly
  if (profile?.bones) {
    const result = {};
    for (const [canonical, rawName] of Object.entries(profile.bones)) {
      for (const bone of allBones) {
        if (bone.name === rawName) { result[canonical] = bone; break; }
      }
    }
    return result;
  }

  const result = {};
  const used = new Set();

  for (const canonical of BONE_MATCH_ORDER) {
    const patterns = BONE_ALIASES[canonical];
    if (!patterns) continue;

    // First pass: exact canonical match on stripped name
    for (const bone of allBones) {
      if (used.has(bone)) continue;
      const stripped = stripBoneName(bone.name);
      if (stripped.toLowerCase() === canonical.toLowerCase()) {
        result[canonical] = bone;
        used.add(bone);
        break;
      }
    }
    if (result[canonical]) continue;

    // Second pass: regex aliases against both raw and stripped names
    for (const bone of allBones) {
      if (used.has(bone)) continue;
      const raw = bone.name;
      const stripped = stripBoneName(raw);
      for (const rx of patterns) {
        if (rx.test(raw) || rx.test(stripped)) {
          result[canonical] = bone;
          used.add(bone);
          break;
        }
      }
      if (result[canonical]) break;
    }
  }

  return result;
}

/* ── Universal morph target aliases ────────────────── */
// Maps our canonical morph name to arrays of alternative names across formats:
// ARKit, Mixamo, VRM, CC3, generic
const MORPH_ALIASES = {
  mouthOpen:      ['mouthOpen', 'jawOpen', 'Mouth_Open', 'Fcl_MTH_A', 'viseme_aa', 'A', 'mouth_open', 'MouthOpen'],
  jawOpen:        ['jawOpen', 'Jaw_Open', 'jaw_open', 'JawOpen', 'Fcl_MTH_A'],
  mouthSmile:     ['mouthSmile', 'mouthSmileLeft', 'mouthSmileRight', 'Mouth_Smile', 'Fcl_MTH_Joy', 'smile', 'mouth_smile', 'MouthSmile', 'happy'],
  browInnerUp:    ['browInnerUp', 'Brow_Inner_Up', 'Fcl_BRW_Surprised', 'brow_inner_up', 'BrowInnerUp', 'browUp'],
  eyeBlinkLeft:   ['eyeBlinkLeft', 'Eye_Blink_Left', 'Fcl_EYE_Close_L', 'eyeBlink_L', 'eye_blink_left', 'EyeBlinkLeft', 'blink_L', 'Blink_Left'],
  eyeBlinkRight:  ['eyeBlinkRight', 'Eye_Blink_Right', 'Fcl_EYE_Close_R', 'eyeBlink_R', 'eye_blink_right', 'EyeBlinkRight', 'blink_R', 'Blink_Right'],
};

/**
 * Build a fast lookup: for each mesh, map our canonical morph name → actual index.
 * Call once after scene load. Returns array of { mesh, morphMap } objects.
 */
function buildMorphMap(meshes) {
  return meshes.map(mesh => {
    const dict = mesh.morphTargetDictionary || {};
    const morphMap = {};
    for (const [canonical, aliases] of Object.entries(MORPH_ALIASES)) {
      for (const alias of aliases) {
        if (alias in dict) { morphMap[canonical] = dict[alias]; break; }
      }
      // Fallback: case-insensitive partial match
      if (morphMap[canonical] === undefined) {
        const lc = canonical.toLowerCase();
        for (const key of Object.keys(dict)) {
          if (key.toLowerCase().includes(lc)) { morphMap[canonical] = dict[key]; break; }
        }
      }
    }
    return { mesh, morphMap };
  });
}

/* ── Morph helpers using the resolved map ────────────── */
function setMorphMapped(mapped, canonical, value) {
  for (const { mesh, morphMap } of mapped) {
    const idx = morphMap[canonical];
    if (idx !== undefined) mesh.morphTargetInfluences[idx] = value;
  }
}

function getMorphMapped(mapped, canonical) {
  for (const { mesh, morphMap } of mapped) {
    const idx = morphMap[canonical];
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
  const morphMapped = useRef([]);
  const bones = useRef({});
  const mixerRef = useRef(null);
  const builtinHasBody = useRef(false); // tracks if built-in anims affect body bones
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

  // ── Advanced speech rhythm state ──
  const syllablePhase = useRef(0);        // fast phoneme-like oscillator
  const wordPhase = useRef(0);            // slower word-level cadence
  const sentencePhase = useRef(0);        // slow sentence-level phrasing
  const speechPause = useRef(0);          // countdown for brief pauses between "words"
  const speechPauseActive = useRef(false);
  const emphasisTimer = useRef(0);        // triggers random emphasis nods
  const nextEmphasis = useRef(1.2 + Math.random() * 1.5);
  const emphasisStrength = useRef(0);     // current emphasis blend (decays)
  const gestureBeat = useRef(0);          // gesture state machine: 0=rest 1=reach 2=hold 3=retract
  const gestureTimer = useRef(0);         // timer within current gesture beat
  const gestureSide = useRef(1);          // 1=right hand, -1=left hand
  const gestureTarget = useRef({ armX: 0, armZ: 0, foreX: 0, foreY: 0 }); // current gesture pose
  const weightShiftPhase = useRef(0);     // slow weight shift between feet
  const speechStartTime = useRef(0);      // track how long we've been speaking

  // Reaction (jump) state
  const jumpPhase = useRef(0);
  const jumpActive = useRef(false);
  const lastReaction = useRef(0);

  // Rest-pose tracking for adaptive animations
  const restPose = useRef({});
  const needsArmDown = useRef(true);
  const rg = (bone, axis) => restPose.current[bone]?.[axis] ?? 0;

  // Clone scene for isolation, fix missing textures/colors
  const clonedScene = useMemo(() => {
    let clone;
    try { clone = skeletonClone(scene); } catch { clone = scene.clone(true); }
    clone.traverse((child) => {
      if (child.isMesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        const cloned = mats.map(mat => {
          const m = mat.clone();
          // Preserve all texture maps from original
          const texProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap', 'envMap', 'lightMap', 'specularMap'];
          for (const prop of texProps) {
            if (mat[prop]) m[prop] = mat[prop];
          }
          // Ensure color space is correct on diffuse map
          if (m.map) m.map.colorSpace = 'srgb';
          // Fix models with vertex colors — ensure material uses them
          if (child.geometry?.attributes?.color) {
            m.vertexColors = true;
          }
          // Ensure material isn't invisible
          if (m.transparent && m.opacity === 0) m.opacity = 1;
          m.needsUpdate = true;
          return m;
        });
        child.material = Array.isArray(child.material) ? cloned : cloned[0];
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  // Find morph meshes and build mapped lookup
  useEffect(() => {
    const meshes = [];
    clonedScene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
        meshes.push(child);
      }
    });
    morphMapped.current = buildMorphMap(meshes);
    // Debug: log found morphs
    if (meshes.length) {
      const allMorphNames = new Set();
      meshes.forEach(m => Object.keys(m.morphTargetDictionary || {}).forEach(k => allMorphNames.add(k)));
      console.log('[3DAvatar] Morph targets:', [...allMorphNames].join(', '));
      const resolved = {};
      for (const c of Object.keys(MORPH_ALIASES)) {
        if (morphMapped.current.some(({ morphMap }) => morphMap[c] !== undefined)) resolved[c] = '✓';
      }
      console.log('[3DAvatar] Resolved morphs:', Object.keys(resolved).join(', ') || 'none');
    }
  }, [clonedScene]);

  // Find bones using universal mapper
  useEffect(() => {
    bones.current = mapBones(clonedScene, url);
    // Record rest-pose rotations for adaptive animation
    const rest = {};
    for (const [name, bone] of Object.entries(bones.current)) {
      rest[name] = { x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z };
    }
    restPose.current = rest;
    // Detect T-pose: arms near 0 rotation means horizontal (needs lowering)
    const laZ = Math.abs(rest.LeftArm?.z || 0);
    const raZ = Math.abs(rest.RightArm?.z || 0);
    needsArmDown.current = laZ < 0.4 && raZ < 0.4;
    console.log('[3DAvatar] Found bones:', Object.keys(bones.current).join(', ') || 'none');
    console.log('[3DAvatar] T-pose detected:', needsArmDown.current, '| Rest arm Z:', (rest.LeftArm?.z || 0).toFixed(2), '/', (rest.RightArm?.z || 0).toFixed(2));
    // Debug: log all bone names in the model
    const allBoneNames = [];
    clonedScene.traverse((child) => {
      if (child.isBone || child.type === 'Bone') allBoneNames.push(child.name);
    });
    console.log('[3DAvatar] All model bones:', allBoneNames.join(', '));
    console.log('[3DAvatar] Animations:', animations?.length || 0);
  }, [clonedScene, animations, url]);

  // Play built-in animations if they exist
  useEffect(() => {
    builtinHasBody.current = false;
    if (animations && animations.length > 0 && clonedScene) {
      const mixer = new AnimationMixer(clonedScene);
      mixerRef.current = mixer;
      const clip = animations[0];
      // Check if any track targets body bones (not just facial morphs)
      const bodyPattern = /arm|shoulder|shldr|clavicle|hand|forearm|hip|spine|chest|neck|head|leg|thigh|pelvis/i;
      for (const track of clip.tracks) {
        if (bodyPattern.test(track.name)) { builtinHasBody.current = true; break; }
      }
      const action = mixer.clipAction(clip);
      action.play();
      return () => { mixer.stopAllAction(); mixer.uncacheRoot(clonedScene); };
    }
  }, [animations, clonedScene]);

  // Pick new speak anim each time we enter speaking state
  useEffect(() => {
    if (state === 'speaking' && prevState.current !== 'speaking') {
      speakAnim.current = pickRandom(SPEAK_ANIMS, speakAnim.current);
      // Reset speech rhythm for a fresh start
      syllablePhase.current = 0;
      wordPhase.current = 0;
      sentencePhase.current = 0;
      speechPause.current = 0;
      speechPauseActive.current = false;
      emphasisTimer.current = 0;
      emphasisStrength.current = 0;
      nextEmphasis.current = 1.0 + Math.random() * 1.2;
      gestureBeat.current = 0;
      gestureTimer.current = 0;
      gestureSide.current = Math.random() > 0.5 ? 1 : -1;
      weightShiftPhase.current = Math.random() * Math.PI;
      speechStartTime.current = 0;
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
    const mapped = morphMapped.current;
    const hasMorphs = mapped.length > 0;
    const b = bones.current;
    const dt = Math.min(delta, 0.1) * (animSpeed || 1);
    const br = breathing ?? 1;
    const sw = sway ?? 1;
    const hm = headMove ?? 1;
    const am = armMove ?? 1;
    const ge = gestures ?? 1;
    const noBuiltin = !builtinHasBody.current;

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

    // ── BREAK T-POSE: Lower arms naturally (rest-pose-aware) ──
    if (b.LeftArm && noBuiltin) {
      const rz = rg('LeftArm', 'z');
      const target = needsArmDown.current ? rz + 1.1 : rz;
      b.LeftArm.rotation.z = MathUtils.lerp(b.LeftArm.rotation.z, target, dt * 2);
    }
    if (b.RightArm && noBuiltin) {
      const rz = rg('RightArm', 'z');
      const target = needsArmDown.current ? rz - 1.1 : rz;
      b.RightArm.rotation.z = MathUtils.lerp(b.RightArm.rotation.z, target, dt * 2);
    }
    if (b.LeftForeArm && noBuiltin) {
      const rz = rg('LeftForeArm', 'z');
      const target = needsArmDown.current ? rz + 0.15 : rz;
      b.LeftForeArm.rotation.z = MathUtils.lerp(b.LeftForeArm.rotation.z, target, dt * 2);
    }
    if (b.RightForeArm && noBuiltin) {
      const rz = rg('RightForeArm', 'z');
      const target = needsArmDown.current ? rz - 0.15 : rz;
      b.RightForeArm.rotation.z = MathUtils.lerp(b.RightForeArm.rotation.z, target, dt * 2);
    }

    // ── BREATHING (always active, rest-pose-relative) ──
    breathPhase.current += dt * 0.8;
    const breathVal = Math.sin(breathPhase.current);
    if (b.Spine1) b.Spine1.rotation.x = rg('Spine1', 'x') + breathVal * 0.008 * br;
    if (b.Spine2) b.Spine2.rotation.x = rg('Spine2', 'x') + breathVal * 0.006 * br;

    // ── REACTION: JUMP ──
    let jumpY = 0;
    if (jumpActive.current) {
      jumpPhase.current += dt * 4;
      if (jumpPhase.current < Math.PI) {
        // Anticipation dip + jump arc
        jumpY = Math.sin(jumpPhase.current) * 0.25;
        if (jumpPhase.current < 0.5) jumpY = -0.03 * (jumpPhase.current / 0.5); // squat before jump
        // Happy face
        if (hasMorphs) {
          setMorphMapped(mapped, 'mouthSmile', 0.7);
          setMorphMapped(mapped, 'browInnerUp', 0.3);
        }
        // Arms up during peak
        if (jumpPhase.current > 1 && jumpPhase.current < 2.5) {
          if (b.LeftArm && noBuiltin) b.LeftArm.rotation.z = MathUtils.lerp(b.LeftArm.rotation.z, rg('LeftArm','z') + 2.5, dt * 8);
          if (b.RightArm && noBuiltin) b.RightArm.rotation.z = MathUtils.lerp(b.RightArm.rotation.z, rg('RightArm','z') - 2.5, dt * 8);
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
    if (hasMorphs) {
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
      setMorphMapped(mapped, 'eyeBlinkLeft', blinkProgress);
      setMorphMapped(mapped, 'eyeBlinkRight', blinkProgress);
    }

    // ─────────────────────────────────────────────────
    //  STATE: IDLE — multiple variations
    // ─────────────────────────────────────────────────
    if (state === 'idle') {
      // Clean up mouth from previous speaking
      if (hasMorphs) {
        const currentMouth = getMorphMapped(mapped, 'mouthOpen');
        setMorphMapped(mapped, 'mouthOpen', currentMouth * 0.85);
        setMorphMapped(mapped, 'jawOpen', currentMouth * 0.5);
        if (!jumpActive.current) {
          setMorphMapped(mapped, 'mouthSmile', Math.sin(breathPhase.current * 0.2) * 0.05);
          setMorphMapped(mapped, 'browInnerUp', 0);
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
          const laBase = needsArmDown.current ? rg('LeftArm','z') + 1.1 : rg('LeftArm','z');
          const raBase = needsArmDown.current ? rg('RightArm','z') - 1.1 : rg('RightArm','z');
          const lfBase = needsArmDown.current ? rg('LeftForeArm','z') + 0.15 : rg('LeftForeArm','z');
          const rfBase = needsArmDown.current ? rg('RightForeArm','z') - 0.15 : rg('RightForeArm','z');
          if (b.LeftArm) b.LeftArm.rotation.z = MathUtils.lerp(b.LeftArm.rotation.z, laBase + liftPhase * 1.5 * am, dt * 4);
          if (b.RightArm) b.RightArm.rotation.z = MathUtils.lerp(b.RightArm.rotation.z, raBase - liftPhase * 1.5 * am, dt * 4);
          if (b.LeftForeArm) b.LeftForeArm.rotation.z = MathUtils.lerp(b.LeftForeArm.rotation.z, lfBase + liftPhase * 0.3, dt * 4);
          if (b.RightForeArm) b.RightForeArm.rotation.z = MathUtils.lerp(b.RightForeArm.rotation.z, rfBase - liftPhase * 0.3, dt * 4);
        }
        // Lean back during hold
        if (b.Spine1) b.Spine1.rotation.x += leanPhase * -0.08 * ge;
        if (b.Spine2) b.Spine2.rotation.x += leanPhase * -0.06 * ge;
        if (b.Head) {
          b.Head.rotation.x = MathUtils.lerp(b.Head.rotation.x, leanPhase * -0.1, dt * 3);
        }
        // Happy face during stretch
        if (hasMorphs && sp > 0.3 && sp < 0.8) {
          setMorphMapped(mapped, 'mouthSmile', 0.2);
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
          b.Head.rotation.y = MathUtils.lerp(b.Head.rotation.y, rg('Head','y') + lookY, dt * 1.5);
          b.Head.rotation.x = MathUtils.lerp(b.Head.rotation.x, rg('Head','x') + lookX, dt * 1.5);
        }
        if (b.Neck) {
          const neckY = Math.sin(lookPhase.current * 0.8 + 0.3) * 0.025 * hm;
          b.Neck.rotation.y = MathUtils.lerp(b.Neck.rotation.y, rg('Neck','y') + neckY, dt * 2);
        }
      }

      // Return pace position to center when not pacing
      if (curIdle !== 'pacing' && groupRef.current) {
        groupRef.current.position.x = MathUtils.lerp(groupRef.current.position.x, 0, dt * 2);
        pacePos.current = MathUtils.lerp(pacePos.current, 0, dt * 2);
      }
      // Reset legs when not pacing
      if (curIdle !== 'pacing' && noBuiltin) {
        if (b.LeftUpLeg) b.LeftUpLeg.rotation.x = MathUtils.lerp(b.LeftUpLeg.rotation.x, rg('LeftUpLeg','x'), dt * 4);
        if (b.RightUpLeg) b.RightUpLeg.rotation.x = MathUtils.lerp(b.RightUpLeg.rotation.x, rg('RightUpLeg','x'), dt * 4);
        if (b.LeftLeg) b.LeftLeg.rotation.x = MathUtils.lerp(b.LeftLeg.rotation.x, rg('LeftLeg','x'), dt * 4);
        if (b.RightLeg) b.RightLeg.rotation.x = MathUtils.lerp(b.RightLeg.rotation.x, rg('RightLeg','x'), dt * 4);
      }
    }

    // ─────────────────────────────────────────────────
    //  STATE: SPEAKING — realistic procedural speech
    // ─────────────────────────────────────────────────
    else if (state === 'speaking') {
      speechStartTime.current += dt;
      swayPhase.current += dt * 0.3;
      weightShiftPhase.current += dt * 0.12;

      // ── Multi-layered speech rhythm ──
      // Syllable layer (~8 Hz): fast mouth shapes like real phonemes
      // Word layer (~2 Hz): grouping syllables, with micro-pauses between
      // Sentence layer (~0.3 Hz): prosody envelope — emphasis rises and falls
      syllablePhase.current += dt * 8.5;
      wordPhase.current += dt * 2.2;
      sentencePhase.current += dt * 0.35;

      // Random micro-pauses between "words" (closed mouth for 80-200ms)
      if (!speechPauseActive.current) {
        // Trigger pause randomly aligned with word boundaries
        if (Math.sin(wordPhase.current) > 0.85 && speechPause.current <= 0) {
          speechPauseActive.current = true;
          speechPause.current = 0.08 + Math.random() * 0.14; // 80-220ms pause
        }
      }
      if (speechPauseActive.current) {
        speechPause.current -= dt;
        if (speechPause.current <= 0) speechPauseActive.current = false;
      }

      // Compute layered mouth value
      const pauseMult = speechPauseActive.current ? 0.05 : 1.0; // nearly closed during pause
      const sentenceEnvelope = 0.6 + 0.4 * Math.sin(sentencePhase.current); // prosody wave
      const wordEnvelope = 0.5 + 0.5 * Math.max(0, Math.sin(wordPhase.current)); // word peaks
      const syllable1 = Math.sin(syllablePhase.current) * 0.35;
      const syllable2 = Math.sin(syllablePhase.current * 1.73 + 0.5) * 0.2; // inharmonic for natural feel
      const syllable3 = Math.sin(syllablePhase.current * 0.7 + 1.2) * 0.15; // slow vowel shape
      const rawMouth = (0.25 + syllable1 + syllable2 + syllable3) * wordEnvelope * sentenceEnvelope * pauseMult;
      const mouthVal = Math.max(0, Math.min(1, rawMouth));
      const jawVal = mouthVal * 0.55 + Math.max(0, mouthVal - 0.3) * 0.3; // jaw lags and is softer

      if (hasMorphs) {
        setMorphMapped(mapped, 'mouthOpen', mouthVal);
        setMorphMapped(mapped, 'jawOpen', jawVal);
      }

      // ── Emphasis system: periodic head nods to stress "important words" ──
      emphasisTimer.current += dt;
      if (emphasisTimer.current >= nextEmphasis.current) {
        emphasisTimer.current = 0;
        nextEmphasis.current = 0.8 + Math.random() * 1.8; // next emphasis in 0.8-2.6s
        emphasisStrength.current = 0.6 + Math.random() * 0.4; // how strong this nod is
      }
      // Emphasis decays quickly (sharp nod then fade)
      emphasisStrength.current = Math.max(0, emphasisStrength.current - dt * 2.5);
      const emph = emphasisStrength.current;

      // ── Gesture beat state machine (reach → hold → retract → rest) ──
      gestureTimer.current += dt;
      const gb = gestureBeat.current;
      if (gb === 0 && gestureTimer.current > 1.5 + Math.random() * 2.0) {
        // Start new gesture
        gestureBeat.current = 1;
        gestureTimer.current = 0;
        gestureSide.current = Math.random() > 0.4 ? gestureSide.current : -gestureSide.current;
        // Pick a target pose (variety of gesture shapes)
        const gType = Math.random();
        if (gType < 0.33) { // palm-out explain
          gestureTarget.current = { armX: -0.35, armZ: -0.7 * gestureSide.current, foreX: -0.4, foreY: 0.2 * gestureSide.current };
        } else if (gType < 0.66) { // palm-up offer
          gestureTarget.current = { armX: -0.25, armZ: -0.6 * gestureSide.current, foreX: -0.6, foreY: 0.35 * gestureSide.current };
        } else { // point/enumerate
          gestureTarget.current = { armX: -0.45, armZ: -0.55 * gestureSide.current, foreX: -0.7, foreY: 0.15 * gestureSide.current };
        }
      } else if (gb === 1 && gestureTimer.current > 0.3 + Math.random() * 0.2) {
        // Reached target → hold
        gestureBeat.current = 2;
        gestureTimer.current = 0;
      } else if (gb === 2 && gestureTimer.current > 0.4 + Math.random() * 0.6) {
        // Hold done → retract
        gestureBeat.current = 3;
        gestureTimer.current = 0;
      } else if (gb === 3 && gestureTimer.current > 0.3 + Math.random() * 0.2) {
        // Back to rest
        gestureBeat.current = 0;
        gestureTimer.current = 0;
      }

      // Compute gesture blend (0=rest pose, 1=full gesture pose)
      let gestureBlend = 0;
      if (gb === 1) gestureBlend = MathUtils.clamp(gestureTimer.current / 0.3, 0, 1); // ease in
      else if (gb === 2) gestureBlend = 1; // holding
      else if (gb === 3) gestureBlend = 1 - MathUtils.clamp(gestureTimer.current / 0.35, 0, 1); // ease out
      // Add micro-movement during hold (hand isn't perfectly still)
      const holdWobble = gb === 2 ? Math.sin(gestureTimer.current * 3) * 0.02 : 0;

      // ── Return legs + lateral position to center ──
      if (groupRef.current) groupRef.current.position.x = MathUtils.lerp(groupRef.current.position.x, 0, dt * 3);
      if (noBuiltin) {
        if (b.LeftUpLeg) b.LeftUpLeg.rotation.x = MathUtils.lerp(b.LeftUpLeg.rotation.x, rg('LeftUpLeg','x'), dt * 4);
        if (b.RightUpLeg) b.RightUpLeg.rotation.x = MathUtils.lerp(b.RightUpLeg.rotation.x, rg('RightUpLeg','x'), dt * 4);
        if (b.LeftLeg) b.LeftLeg.rotation.x = MathUtils.lerp(b.LeftLeg.rotation.x, rg('LeftLeg','x'), dt * 4);
        if (b.RightLeg) b.RightLeg.rotation.x = MathUtils.lerp(b.RightLeg.rotation.x, rg('RightLeg','x'), dt * 4);
      }

      // ── Weight shift (slow side-to-side like a real person standing) ──
      const ws = Math.sin(weightShiftPhase.current) * 0.008 * sw;
      if (b.Hips && noBuiltin) {
        b.Hips.position.x = MathUtils.lerp(b.Hips.position.x || 0, ws, dt * 1.5);
        b.Hips.rotation.z = MathUtils.lerp(b.Hips.rotation.z, ws * 1.5, dt * 1.5);
      }

      const curSpeak = speakAnim.current;

      // ══════════════════════════════════════════════
      //  SPEAK: Talking — conversational, warm, natural
      // ══════════════════════════════════════════════
      if (curSpeak === 'talking') {
        // Face: gentle smile that fluctuates, brows react on emphasis
        if (hasMorphs) {
          const smileBase = 0.12 + sentenceEnvelope * 0.06;
          const smilePulse = Math.sin(wordPhase.current * 0.8) * 0.04;
          setMorphMapped(mapped, 'mouthSmile', smileBase + smilePulse + emph * 0.08);
          setMorphMapped(mapped, 'browInnerUp', 0.05 + emph * 0.2 + sentenceEnvelope * 0.04);
        }
        // Head: emphasis nods (x) + slow conversational drift (y) + micro tilt (z)
        if (b.Head) {
          const nodTarget = -emph * 0.06 * ge; // nod down on emphasis
          const driftY = Math.sin(sentencePhase.current * 1.1) * 0.04 * ge + Math.sin(wordPhase.current * 0.3) * 0.02 * ge;
          const tiltZ = Math.sin(sentencePhase.current * 0.7 + 0.5) * 0.015 * ge;
          b.Head.rotation.x = MathUtils.lerp(b.Head.rotation.x, nodTarget + Math.sin(wordPhase.current * 0.5) * 0.015 * ge, dt * 5);
          b.Head.rotation.y = MathUtils.lerp(b.Head.rotation.y, driftY, dt * 2.5);
          b.Head.rotation.z = MathUtils.lerp(b.Head.rotation.z, tiltZ, dt * 2);
        }
        if (b.Neck) {
          b.Neck.rotation.y = MathUtils.lerp(b.Neck.rotation.y, Math.sin(sentencePhase.current * 0.6) * 0.02 * ge, dt * 2);
          b.Neck.rotation.x = MathUtils.lerp(b.Neck.rotation.x, -emph * 0.02 * ge, dt * 4);
        }
        // Shoulders: subtle lift on emphasis (people raise shoulders when stressing)
        if (b.LeftShoulder) b.LeftShoulder.rotation.z = MathUtils.lerp(b.LeftShoulder.rotation.z || 0, emph * 0.015 * ge, dt * 4);
        if (b.RightShoulder) b.RightShoulder.rotation.z = MathUtils.lerp(b.RightShoulder.rotation.z || 0, -emph * 0.015 * ge, dt * 4);
        // Spine: very slight lean shifts following sentence rhythm
        if (b.Spine) b.Spine.rotation.y = MathUtils.lerp(b.Spine.rotation.y || 0, Math.sin(sentencePhase.current * 0.5) * 0.01 * ge, dt * 1.5);
        if (b.Spine2) b.Spine2.rotation.y = MathUtils.lerp(b.Spine2.rotation.y || 0, Math.sin(sentencePhase.current * 0.4 + 0.3) * 0.008 * ge, dt * 1.5);
        // Arms: very subtle fidget, mostly at rest
        if (noBuiltin) {
          const armDrift = Math.sin(sentencePhase.current * 0.4) * 0.02 * am;
          if (b.LeftArm) b.LeftArm.rotation.x = MathUtils.lerp(b.LeftArm.rotation.x, armDrift, dt * 2);
          if (b.RightArm) b.RightArm.rotation.x = MathUtils.lerp(b.RightArm.rotation.x, -armDrift * 0.7, dt * 2);
          if (b.LeftForeArm) b.LeftForeArm.rotation.y = MathUtils.lerp(b.LeftForeArm.rotation.y || 0, Math.sin(wordPhase.current * 0.2) * 0.03 * am, dt * 2);
          if (b.RightForeArm) b.RightForeArm.rotation.y = MathUtils.lerp(b.RightForeArm.rotation.y || 0, Math.sin(wordPhase.current * 0.25 + 1) * -0.03 * am, dt * 2);
        }
      }

      // ══════════════════════════════════════════════
      //  SPEAK: Excited — energetic, bouncy, big expressions
      // ══════════════════════════════════════════════
      else if (curSpeak === 'excited') {
        // Face: wide smile, brows animated, open expressions
        if (hasMorphs) {
          const exciteSmile = 0.35 + sentenceEnvelope * 0.12 + emph * 0.15;
          const exciteBrow = 0.15 + emph * 0.25 + Math.sin(wordPhase.current * 0.6) * 0.08;
          setMorphMapped(mapped, 'mouthSmile', Math.min(0.85, exciteSmile));
          setMorphMapped(mapped, 'browInnerUp', Math.min(0.6, exciteBrow));
        }
        // Head: bigger emphasis nods + energetic side-to-side + tilt
        if (b.Head) {
          const bigNod = -emph * 0.09 * ge + Math.sin(wordPhase.current * 0.7) * 0.025 * ge;
          const sideMotion = Math.sin(sentencePhase.current * 1.5) * 0.06 * ge + Math.sin(wordPhase.current * 0.4) * 0.03 * ge;
          const tilt = Math.sin(sentencePhase.current * 0.8) * 0.03 * ge + emph * 0.02 * ge;
          b.Head.rotation.x = MathUtils.lerp(b.Head.rotation.x, bigNod, dt * 5);
          b.Head.rotation.y = MathUtils.lerp(b.Head.rotation.y, sideMotion, dt * 3);
          b.Head.rotation.z = MathUtils.lerp(b.Head.rotation.z, tilt, dt * 3);
        }
        if (b.Neck) {
          b.Neck.rotation.x = MathUtils.lerp(b.Neck.rotation.x, -emph * 0.03 * ge, dt * 4);
          b.Neck.rotation.y = MathUtils.lerp(b.Neck.rotation.y, Math.sin(sentencePhase.current) * 0.03 * ge, dt * 2);
        }
        // Body bounce: tied to word rhythm, not constant
        if (groupRef.current) {
          const bouncePulse = Math.max(0, Math.sin(wordPhase.current)) * 0.006 * ge;
          const emphBounce = emph * 0.004 * ge;
          groupRef.current.position.y += bouncePulse + emphBounce;
        }
        // Arms: animated gestures synced to emphasis
        if (noBuiltin) {
          const armEnergy = 0.06 + emph * 0.12;
          const armCycle = Math.sin(wordPhase.current * 0.6);
          const laBase = needsArmDown.current ? rg('LeftArm','z') + 1.1 : rg('LeftArm','z');
          const raBase = needsArmDown.current ? rg('RightArm','z') - 1.1 : rg('RightArm','z');
          if (b.LeftArm) {
            b.LeftArm.rotation.x = MathUtils.lerp(b.LeftArm.rotation.x, rg('LeftArm','x') + armCycle * armEnergy * ge, dt * 4);
            b.LeftArm.rotation.z = MathUtils.lerp(b.LeftArm.rotation.z, laBase + Math.sin(sentencePhase.current * 1.2) * 0.2 * ge + emph * 0.15, dt * 3);
          }
          if (b.RightArm) {
            b.RightArm.rotation.x = MathUtils.lerp(b.RightArm.rotation.x, rg('RightArm','x') - armCycle * armEnergy * 0.8 * ge, dt * 4);
            b.RightArm.rotation.z = MathUtils.lerp(b.RightArm.rotation.z, raBase - Math.sin(sentencePhase.current * 1.1 + 0.5) * 0.2 * ge - emph * 0.15, dt * 3);
          }
          if (b.LeftForeArm) b.LeftForeArm.rotation.y = MathUtils.lerp(b.LeftForeArm.rotation.y || 0, armCycle * 0.08 * ge, dt * 3);
          if (b.RightForeArm) b.RightForeArm.rotation.y = MathUtils.lerp(b.RightForeArm.rotation.y || 0, -armCycle * 0.08 * ge, dt * 3);
        }
        // Torso: energetic sway following sentence rhythm
        if (b.Hips && noBuiltin) {
          b.Hips.rotation.y = MathUtils.lerp(b.Hips.rotation.y, Math.sin(sentencePhase.current * 0.8) * 0.02 * sw, dt * 2);
        }
        if (b.Spine) b.Spine.rotation.y = MathUtils.lerp(b.Spine.rotation.y || 0, Math.sin(sentencePhase.current * 0.6) * 0.015 * ge, dt * 2);
        if (b.Spine2) b.Spine2.rotation.x = MathUtils.lerp(b.Spine2.rotation.x || 0, emph * -0.02 * ge, dt * 3);
        // Shoulders pop on emphasis
        if (b.LeftShoulder) b.LeftShoulder.rotation.z = MathUtils.lerp(b.LeftShoulder.rotation.z || 0, emph * 0.025 * ge, dt * 5);
        if (b.RightShoulder) b.RightShoulder.rotation.z = MathUtils.lerp(b.RightShoulder.rotation.z || 0, -emph * 0.025 * ge, dt * 5);
      }

      // ══════════════════════════════════════════════
      //  SPEAK: Explaining — deliberate gestures, teacher-like
      // ══════════════════════════════════════════════
      else if (curSpeak === 'explaining') {
        // Face: thoughtful, brows raise when making points
        if (hasMorphs) {
          const thinkSmile = 0.08 + Math.sin(sentencePhase.current * 0.6) * 0.04;
          const pointBrow = 0.1 + emph * 0.25 + Math.sin(wordPhase.current * 0.4) * 0.06;
          setMorphMapped(mapped, 'mouthSmile', thinkSmile + emph * 0.06);
          setMorphMapped(mapped, 'browInnerUp', Math.min(0.5, pointBrow));
        }
        // Head: deliberate nods on emphasis + slow scanning + slight tilt when "considering"
        if (b.Head) {
          const explainNod = -emph * 0.07 * ge;
          const scanY = Math.sin(sentencePhase.current * 0.8) * 0.05 * ge + Math.sin(wordPhase.current * 0.2) * 0.02 * ge;
          const thinkTilt = Math.sin(sentencePhase.current * 0.5 + 1) * 0.02 * ge;
          b.Head.rotation.x = MathUtils.lerp(b.Head.rotation.x, explainNod + 0.02 * ge, dt * 4); // slight forward lean
          b.Head.rotation.y = MathUtils.lerp(b.Head.rotation.y, scanY, dt * 2);
          b.Head.rotation.z = MathUtils.lerp(b.Head.rotation.z, thinkTilt, dt * 2);
        }
        if (b.Neck) b.Neck.rotation.y = MathUtils.lerp(b.Neck.rotation.y, Math.sin(sentencePhase.current * 0.5) * 0.025 * ge, dt * 2);
        // Gesture arm: reach/hold/retract beats with variety
        if (noBuiltin) {
          const gt = gestureTarget.current;
          const gSide = gestureSide.current;
          const useRight = gSide > 0;
          const gestArm = useRight ? b.RightArm : b.LeftArm;
          const gestFore = useRight ? b.RightForeArm : b.LeftForeArm;
          const restArm = useRight ? b.LeftArm : b.RightArm;
          const restFore = useRight ? b.LeftForeArm : b.RightForeArm;
          const zSign = useRight ? -1 : 1;

          if (gestArm) {
            const gestArmName = useRight ? 'RightArm' : 'LeftArm';
            const armBase = needsArmDown.current ? rg(gestArmName,'z') + (useRight ? -1.1 : 1.1) : rg(gestArmName,'z');
            const targetX = gt.armX * ge * gestureBlend;
            const targetZ = armBase + gt.armZ * ge * gestureBlend;
            gestArm.rotation.x = MathUtils.lerp(gestArm.rotation.x, rg(gestArmName,'x') + targetX + holdWobble * ge, dt * 4);
            gestArm.rotation.z = MathUtils.lerp(gestArm.rotation.z, targetZ, dt * 3.5);
          }
          if (gestFore) {
            gestFore.rotation.x = MathUtils.lerp(gestFore.rotation.x, gt.foreX * ge * gestureBlend + holdWobble * 0.5, dt * 4);
            gestFore.rotation.y = MathUtils.lerp(gestFore.rotation.y || 0, gt.foreY * ge * gestureBlend, dt * 3.5);
          }
          // Rest arm stays relaxed with gentle fidget
          if (restArm) {
            restArm.rotation.x = MathUtils.lerp(restArm.rotation.x, Math.sin(sentencePhase.current * 0.3) * 0.015 * am, dt * 2);
          }
          if (restFore) {
            restFore.rotation.y = MathUtils.lerp(restFore.rotation.y || 0, Math.sin(wordPhase.current * 0.15) * 0.02 * am, dt * 2);
          }
        }
        // Lean forward slightly (engaging the listener)
        if (b.Spine) b.Spine.rotation.x = MathUtils.lerp(b.Spine.rotation.x || 0, 0.03 * ge + emph * 0.015, dt * 2);
        if (b.Spine2) b.Spine2.rotation.y = MathUtils.lerp(b.Spine2.rotation.y || 0, Math.sin(sentencePhase.current * 0.4) * 0.012 * ge, dt * 2);
        // Shoulders: micro-shrug on emphasis
        if (b.LeftShoulder) b.LeftShoulder.rotation.z = MathUtils.lerp(b.LeftShoulder.rotation.z || 0, emph * 0.012 * ge, dt * 4);
        if (b.RightShoulder) b.RightShoulder.rotation.z = MathUtils.lerp(b.RightShoulder.rotation.z || 0, -emph * 0.012 * ge, dt * 4);
      }
    }

    // ─────────────────────────────────────────────────
    //  STATE: THINKING
    // ─────────────────────────────────────────────────
    else if (state === 'thinking') {
      breathPhase.current += 0; // already incremented above
      if (hasMorphs) {
        setMorphMapped(mapped, 'mouthOpen', 0);
        setMorphMapped(mapped, 'jawOpen', 0);
        setMorphMapped(mapped, 'browInnerUp', 0.35 + Math.sin(breathPhase.current * 2) * 0.1);
        setMorphMapped(mapped, 'mouthSmile', 0.05);
      }
      if (b.Head) {
        b.Head.rotation.x = MathUtils.lerp(b.Head.rotation.x, rg('Head','x') - 0.12 * ge, dt * 3);
        b.Head.rotation.z = MathUtils.lerp(b.Head.rotation.z, rg('Head','z') + 0.08 * ge, dt * 3);
        b.Head.rotation.y = rg('Head','y') + Math.sin(breathPhase.current * 0.5) * 0.04 * ge;
      }
      if (b.RightForeArm && noBuiltin) {
        b.RightForeArm.rotation.x = MathUtils.lerp(b.RightForeArm.rotation.x, rg('RightForeArm','x') - 0.8 * ge, dt * 2);
        b.RightForeArm.rotation.z = MathUtils.lerp(b.RightForeArm.rotation.z, rg('RightForeArm','z') - 0.3 * ge, dt * 2);
      }
      // Return to center
      if (groupRef.current) groupRef.current.position.x = MathUtils.lerp(groupRef.current.position.x, 0, dt * 3);
      if (b.Hips && noBuiltin) {
        b.Hips.rotation.z = MathUtils.lerp(b.Hips.rotation.z, 0, dt * 2);
      }
      if (noBuiltin) {
        if (b.LeftUpLeg) b.LeftUpLeg.rotation.x = MathUtils.lerp(b.LeftUpLeg.rotation.x, rg('LeftUpLeg','x'), dt * 4);
        if (b.RightUpLeg) b.RightUpLeg.rotation.x = MathUtils.lerp(b.RightUpLeg.rotation.x, rg('RightUpLeg','x'), dt * 4);
        if (b.LeftLeg) b.LeftLeg.rotation.x = MathUtils.lerp(b.LeftLeg.rotation.x, rg('LeftLeg','x'), dt * 4);
        if (b.RightLeg) b.RightLeg.rotation.x = MathUtils.lerp(b.RightLeg.rotation.x, rg('RightLeg','x'), dt * 4);
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
  const [activeUrl, setActiveUrl] = useState(avatarUrl);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const fadeRef = useRef(null);

  // Smooth crossfade when avatar URL changes
  useEffect(() => {
    if (avatarUrl === activeUrl) return;
    // Fade out
    setFadeOpacity(0);
    if (fadeRef.current) clearTimeout(fadeRef.current);
    fadeRef.current = setTimeout(() => {
      setActiveUrl(avatarUrl);
      setError(null);
      // Small delay then fade in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFadeOpacity(1));
      });
    }, 350); // match CSS transition duration
    return () => { if (fadeRef.current) clearTimeout(fadeRef.current); };
  }, [avatarUrl]);

  if (!activeUrl) {
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
    <div style={{
      width, height, background: 'transparent', border: 'none', overflow: 'hidden', position: 'relative', pointerEvents: 'auto',
      opacity: fadeOpacity, transition: 'opacity 0.35s ease-in-out',
    }}>
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
        key={activeUrl}
        shadows
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
        fallback={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%', color: '#ef4444', fontSize: 12, textAlign: 'center', gap: 6 }}>
            <span>Failed to load 3D avatar</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>Check the model URL or try a different avatar</span>
          </div>
        }
      >
        <CameraRig cameraDistance={cameraDistance} cameraHeight={cameraHeight} />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={1.2} castShadow />
        <directionalLight position={[-1, 2, -1]} intensity={0.4} color="#8b5cf6" />
        <pointLight position={[0, 1, 2]} intensity={0.3} color={accentColor} />

        {/* Avatar */}
        <React.Suspense fallback={
          <Html center>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, whiteSpace: 'nowrap',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>Loading 3D model…</div>
          </Html>
        }>
          <AvatarModel url={activeUrl} state={state} accentColor={accentColor} flipModel={flipModel}
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
