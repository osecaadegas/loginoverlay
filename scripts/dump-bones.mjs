/**
 * Dump all joint bone names for models that have poor canonical bone mapping.
 * This helps us write custom bone maps or improve regex patterns.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const DIR = 'public/avatars';
// Models that need investigation (many missing canonical bones)
const PROBLEM_MODELS = [
  '1126693235709775930.glb',  // ValveBiped - many missing
  '1332881142247193159.glb',  // Skl_Root - ALL missing
  '1711319250230595362.glb',  // Blender - missing LeftArm, LeftLeg
  '2914707689262839002.glb',  // no arm/leg matches
  '3493590446520631963.glb',  // unusual names
  '3640925089614202413.glb',  // Blender - missing LeftArm, LeftLeg
  '4371605353531398331.glb',  // VRM - cross-matching bug
  '4450315755567433536.glb',  // VRM - cross-matching bug  
  '4476170053525632637.glb',  // G_root - many missing
  '5078519759161622804.glb',  // JNT - ALL missing
  '6450060599276401442.glb',  // only head/spine
  '7307638738104714060.glb',  // only head/spine
  '824022961986602005.glb',   // Pelvis_M - only shoulders
  '8558624389089208810.glb',  // joint_ format
  '9101833808108867999.glb',  // only hips + forearms
];

function parseGLB(filepath) {
  const buf = readFileSync(filepath);
  if (buf.length < 12) return null;
  if (buf.readUInt32LE(0) !== 0x46546C67) return null;
  const chunkLen = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== 0x4E4F534A) return null;
  return JSON.parse(buf.slice(20, 20 + chunkLen).toString('utf8'));
}

for (const f of PROBLEM_MODELS) {
  const filepath = join(DIR, f);
  try { readFileSync(filepath); } catch { continue; }
  const json = parseGLB(filepath);
  if (!json) continue;
  
  const nodes = json.nodes || [];
  const skins = json.skins || [];
  const jointIndices = new Set();
  for (const s of skins) for (const j of (s.joints || [])) jointIndices.add(j);
  
  const jointNames = [];
  for (const idx of jointIndices) {
    if (nodes[idx]?.name) jointNames.push(nodes[idx].name);
  }
  
  console.log(`\n=== ${f} (${jointNames.length} joints) ===`);
  // Print in a compact format, grouping by apparent body part
  jointNames.forEach(n => console.log(`  ${n}`));
}
