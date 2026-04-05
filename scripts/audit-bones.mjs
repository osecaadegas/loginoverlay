/**
 * Deep bone audit — extracts rest-pose quaternions, bone hierarchy, and animation info
 * from each GLB's JSON chunk to build per-model profiles.
 */
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR = 'public/avatars';

/* ── quaternion → euler (XYZ intrinsic, radians) ───── */
function quatToEuler([x, y, z, w]) {
  const sinr = 2 * (w * x + y * z);
  const cosr = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr, cosr);
  let sinp = 2 * (w * y - z * x);
  if (Math.abs(sinp) >= 1) sinp = Math.sign(sinp) * 1;
  const pitch = Math.asin(sinp);
  const siny = 2 * (w * z + x * y);
  const cosy = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny, cosy);
  return { x: +(roll.toFixed(3)), y: +(pitch.toFixed(3)), z: +(yaw.toFixed(3)) };
}

/* ── Simplified canonical bone matcher ────────────── */
const BONE_ALIASES = {
  Hips:          [/\bhips?\b/i, /\bpelvis\b/i, /CC_Base_Hip/i, /J_Bip_C_Hips/i],
  Spine:         [/\bspine\b(?![\d_]*[12])/i, /\bspine[_.]?0?0?\b/i, /CC_Base_Spine01/i, /J_Bip_C_Spine/i, /\babdomen\b/i],
  Spine1:        [/spine[_.]?0?1\b/i, /\bchest\b/i, /CC_Base_Spine02/i, /J_Bip_C_Spine2/i],
  Spine2:        [/spine[_.]?0?2\b/i, /\bupperchest\b/i, /\bupper[_.]?chest\b/i, /J_Bip_C_UpperBody/i],
  Neck:          [/\bneck\b/i, /CC_Base_Neck/i, /J_Bip_C_Neck/i],
  Head:          [/\bhead\b/i, /CC_Base_Head/i, /J_Bip_C_Head/i],
  LeftShoulder:  [/l(?:eft)?[_.]?shoulder/i, /shoulder[_.]?l\b/i, /CC_Base_L_Clavicle/i, /J_Bip_L_Shoulder/i, /\blCollar\b/i, /clavicle[_.]?l\b/i],
  LeftArm:       [/l(?:eft)?[_.]?(?:upper[_.]?)?arm\b/i, /upper[_.]?arm[_.]?l\b/i, /CC_Base_L_Upperarm/i, /J_Bip_L_UpperArm/i, /\blShldr\b/i],
  LeftForeArm:   [/l(?:eft)?[_.]?(?:fore[_.]?)?arm/i, /fore[_.]?arm[_.]?l\b/i, /lower[_.]?arm[_.]?l\b/i, /CC_Base_L_Forearm/i, /J_Bip_L_LowerArm/i],
  LeftHand:      [/l(?:eft)?[_.]?hand\b/i, /hand[_.]?l\b/i, /CC_Base_L_Hand/i, /J_Bip_L_Hand/i],
  RightShoulder: [/r(?:ight)?[_.]?shoulder/i, /shoulder[_.]?r\b/i, /CC_Base_R_Clavicle/i, /J_Bip_R_Shoulder/i, /\brCollar\b/i, /clavicle[_.]?r\b/i],
  RightArm:      [/r(?:ight)?[_.]?(?:upper[_.]?)?arm\b/i, /upper[_.]?arm[_.]?r\b/i, /CC_Base_R_Upperarm/i, /J_Bip_R_UpperArm/i, /\brShldr\b/i],
  RightForeArm:  [/r(?:ight)?[_.]?(?:fore[_.]?)?arm/i, /fore[_.]?arm[_.]?r\b/i, /lower[_.]?arm[_.]?r\b/i, /CC_Base_R_Forearm/i, /J_Bip_R_LowerArm/i],
  RightHand:     [/r(?:ight)?[_.]?hand\b/i, /hand[_.]?r\b/i, /CC_Base_R_Hand/i, /J_Bip_R_Hand/i],
  LeftUpLeg:     [/l(?:eft)?[_.]?(?:up[_.]?)?leg\b/i, /(?:thigh|upper[_.]?leg)[_.]?l\b/i, /l(?:eft)?[_.]?thigh\b/i, /CC_Base_L_Thigh/i, /J_Bip_L_UpperLeg/i],
  LeftLeg:       [/l(?:eft)?[_.]?(?:lower[_.]?)?leg\b/i, /(?:shin|lower[_.]?leg|calf)[_.]?l\b/i, /CC_Base_L_Calf/i, /J_Bip_L_LowerLeg/i],
  RightUpLeg:    [/r(?:ight)?[_.]?(?:up[_.]?)?leg\b/i, /(?:thigh|upper[_.]?leg)[_.]?r\b/i, /CC_Base_R_Thigh/i, /J_Bip_R_UpperLeg/i],
  RightLeg:      [/r(?:ight)?[_.]?(?:lower[_.]?)?leg\b/i, /(?:shin|lower[_.]?leg|calf)[_.]?r\b/i, /CC_Base_R_Calf/i, /J_Bip_R_LowerLeg/i],
};

const MATCH_ORDER = [
  'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand',
  'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm',
  'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg',
  'Spine2', 'Spine1', 'Spine', 'Neck', 'Head', 'Hips',
];

function matchBones(nodeNames) {
  const result = {};
  const used = new Set();
  for (const canonical of MATCH_ORDER) {
    const patterns = BONE_ALIASES[canonical];
    if (!patterns) continue;
    // Exact stripped match
    for (const raw of nodeNames) {
      if (used.has(raw)) continue;
      const stripped = raw.replace(/^[A-Za-z0-9_]*[:|]/g, '').replace(/^(Armature_|armature_|Bip0?1[_ ]?|Character[_ ]|Root[_ ])/i, '');
      if (stripped.toLowerCase() === canonical.toLowerCase()) { result[canonical] = raw; used.add(raw); break; }
    }
    if (result[canonical]) continue;
    // Regex match
    for (const raw of nodeNames) {
      if (used.has(raw)) continue;
      const stripped = raw.replace(/^[A-Za-z0-9_]*[:|]/g, '').replace(/^(Armature_|armature_|Bip0?1[_ ]?|Character[_ ]|Root[_ ])/i, '');
      for (const rx of patterns) {
        if (rx.test(raw) || rx.test(stripped)) { result[canonical] = raw; used.add(raw); break; }
      }
      if (result[canonical]) break;
    }
  }
  return result;
}

/* ── Parse GLB ──────────────────────────────────────── */
function parseGLB(filepath) {
  const buf = readFileSync(filepath);
  if (buf.length < 12) return null;
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546C67) return null;
  // JSON chunk
  const chunkLen = buf.readUInt32LE(12);
  const chunkType = buf.readUInt32LE(16);
  if (chunkType !== 0x4E4F534A) return null;
  const json = JSON.parse(buf.slice(20, 20 + chunkLen).toString('utf8'));
  return json;
}

/* ── Build report for one model ─────────────────────── */
function auditModel(filepath, filename) {
  const json = parseGLB(filepath);
  if (!json) return null;
  
  const nodes = json.nodes || [];
  const skins = json.skins || [];
  const animations = json.animations || [];
  
  // Collect joint node indices
  const jointIndices = new Set();
  for (const skin of skins) {
    for (const j of (skin.joints || [])) jointIndices.add(j);
  }
  
  // Build node name → index map
  const nodeMap = {};
  nodes.forEach((n, i) => { if (n.name) nodeMap[n.name] = i; });
  
  // Joint names
  const jointNames = [];
  for (const idx of jointIndices) {
    if (nodes[idx]?.name) jointNames.push(nodes[idx].name);
  }
  
  // Map to canonical bones
  const canonMap = matchBones(jointNames);
  
  // Get rest transforms for canonical bones
  const restPoses = {};
  for (const [canonical, rawName] of Object.entries(canonMap)) {
    const idx = nodeMap[rawName];
    if (idx === undefined) continue;
    const node = nodes[idx];
    const rot = node.rotation || [0, 0, 0, 1]; // quaternion
    const trans = node.translation || [0, 0, 0];
    restPoses[canonical] = {
      rawName,
      quat: rot.map(v => +v.toFixed(4)),
      euler: quatToEuler(rot),
      pos: trans.map(v => +v.toFixed(4)),
    };
  }
  
  // Check animations for body tracks
  const bodyPattern = /arm|shoulder|shldr|clavicle|hand|forearm|hip|spine|chest|neck|head|leg|thigh|pelvis/i;
  let hasBodyAnims = false;
  let animTrackCount = 0;
  for (const anim of animations) {
    for (const ch of (anim.channels || [])) {
      animTrackCount++;
      const targetNode = ch.target?.node;
      if (targetNode !== undefined && nodes[targetNode]?.name) {
        if (bodyPattern.test(nodes[targetNode].name)) hasBodyAnims = true;
      }
    }
  }
  
  // Morph count
  let morphCount = 0;
  for (const mesh of (json.meshes || [])) {
    for (const prim of (mesh.primitives || [])) {
      if (prim.targets) morphCount += prim.targets.length;
    }
  }
  
  // Detect T-pose from arm rest rotations
  const leftArmEuler = restPoses.LeftArm?.euler;
  const rightArmEuler = restPoses.RightArm?.euler;
  let poseType = 'unknown';
  if (leftArmEuler && rightArmEuler) {
    const lz = Math.abs(leftArmEuler.z);
    const rz = Math.abs(rightArmEuler.z);
    const lx = Math.abs(leftArmEuler.x);
    const rx = Math.abs(rightArmEuler.x);
    // Check if most arm rotation is on Z (Mixamo-like) or X (other formats) or already down
    if (lz < 0.3 && rz < 0.3 && lx < 0.3 && rx < 0.3) poseType = 'T-pose';
    else if (lz > 0.6 || rz > 0.6) poseType = 'relaxed-Z';
    else if (lx > 0.6 || rx > 0.6) poseType = 'relaxed-X';
    else poseType = 'A-pose';
  }
  
  // Detect which axis the arm bones use for lowering
  // Look at which euler component has the largest rest value
  let armAxis = 'z'; // default Mixamo
  if (leftArmEuler) {
    const absX = Math.abs(leftArmEuler.x);
    const absY = Math.abs(leftArmEuler.y);
    const absZ = Math.abs(leftArmEuler.z);
    if (absX > absZ && absX > absY) armAxis = 'x';
    else if (absY > absZ && absY > absX) armAxis = 'y';
  }
  
  // Get node hierarchy depth for scale estimation
  let maxDepth = 0;
  function getDepth(nodeIdx, depth) {
    if (depth > maxDepth) maxDepth = depth;
    const children = nodes[nodeIdx]?.children || [];
    for (const c of children) getDepth(c, depth + 1);
  }
  if (json.scenes?.[0]?.nodes) {
    for (const n of json.scenes[0].nodes) getDepth(n, 0);
  }
  
  return {
    filename,
    boneCount: jointIndices.size,
    canonicalBones: Object.keys(canonMap),
    missingBones: MATCH_ORDER.filter(b => !canonMap[b]),
    poseType,
    armAxis,
    hasBodyAnims,
    animCount: animations.length,
    animTrackCount,
    morphCount,
    maxDepth,
    restPoses,
  };
}

/* ── Main ───────────────────────────────────────────── */
const files = readdirSync(DIR).filter(f => f.endsWith('.glb')).sort();
console.log(`Auditing ${files.length} models...\n`);

const results = [];
for (const f of files) {
  const r = auditModel(join(DIR, f), f);
  if (!r) { console.log(`SKIP ${f} — not valid GLB`); continue; }
  results.push(r);
  
  console.log(`═══════════════════════════════════════════`);
  console.log(`MODEL: ${f}`);
  console.log(`  Bones: ${r.boneCount}, Morphs: ${r.morphCount}, Anims: ${r.animCount} (${r.animTrackCount} tracks)`);
  console.log(`  Pose: ${r.poseType}, Arm axis: ${r.armAxis}, Body anims: ${r.hasBodyAnims}`);
  console.log(`  Canonical: ${r.canonicalBones.join(', ')}`);
  if (r.missingBones.length) console.log(`  Missing: ${r.missingBones.join(', ')}`);
  
  // Print rest poses for key bones
  for (const key of ['Hips', 'Spine', 'Head', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftUpLeg', 'RightUpLeg']) {
    const rp = r.restPoses[key];
    if (rp) {
      console.log(`  ${key}: "${rp.rawName}" euler=(${rp.euler.x}, ${rp.euler.y}, ${rp.euler.z}) pos=(${rp.pos.join(', ')})`);
    }
  }
}

// ── Output summary as JSON for profile building ──
const profileData = results.map(r => ({
  file: r.filename,
  pose: r.poseType,
  armAxis: r.armAxis,
  hasBodyAnims: r.hasBodyAnims,
  missing: r.missingBones,
  morphs: r.morphCount,
  leftArm: r.restPoses.LeftArm?.euler || null,
  rightArm: r.restPoses.RightArm?.euler || null,
  leftForeArm: r.restPoses.LeftForeArm?.euler || null,
  rightForeArm: r.restPoses.RightForeArm?.euler || null,
  hips: r.restPoses.Hips?.euler || null,
  head: r.restPoses.Head?.euler || null,
}));
writeFileSync('scripts/bone-audit-results.json', JSON.stringify(profileData, null, 2));
console.log(`\n✅ Saved detailed results to scripts/bone-audit-results.json`);
