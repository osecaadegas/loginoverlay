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

// ─── Blender Avatar (3640925089614202413.glb) ─────────────────────────
// 54-bone Blender rig, VRMC_vrm extension, 0 morphs.
// Bone names: hips, spine, chest, neck, head, shoulder.L, upper_arm.L, etc.
const BLENDER_AVATAR = {
  id: '3640925089614202413.glb',
  bones: {
    Hips: 'hips', Spine: 'spine', Spine1: 'chest',
    Neck: 'neck', Head: 'head',
    LeftShoulder: 'shoulder.L', LeftArm: 'upper_arm.L', LeftForeArm: 'lower_arm.L', LeftHand: 'hand.L',
    RightShoulder: 'shoulder.R', RightArm: 'upper_arm.R', RightForeArm: 'lower_arm.R', RightHand: 'hand.R',
    LeftUpLeg: 'upper_leg.L', LeftLeg: 'lower_leg.L', LeftFoot: 'foot.L',
    RightUpLeg: 'upper_leg.R', RightLeg: 'lower_leg.R', RightFoot: 'foot.R',
    LeftEye: 'eye.L', RightEye: 'eye.R',
  },
  morphs: {},            // none available
  morphNames: null,
  behavior: {
    bodyScale: 1.3,      // extra body expression (no face to compensate)
    gestureScale: 1.5,
    headScale: 1.3,
    faceScale: 0,        // no morphs
    idleWeights: { standing: 2, shifting: 3, lookAround: 3, stretch: 2 },
    speakWeights: { conversational: 1, energetic: 3, explaining: 3 },
    reactions: ['jump', 'cheer', 'bigNod', 'bodyShake'],
  },
  meta: { scale: 1, offsetY: 0 },
};

// ─── Standard Avatar (8232090975149790447.glb) ────────────────────────
// Full standard rig, T-pose, 1 morph ("moohgy"), VRM extension.
// Bone names: standard Mixamo-compatible (Hips, Spine, Head, etc.)
const STANDARD_AVATAR = {
  id: '8232090975149790447.glb',
  bones: {
    Hips: 'Hips', Spine: 'Spine', Spine1: 'Spine1', Spine2: 'Spine2',
    Neck: 'Neck', Head: 'Head',
    LeftShoulder: 'LeftShoulder', LeftArm: 'LeftArm', LeftForeArm: 'LeftForeArm', LeftHand: 'LeftHand',
    RightShoulder: 'RightShoulder', RightArm: 'RightArm', RightForeArm: 'RightForeArm', RightHand: 'RightHand',
    LeftUpLeg: 'LeftUpLeg', LeftLeg: 'LeftLeg', LeftFoot: 'LeftFoot',
    RightUpLeg: 'RightUpLeg', RightLeg: 'RightLeg', RightFoot: 'RightFoot',
  },
  morphs: {},
  morphNames: null,
  behavior: {
    bodyScale: 1.0,
    gestureScale: 1.0,
    headScale: 1.0,
    faceScale: 0,
    idleWeights: { standing: 3, shifting: 2, lookAround: 2, stretch: 3 },
    speakWeights: { conversational: 3, energetic: 2, explaining: 2 },
    reactions: ['jump', 'nod', 'cheer', 'laugh'],
  },
  meta: { scale: 1, offsetY: 0 },
};

// ─── Expressive VRC Avatar (2914707689262839002.glb) ──────────────────
// 52 bones with space-separated names + 21 VRC visemes across 3 primitives.
// VRM extension. morphTargetDictionary is empty — needs injection via morphNames.
const EXPRESSIVE_AVATAR = {
  id: '2914707689262839002.glb',
  bones: {
    Hips: 'Hips', Spine: 'Spine', Spine1: 'Chest',
    Neck: 'Neck', Head: 'Head',
    LeftShoulder: 'Left_shoulder', LeftArm: 'Left_arm', LeftForeArm: 'Left_elbow', LeftHand: 'Left_wrist',
    RightShoulder: 'Right_shoulder', RightArm: 'Right_arm', RightForeArm: 'Right_elbow', RightHand: 'Right_wrist',
    LeftUpLeg: 'Left_leg', LeftLeg: 'Left_knee', LeftFoot: 'Left_ankle',
    RightUpLeg: 'Right_leg', RightLeg: 'Right_knee', RightFoot: 'Right_ankle',
  },
  morphs: {
    // Canonical → actual VRC morph name
    mouthOpen: 'vrc.v_aa',
    jawOpen: 'vrc.v_oh',
    mouthSmile: 'Grin',
    // VRC visemes for lip-sync cycling
    viseme_aa: 'vrc.v_aa', viseme_ch: 'vrc.v_ch', viseme_dd: 'vrc.v_dd',
    viseme_ee: 'vrc.v_e', viseme_ff: 'vrc.v_ff', viseme_ih: 'vrc.v_ih',
    viseme_kk: 'vrc.v_kk', viseme_nn: 'vrc.v_nn', viseme_oh: 'vrc.v_oh',
    viseme_ou: 'vrc.v_ou', viseme_pp: 'vrc.v_pp', viseme_rr: 'vrc.v_rr',
    viseme_sil: 'vrc.v_sil', viseme_ss: 'vrc.v_ss', viseme_th: 'vrc.v_th',
    grin: 'Grin', oh: 'Oh', ee: 'E', ch: 'Ch', ah: 'Ah', uu: 'U',
  },
  morphNames: [
    'vrc.v_aa','vrc.v_ch','vrc.v_dd','vrc.v_e','vrc.v_ff','vrc.v_ih',
    'vrc.v_kk','vrc.v_nn','vrc.v_oh','vrc.v_ou','vrc.v_pp','vrc.v_rr',
    'vrc.v_sil','vrc.v_ss','vrc.v_th','Oh','Grin','E','Ch','Ah','U',
  ],
  behavior: {
    bodyScale: 0.9,
    gestureScale: 1.0,
    headScale: 1.1,
    faceScale: 1.0,     // full face morphs available
    idleWeights: { standing: 3, shifting: 1, lookAround: 2, stretch: 2 },
    speakWeights: { conversational: 3, energetic: 2, explaining: 2 },
    reactions: ['jump', 'nod', 'surprise', 'cheer', 'laugh'],
  },
  meta: { scale: 1, offsetY: 0 },
};

/* ─── Registry ────────────────────────────────────────────────────────── */
const MODEL_CONFIGS = {
  [BLENDER_AVATAR.id]: BLENDER_AVATAR,
  [STANDARD_AVATAR.id]: STANDARD_AVATAR,
  [EXPRESSIVE_AVATAR.id]: EXPRESSIVE_AVATAR,
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
