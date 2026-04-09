/**
 * modelConfigs.js — Per-model bone/morph mapping + behavior tuning
 *
 * Each config declares HOW to drive that specific model:
 *   bones   → maps canonical names to the model's actual joint names
 *   morphs  → maps canonical expression names to the model's blendshape names
 *   morphNames → (optional) array to inject into empty morphTargetDictionary (VRC/VRM)
 *   behavior → per-model animation multipliers + weighted anim pools
 *   meta    → scale/offset overrides
 */

// ─── Mixamo FBX V2 Avatars ───────────────────────────────────────────
// Standard Mixamo rig — "mixamorig:" prefix is stripped at load time
// (in AIChatBot3DAvatar.jsx) so bones are just Hips, Spine, Head, etc.
// No morph targets (Mixamo characters don't have blendshapes).
// FBX unit scale: FBXLoader auto-applies UnitScaleFactor, but Mixamo
// exports at 1cm = 1 unit, so we apply 0.01 scale.
const MIXAMO_V2_BONES = {
  Hips: 'Hips',
  Spine: 'Spine',
  Spine1: 'Spine1',
  Spine2: 'Spine2',
  Neck: 'Neck',
  Head: 'Head',
  LeftShoulder: 'LeftShoulder',
  LeftArm: 'LeftArm',
  LeftForeArm: 'LeftForeArm',
  LeftHand: 'LeftHand',
  RightShoulder: 'RightShoulder',
  RightArm: 'RightArm',
  RightForeArm: 'RightForeArm',
  RightHand: 'RightHand',
  LeftUpLeg: 'LeftUpLeg',
  LeftLeg: 'LeftLeg',
  LeftFoot: 'LeftFoot',
  RightUpLeg: 'RightUpLeg',
  RightLeg: 'RightLeg',
  RightFoot: 'RightFoot',
  LeftEye: 'LeftEye',
  RightEye: 'RightEye',
};

const MIXAMO_V2_BEHAVIOR = {
  bodyScale: 1.2,
  gestureScale: 1.3,
  headScale: 1.2,
  faceScale: 0,       // no morph targets on Mixamo chars
  idleWeights: { standing: 3, shifting: 2, lookAround: 3, stretch: 2 },
  speakWeights: { conversational: 2, energetic: 3, explaining: 2 },
  reactions: ['jump', 'nod', 'cheer', 'wave', 'laugh', 'bigNod', 'surprise'],
};

function createMixamoV2Config(filename, displayName) {
  return {
    id: filename,
    bones: { ...MIXAMO_V2_BONES },
    morphs: {},
    morphNames: null,
    behavior: { ...MIXAMO_V2_BEHAVIOR },
    meta: { scale: 0.01, offsetY: 0 },
  };
}

const V2_AVATAR_1 = createMixamoV2Config('v2-avatar-1.fbx', 'V2 Avatar 1');
const V2_AVATAR_2 = createMixamoV2Config('v2-avatar-2.fbx', 'V2 Avatar 2');
const V2_AVATAR_3 = createMixamoV2Config('v2-avatar-3.fbx', 'V2 Avatar 3');
const V2_AVATAR_4 = createMixamoV2Config('v2-avatar-4.fbx', 'V2 Avatar 4');
const V2_AVATAR_5 = createMixamoV2Config('v2-avatar-5.fbx', 'V2 Avatar 5');
const V2_AVATAR_6 = createMixamoV2Config('v2-avatar-6.fbx', 'V2 Avatar 6');

/* ─── Registry ────────────────────────────────────────────────────────── */
const MODEL_CONFIGS = {
  [V2_AVATAR_1.id]: V2_AVATAR_1,
  [V2_AVATAR_2.id]: V2_AVATAR_2,
  [V2_AVATAR_3.id]: V2_AVATAR_3,
  [V2_AVATAR_4.id]: V2_AVATAR_4,
  [V2_AVATAR_5.id]: V2_AVATAR_5,
  [V2_AVATAR_6.id]: V2_AVATAR_6,
};

/** Get config for a model by filename (extracted from URL) */
export function getModelConfig(url) {
  const filename = url ? url.split('/').pop() : '';
  return MODEL_CONFIGS[filename] || null;
}

/** Default behavior values when no config match */
export const DEFAULT_BEHAVIOR = {
  bodyScale: 1.0,
  gestureScale: 1.0,
  headScale: 1.0,
  faceScale: 0,
  idleWeights: { standing: 3, shifting: 2, lookAround: 2, stretch: 3 },
  speakWeights: { conversational: 3, energetic: 2, explaining: 2 },
  reactions: ['jump', 'nod', 'cheer'],
};

export default MODEL_CONFIGS;
