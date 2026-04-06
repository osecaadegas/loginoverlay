/**
 * rigMapper.js — Model adapter layer
 *
 * Resolves bone objects and morph indices from any GLB scene,
 * using the model config's explicit mappings.
 * Falls back to regex heuristics for unknown models.
 */

import { getModelConfig, DEFAULT_BEHAVIOR } from './modelConfigs';

/* ── Regex fallback for unknown models ────────────────────────────────── */
const BONE_PATTERNS = {
  Hips:          [/\bhips?\b/i, /\bpelvis\b/i],
  Spine:         [/\bspine\b(?![\d_]*[1-9])/i, /\babdomen\b/i],
  Spine1:        [/\bspine[_. ]?0?1(?:\b|[_ ])/i, /\bchest\b/i],
  Spine2:        [/\bspine[_. ]?0?2(?:\b|[_ ])/i, /\bupper[_. ]?chest\b/i],
  Neck:          [/\bneck\b/i],
  Head:          [/\bhead\b/i],
  LeftShoulder:  [/(?<![a-zA-Z])l(?:eft)?[_. ]?shoulder\b/i, /\bshoulder[_. ]?l\b/i],
  LeftArm:       [/(?<![a-zA-Z])l(?:eft)?[_. ]?(?:upper[_. ]?)?arm\b/i, /\bupper[_. ]?arm[_. ]?l\b/i],
  LeftForeArm:   [/(?<![a-zA-Z])l(?:eft)?[_. ]?(?:fore[_. ]?arm|lower[_. ]?arm|elbow)/i, /\bfore[_. ]?arm[_. ]?l\b/i],
  LeftHand:      [/(?<![a-zA-Z])l(?:eft)?[_. ]?(?:hand|wrist)\b/i, /\bhand[_. ]?l\b/i],
  RightShoulder: [/(?<![a-zA-Z])r(?:ight)?[_. ]?shoulder\b/i, /\bshoulder[_. ]?r\b/i],
  RightArm:      [/(?<![a-zA-Z])r(?:ight)?[_. ]?(?:upper[_. ]?)?arm\b/i, /\bupper[_. ]?arm[_. ]?r\b/i],
  RightForeArm:  [/(?<![a-zA-Z])r(?:ight)?[_. ]?(?:fore[_. ]?arm|lower[_. ]?arm|elbow)/i, /\bfore[_. ]?arm[_. ]?r\b/i],
  RightHand:     [/(?<![a-zA-Z])r(?:ight)?[_. ]?(?:hand|wrist)\b/i, /\bhand[_. ]?r\b/i],
  LeftUpLeg:     [/(?<![a-zA-Z])l(?:eft)?[_. ]?(?:up[_. ]?)?leg\b/i, /(?<![a-zA-Z])l(?:eft)?[_. ]?thigh\b/i, /\bthigh[_. ]?l\b/i],
  LeftLeg:       [/(?<![a-zA-Z])l(?:eft)?[_. ]?knee\b/i, /\b(?:shin|lower[_. ]?leg|calf)[_. ]?l\b/i],
  RightUpLeg:    [/(?<![a-zA-Z])r(?:ight)?[_. ]?(?:up[_. ]?)?leg\b/i, /(?<![a-zA-Z])r(?:ight)?[_. ]?thigh\b/i, /\bthigh[_. ]?r\b/i],
  RightLeg:      [/(?<![a-zA-Z])r(?:ight)?[_. ]?knee\b/i, /\b(?:shin|lower[_. ]?leg|calf)[_. ]?r\b/i],
};

// Match order: more specific first
const BONE_MATCH_ORDER = [
  'LeftForeArm','RightForeArm','LeftHand','RightHand',
  'LeftShoulder','RightShoulder','LeftArm','RightArm',
  'LeftUpLeg','RightUpLeg','LeftLeg','RightLeg',
  'Spine2','Spine1','Spine','Neck','Head','Hips',
];

/**
 * Resolve a rig from a loaded GLB scene.
 *
 * @param {Object3D} scene  — the loaded scene graph
 * @param {string}   url    — the model URL (used to look up config)
 * @returns {{ bones, morphs, hasVisemes, behavior, restPose, needsArmDown }}
 */
export function resolveRig(scene, url) {
  const config = getModelConfig(url);
  const allBones = collectBones(scene);

  // ── Resolve bones ──
  const bones = config
    ? resolveExplicitBones(allBones, config.bones)
    : resolveFallbackBones(allBones);

  // ── Resolve morphs ──
  const meshes = collectMorphMeshes(scene, config);
  const morphs = buildMorphResolver(meshes, config);

  // ── Detect viseme support ──
  const hasVisemes = config?.morphs?.viseme_aa != null
    || morphs.has('viseme_aa');

  // ── Rest pose + T-pose detection ──
  const restPose = {};
  for (const [name, bone] of Object.entries(bones)) {
    restPose[name] = { x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z };
  }
  const laZ = Math.abs(restPose.LeftArm?.z || 0);
  const raZ = Math.abs(restPose.RightArm?.z || 0);
  const needsArmDown = laZ < 0.4 && raZ < 0.4;

  // ── Behavior profile ──
  const behavior = config?.behavior || { ...DEFAULT_BEHAVIOR };

  return { bones, morphs, hasVisemes, behavior, restPose, needsArmDown };
}

/* ── Bone collection ──────────────────────────────────────────────────── */
function collectBones(scene) {
  const bones = [];
  scene.traverse((child) => {
    if (child.isBone || child.type === 'Bone') bones.push(child);
  });
  if (bones.length === 0) {
    scene.traverse((child) => {
      if (child.isObject3D && child.children.length > 0 && !child.isMesh && !child.isLight && !child.isCamera) {
        if (/hip|spine|head|neck|arm|leg|shoulder|hand|thigh|pelvis|chest|elbow|knee|wrist/i.test(child.name)) {
          bones.push(child);
        }
      }
    });
  }
  return bones;
}

function resolveExplicitBones(allBones, boneMap) {
  const result = {};
  const norm = (s) => s.toLowerCase().replace(/[_ .]/g, '');
  for (const [canonical, realName] of Object.entries(boneMap)) {
    const target = norm(realName);
    for (const bone of allBones) {
      if (bone.name === realName || norm(bone.name) === target) { result[canonical] = bone; break; }
    }
  }
  return result;
}

function resolveFallbackBones(allBones) {
  const result = {};
  const used = new Set();

  function strip(name) {
    let s = name;
    s = s.replace(/^[A-Za-z0-9_]+[:|]/, '');
    s = s.replace(/^[A-Za-z0-9_]+\./, '');
    s = s.replace(/[_ ]\d+$/, '');
    return s.trim();
  }

  for (const canonical of BONE_MATCH_ORDER) {
    const patterns = BONE_PATTERNS[canonical];
    if (!patterns) continue;
    // Exact match first
    for (const bone of allBones) {
      if (used.has(bone)) continue;
      if (strip(bone.name).toLowerCase() === canonical.toLowerCase()) {
        result[canonical] = bone; used.add(bone); break;
      }
    }
    if (result[canonical]) continue;
    // Regex fallback
    for (const bone of allBones) {
      if (used.has(bone)) continue;
      const raw = bone.name;
      const stripped = strip(raw);
      for (const rx of patterns) {
        if (rx.test(raw) || rx.test(stripped)) {
          result[canonical] = bone; used.add(bone); break;
        }
      }
      if (result[canonical]) break;
    }
  }
  return result;
}

/* ── Morph resolution ─────────────────────────────────────────────────── */
function collectMorphMeshes(scene, config) {
  const meshes = [];
  scene.traverse((child) => {
    if (!child.isMesh || !child.morphTargetInfluences?.length) return;
    // VRC models have empty morphTargetDictionary — inject from config
    if ((!child.morphTargetDictionary || Object.keys(child.morphTargetDictionary).length === 0) && config?.morphNames) {
      child.morphTargetDictionary = {};
      for (let i = 0; i < Math.min(config.morphNames.length, child.morphTargetInfluences.length); i++) {
        child.morphTargetDictionary[config.morphNames[i]] = i;
      }
    }
    if (child.morphTargetDictionary && Object.keys(child.morphTargetDictionary).length > 0) {
      meshes.push(child);
    }
  });
  return meshes;
}

/**
 * Builds a morph resolver: set(canonical, value) / get(canonical) / has(canonical)
 * Config-driven: for known models, maps canonical → config name → dict index.
 * For unknown models, tries common alias matching.
 */
function buildMorphResolver(meshes, config) {
  // Build direct name → index lookups per mesh
  const mappings = meshes.map(mesh => {
    const dict = mesh.morphTargetDictionary || {};
    const resolved = {};
    if (config?.morphs) {
      // Explicit mapping: canonical → config name → dict index
      for (const [canonical, realName] of Object.entries(config.morphs)) {
        if (realName in dict) resolved[canonical] = dict[realName];
      }
    }
    // Also expose raw dict for any unmapped names
    for (const [name, idx] of Object.entries(dict)) {
      if (!(name in resolved)) resolved[name] = idx;
    }
    return { mesh, resolved };
  });

  return {
    set(canonical, value) {
      for (const { mesh, resolved } of mappings) {
        const idx = resolved[canonical];
        if (idx !== undefined) mesh.morphTargetInfluences[idx] = value;
      }
    },
    get(canonical) {
      for (const { mesh, resolved } of mappings) {
        const idx = resolved[canonical];
        if (idx !== undefined) return mesh.morphTargetInfluences[idx];
      }
      return 0;
    },
    has(canonical) {
      return mappings.some(({ resolved }) => resolved[canonical] !== undefined);
    },
    /** Reset all morph influences to 0 */
    resetAll() {
      for (const { mesh } of mappings) {
        for (let i = 0; i < mesh.morphTargetInfluences.length; i++) {
          mesh.morphTargetInfluences[i] = 0;
        }
      }
    },
  };
}
