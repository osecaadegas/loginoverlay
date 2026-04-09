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

// ─── Monster Avatar (monster/monster_rig.glb) ────────────────────────
// CC3/CC4 Character Creator rig — headless monster body.
// 82 bones total (52 skinned), CC_Base_ prefix naming.
// No Head/Neck bones — head motions re-routed to Spine02 for full-body nods.
// 1 morph target (unused), no visemes. Textures embedded in GLB.
const MONSTER_AVATAR = {
  id: 'monster_rig.glb',
  bones: {
    Hips: 'CC_Base_Hip_80',
    Spine: 'CC_Base_Waist_79',
    Spine1: 'CC_Base_Spine01_78',
    Spine2: 'CC_Base_Spine02_77',
    // No Head/Neck — headless monster; head animations silently skipped
    LeftShoulder: 'CC_Base_L_Clavicle_51',
    LeftArm: 'CC_Base_L_Upperarm_50',
    LeftForeArm: 'CC_Base_L_Forearm_47',
    LeftHand: 'CC_Base_L_Hand_46',
    RightShoulder: 'CC_Base_R_Clavicle_72',
    RightArm: 'CC_Base_R_Upperarm_71',
    RightForeArm: 'CC_Base_R_Forearm_70',
    RightHand: 'CC_Base_R_Hand_69',
    LeftUpLeg: 'CC_Base_L_Thigh_14',
    LeftLeg: 'CC_Base_L_Calf_11',
    LeftFoot: 'CC_Base_L_Foot_7',
    RightUpLeg: 'CC_Base_R_Thigh_29',
    RightLeg: 'CC_Base_R_Calf_28',
    RightFoot: 'CC_Base_R_Foot_24',
  },
  morphs: {},            // no facial morphs
  morphNames: null,
  behavior: {
    bodyScale: 1.4,      // extra body expression — no head to compensate
    gestureScale: 1.6,   // bigger arm gestures for monster feel
    headScale: 0.5,      // reduced since Head=Spine02 (avoid over-rotating torso)
    faceScale: 0,        // no morphs
    idleWeights: { standing: 2, shifting: 3, lookAround: 1, stretch: 3 },
    speakWeights: { conversational: 1, energetic: 3, explaining: 2 },
    reactions: ['jump', 'cheer', 'bigNod', 'bodyShake'],
  },
  meta: { scale: 0.01, offsetY: 0 },  // CC models export in cm, need 0.01 to convert to meters
};

// ─── Mixamo FBX V2 Avatars ───────────────────────────────────────────
// Standard Mixamo rig with "mixamorig:" prefix.
// Bones: mixamorig:Hips, mixamorig:Spine, mixamorig:Head, etc.
// No morph targets (Mixamo characters don't have blendshapes).
// FBX unit scale: FBXLoader auto-applies UnitScaleFactor, but Mixamo
// exports at 1cm = 1 unit, so we apply 0.01 scale.
const MIXAMO_V2_BONES = {
  Hips: 'mixamorig:Hips',
  Spine: 'mixamorig:Spine',
  Spine1: 'mixamorig:Spine1',
  Spine2: 'mixamorig:Spine2',
  Neck: 'mixamorig:Neck',
  Head: 'mixamorig:Head',
  LeftShoulder: 'mixamorig:LeftShoulder',
  LeftArm: 'mixamorig:LeftArm',
  LeftForeArm: 'mixamorig:LeftForeArm',
  LeftHand: 'mixamorig:LeftHand',
  RightShoulder: 'mixamorig:RightShoulder',
  RightArm: 'mixamorig:RightArm',
  RightForeArm: 'mixamorig:RightForeArm',
  RightHand: 'mixamorig:RightHand',
  LeftUpLeg: 'mixamorig:LeftUpLeg',
  LeftLeg: 'mixamorig:LeftLeg',
  LeftFoot: 'mixamorig:LeftFoot',
  RightUpLeg: 'mixamorig:RightUpLeg',
  RightLeg: 'mixamorig:RightLeg',
  RightFoot: 'mixamorig:RightFoot',
  LeftEye: 'mixamorig:LeftEye',
  RightEye: 'mixamorig:RightEye',
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
  [BLENDER_AVATAR.id]: BLENDER_AVATAR,
  [STANDARD_AVATAR.id]: STANDARD_AVATAR,
  [EXPRESSIVE_AVATAR.id]: EXPRESSIVE_AVATAR,
  [MONSTER_AVATAR.id]: MONSTER_AVATAR,
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
