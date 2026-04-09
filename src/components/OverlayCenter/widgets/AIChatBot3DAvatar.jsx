import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { useGLTF, Environment, Html } from '@react-three/drei';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { AnimationMixer } from 'three';

import { resolveRig } from './avatar3d/rigMapper';
import { createAnimationController } from './avatar3d/animationController';
import { createNpcBehavior } from './avatar3d/npcBehavior';
import { getModelConfig } from './avatar3d/modelConfigs';

/**
 * AIChatBot3DAvatar — Modular 3D avatar system for streaming overlays
 *
 * Architecture:
 *   modelConfigs.js      → per-model bone/morph/behavior data
 *   rigMapper.js          → resolves bones + morphs from any GLB scene
 *   stateManager.js       → state machine with smooth blend weights
 *   idleBehavior.js       → always-on NPC idle (breathing, blinks, variations)
 *   talkingBehavior.js    → speech animation (3-layer rhythm, visemes, gestures)
 *   reactionSystem.js     → one-shot Twitch reactions (jump, wave, laugh, etc.)
 *   animationController.js → master orchestrator compositing all layers
 */

/* ── Scene processing shared by GLB & FBX ────────────────── */
function processScene(rawScene) {
  let clone;
  try { clone = skeletonClone(rawScene); console.log('[3DAvatar] skeletonClone OK'); }
  catch (e) { clone = rawScene.clone(true); console.warn('[3DAvatar] skeletonClone failed, using scene.clone:', e.message); }
  clone.traverse((child) => {
    if (child.isMesh) {
      console.log('[3DAvatar] Mesh:', child.name, 'type:', child.type,
        'mat:', child.material?.type,
        'map:', !!child.material?.map,
        'UVs:', Object.keys(child.geometry?.attributes || {}).filter(k => k.startsWith('uv')).join(','));
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      const cloned = mats.map(mat => {
        const m = mat.clone();
        const texProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap', 'envMap', 'lightMap', 'specularMap'];
        for (const prop of texProps) { if (mat[prop]) m[prop] = mat[prop]; }
        for (const prop of texProps) {
          if (m[prop]) { m[prop].needsUpdate = true; }
        }
        if (m.map) m.map.colorSpace = 'srgb';
        if (child.geometry?.attributes?.color) m.vertexColors = true;
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
}

/* ── FBX Avatar Model (inner R3F component) ────────────── */
function FBXAvatarModel({ url, state, flipModel, modelScale, breathing, sway, headMove, armMove, gestures, animSpeed, reaction, npcRef }) {
  const fbxScene = useLoader(FBXLoader, url);
  const groupRef = useRef();
  const rigRef = useRef(null);
  const controllerRef = useRef(null);
  const lastReaction = useRef(0);
  const primitiveRef = useRef();
  const processedRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════
  //  FBX PROCESSING PIPELINE (runs once per scene reference)
  //
  //  Order is critical:
  //    1. Strip "mixamorig:" from bone names (PropertyBinding fix)
  //    2. Strip "mixamorig:" from animation track names
  //    3. Fix materials (colorSpace, transparency)
  //    4. Bake embedded animation frame 0 into bone transforms
  //    5. THEN resolve rig (captures baked rest pose, not bind pose)
  //    6. Create animation controller
  //
  //  If rig is resolved before baking, restPose captures T-pose
  //  and all procedural animation offsets are wrong.
  // ═══════════════════════════════════════════════════════════════
  const scene = useMemo(() => {
    // 1. Strip "mixamorig:" prefix from all bone/node names.
    //    The colon confuses Three.js PropertyBinding path parsing.
    fbxScene.traverse((child) => {
      if (child.name && child.name.includes('mixamorig:')) {
        child.name = child.name.replace(/mixamorig:/g, '');
      }
    });

    // 2. Strip prefix from animation track names
    if (fbxScene.animations) {
      for (const clip of fbxScene.animations) {
        for (const track of clip.tracks) {
          if (track.name) {
            track.name = track.name.replace(/mixamorig:/g, '');
          }
        }
      }
    }

    // 3. Fix materials
    fbxScene.traverse((child) => {
      if (child.isMesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => {
          if (m.map) { m.map.colorSpace = 'srgb'; m.map.needsUpdate = true; }
          if (m.transparent && m.opacity === 0) m.opacity = 1;
          m.needsUpdate = true;
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // 4. Bake embedded animation into bone rest transforms.
    //    Mixamo FBX ships with a "Take 001" idle clip. We sample it
    //    at t=0 to set bones into a natural standing pose. Without
    //    this, bones are in bind pose (T-pose) because FBX stores
    //    the bind pose in the skeleton, not the animation frame.
    if (!processedRef.current && fbxScene.animations?.length > 0) {
      processedRef.current = true;
      const mixer = new AnimationMixer(fbxScene);
      const clip = fbxScene.animations[0];
      const action = mixer.clipAction(clip);
      action.play();
      mixer.update(0);     // init bindings (creates PropertyMixer instances)
      mixer.update(1 / 60); // advance one frame to apply all track values

      // CRITICAL: Capture bone transforms BEFORE action.stop()!
      // action.stop() resets PropertyMixer accumulators, reverting bones
      // to bind pose. We capture first, then re-apply after cleanup.
      const bakedTransforms = new Map();
      fbxScene.traverse((child) => {
        if (child.isBone || child.type === 'Bone') {
          bakedTransforms.set(child, {
            rx: child.rotation.x, ry: child.rotation.y, rz: child.rotation.z,
            px: child.position.x, py: child.position.y, pz: child.position.z,
            qx: child.quaternion.x, qy: child.quaternion.y,
            qz: child.quaternion.z, qw: child.quaternion.w,
          });
        }
      });

      action.stop();
      mixer.uncacheRoot(fbxScene);

      // Re-apply baked transforms and store in userData for resolveRig
      for (const [bone, t] of bakedTransforms) {
        bone.quaternion.set(t.qx, t.qy, t.qz, t.qw);
        bone.position.set(t.px, t.py, t.pz);
        bone.userData._bakedRotation = { x: t.rx, y: t.ry, z: t.rz };
        bone.userData._bakedPosition = { x: t.px, y: t.py, z: t.pz };
      }

      console.log('[3DAvatar-FBX] Baked idle frame:', clip.name,
        '| tracks:', clip.tracks.length,
        '| duration:', clip.duration.toFixed(2) + 's',
        '| bones baked:', bakedTransforms.size);

      // Log arm Z values to verify T-pose was broken
      for (const [bone, t] of bakedTransforms) {
        if (bone.name === 'LeftArm' || bone.name === 'RightArm') {
          console.log('[3DAvatar-FBX]', bone.name, 'baked Z:', t.rz.toFixed(4));
        }
      }
    } else if (!processedRef.current) {
      processedRef.current = true;
      console.warn('[3DAvatar-FBX] No animations in FBX — bones stay in bind pose (T-pose).',
        'Re-export from Mixamo with an animation included.');
    }

    return fbxScene;
  }, [fbxScene]);

  // 5. Resolve rig AFTER baking (captures baked rest pose)
  useEffect(() => {
    const rig = resolveRig(scene, url);
    rigRef.current = rig;
    controllerRef.current = createAnimationController();

    // Log diagnostics
    const boneNames = Object.keys(rig.bones);
    console.log('[3DAvatar-FBX] Resolved', boneNames.length, 'bones:', boneNames.join(', '));
    console.log('[3DAvatar-FBX] needsArmDown:', rig.needsArmDown,
      '| LeftArm.z:', rig.restPose.LeftArm?.z?.toFixed(3) ?? 'N/A',
      '| RightArm.z:', rig.restPose.RightArm?.z?.toFixed(3) ?? 'N/A');
  }, [scene, url]);

  useEffect(() => {
    controllerRef.current?.setState(state);
  }, [state]);

  useEffect(() => {
    if (reaction && reaction !== lastReaction.current) {
      lastReaction.current = reaction;
      const rig = rigRef.current;
      if (controllerRef.current && rig) {
        controllerRef.current.triggerReaction('random', rig.behavior);
      }
    }
  }, [reaction]);

  useFrame((_, delta) => {
    const rig = rigRef.current;
    const controller = controllerRef.current;
    if (!rig || !controller) return;
    const dt = Math.min(delta, 0.1);
    if (npcRef?.current) {
      controller.setNpcPose(npcRef.current.pose || 'idle');
    }
    controller.update(dt, rig, { breathing, sway, headMove, armMove, gestures, animSpeed }, groupRef);
    if (primitiveRef.current) {
      const npcFlipNow = npcRef?.current?.flipX ?? false;
      const npcActiveNow = npcRef?.current?.pose && npcRef.current.pose !== 'idle';
      const shouldFlip = npcActiveNow ? npcFlipNow : flipModel;
      primitiveRef.current.rotation.y = shouldFlip ? Math.PI : 0;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive ref={primitiveRef} object={scene} scale={(modelScale || 1) * (getModelConfig(url)?.meta?.scale || 1)} rotation={[0, flipModel ? Math.PI : 0, 0]} />
    </group>
  );
}

/* ── GLB Avatar Model (inner R3F component) ────────────────── */
function AvatarModel({ url, state, flipModel, modelScale, breathing, sway, headMove, armMove, gestures, animSpeed, reaction, npcRef }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef();
  const rigRef = useRef(null);
  const controllerRef = useRef(null);
  const lastReaction = useRef(0);
  const primitiveRef = useRef();

  // Clone scene for isolation, fix missing textures/colors
  const clonedScene = useMemo(() => processScene(scene), [scene]);

  // Resolve rig + create animation controller on scene load
  useEffect(() => {
    const rig = resolveRig(clonedScene, url);
    rigRef.current = rig;
    controllerRef.current = createAnimationController();

    // Immediately snap arms down (before first frame renders)
    if (rig.needsArmDown) {
      const { bones: b, restPose } = rig;
      const rg = (bone, axis) => restPose[bone]?.[axis] ?? 0;
      if (b.LeftArm) b.LeftArm.rotation.z = rg('LeftArm', 'z') + 1.1;
      if (b.RightArm) b.RightArm.rotation.z = rg('RightArm', 'z') - 1.1;
      if (b.LeftForeArm) b.LeftForeArm.rotation.z = rg('LeftForeArm', 'z') + 0.15;
      if (b.RightForeArm) b.RightForeArm.rotation.z = rg('RightForeArm', 'z') - 0.15;
    }

    // Debug logging
    console.log('[3DAvatar] Bones:', Object.keys(rig.bones).join(', ') || 'none');
    console.log('[3DAvatar] Visemes:', rig.hasVisemes);
    console.log('[3DAvatar] T-pose:', rig.needsArmDown);
    console.log('[3DAvatar] LeftArm bone:', rig.bones.LeftArm?.name || 'NOT FOUND');
    console.log('[3DAvatar] RightArm bone:', rig.bones.RightArm?.name || 'NOT FOUND');
    console.log('[3DAvatar] Rest LeftArm.z:', rig.restPose.LeftArm?.z?.toFixed(3) || 'N/A');
    console.log('[3DAvatar] Rest RightArm.z:', rig.restPose.RightArm?.z?.toFixed(3) || 'N/A');
    const allBoneNames = [];
    clonedScene.traverse((c) => { if (c.isBone || c.type === 'Bone') allBoneNames.push(c.name); });
    console.log('[3DAvatar] All scene bones (' + allBoneNames.length + '):', allBoneNames.join(', '));
  }, [clonedScene, url]);

  // NOTE: Built-in GLB animations are NOT played.
  // VRM/VRC models often embed T-pose reference clips that fight
  // the procedural animation system. All animation is fully procedural.

  // Sync state from prop → controller
  useEffect(() => {
    controllerRef.current?.setState(state);
  }, [state]);

  // Trigger reactions
  useEffect(() => {
    if (reaction && reaction !== lastReaction.current) {
      lastReaction.current = reaction;
      const rig = rigRef.current;
      if (controllerRef.current && rig) {
        controllerRef.current.triggerReaction('random', rig.behavior);
      }
    }
  }, [reaction]);

  // Main animation loop
  useFrame((_, delta) => {
    const rig = rigRef.current;
    const controller = controllerRef.current;
    if (!rig || !controller) return;

    const dt = Math.min(delta, 0.1);

    // Sync NPC pose into animation controller
    if (npcRef?.current) {
      controller.setNpcPose(npcRef.current.pose || 'idle');
    }

    // Tick the animation controller (orchestrates all behavior layers)
    controller.update(dt, rig, { breathing, sway, headMove, armMove, gestures, animSpeed }, groupRef);

    // Update model flip every frame (NPC overrides user flip when roaming)
    if (primitiveRef.current) {
      const npcFlipNow = npcRef?.current?.flipX ?? false;
      const npcActiveNow = npcRef?.current?.pose && npcRef.current.pose !== 'idle';
      const shouldFlip = npcActiveNow ? npcFlipNow : flipModel;
      primitiveRef.current.rotation.y = shouldFlip ? Math.PI : 0;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive ref={primitiveRef} object={clonedScene} scale={(modelScale || 1) * (getModelConfig(url)?.meta?.scale || 1)} rotation={[0, flipModel ? Math.PI : 0, 0]} />
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

/* ── Particle effect ─────────────────────────────────── */
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
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
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
  // NPC props
  npcEnabled = false,
  npcSpeed = 120,
  allWidgets = null,
  widgetId = null,
}) {
  const [error, setError] = useState(null);
  const [activeUrl, setActiveUrl] = useState(avatarUrl);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const fadeRef = useRef(null);
  const npcRef = useRef({ pose: 'idle', offsetX: 0, offsetY: 0, flipX: false });
  const npcBehaviorRef = useRef(null);
  const npcRafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const avatarStateRef = useRef(state);

  // Keep state ref in sync
  useEffect(() => { avatarStateRef.current = state; }, [state]);

  // ── NPC behavior system ──
  useEffect(() => {
    if (!npcEnabled) {
      // Reset NPC state when disabled
      npcRef.current = { pose: 'idle', offsetX: 0, offsetY: 0, flipX: false };
      if (npcBehaviorRef.current) {
        npcBehaviorRef.current.reset();
        npcBehaviorRef.current = null;
      }
      if (npcRafRef.current) cancelAnimationFrame(npcRafRef.current);
      return;
    }

    const npc = createNpcBehavior({ homeX: 0, homeY: 0, homeW: width, homeH: height });
    npc.setWalkSpeed(npcSpeed);
    npcBehaviorRef.current = npc;
    lastTimeRef.current = performance.now();

    function tick() {
      const now = performance.now();
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      // Pause NPC roaming when avatar is speaking/thinking (let speech anim play)
      if (avatarStateRef.current !== 'idle') {
        npcRef.current = { pose: 'idle', offsetX: 0, offsetY: 0, flipX: false };
        npc.reset();
        const wrapper = document.getElementById(`npc-wrapper-${widgetId}`);
        if (wrapper) wrapper.style.transform = '';
        npcRafRef.current = requestAnimationFrame(tick);
        return;
      }

      const result = npc.update(dt);
      npcRef.current = result;
      // Apply CSS offset to the wrapper
      const wrapper = document.getElementById(`npc-wrapper-${widgetId}`);
      if (wrapper) {
        wrapper.style.transform = `translate(${result.offsetX}px, ${result.offsetY}px)`;
      }
      npcRafRef.current = requestAnimationFrame(tick);
    }
    npcRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (npcRafRef.current) cancelAnimationFrame(npcRafRef.current);
    };
  }, [npcEnabled, width, height, npcSpeed, widgetId]);

  // ── Feed widget targets to NPC ──
  useEffect(() => {
    if (!npcEnabled || !npcBehaviorRef.current || !allWidgets) return;

    // Find our own widget to know our home position
    const self = allWidgets.find(w => w.id === widgetId);
    if (self) {
      npcBehaviorRef.current.setHome(self.position_x, self.position_y, self.width, self.height);
    }

    // Find notable widgets for the NPC to visit
    const targets = {};
    for (const w of allWidgets) {
      if (w.id === widgetId) continue;
      const t = (w.widget_type || '').toLowerCase();
      if (t.includes('navbar') || t.includes('nav_bar') || t.includes('navigation')) {
        targets.navbar = { x: w.position_x, y: w.position_y, w: w.width, h: w.height };
      }
      if (t.includes('chat') && !t.includes('aichat') && !t.includes('bot')) {
        targets.chat = { x: w.position_x, y: w.position_y, w: w.width, h: w.height };
      }
      // Fallback: if no navbar found, look for any widget near the top
      if (!targets.navbar && w.position_y < 80 && w.width > 400) {
        targets.navbar = { x: w.position_x, y: w.position_y, w: w.width, h: w.height };
      }
    }
    npcBehaviorRef.current.setTargets(targets);
  }, [npcEnabled, allWidgets, widgetId]);

  // Smooth crossfade when avatar URL changes
  useEffect(() => {
    if (avatarUrl === activeUrl) return;
    setFadeOpacity(0);
    if (fadeRef.current) clearTimeout(fadeRef.current);
    fadeRef.current = setTimeout(() => {
      setActiveUrl(avatarUrl);
      setError(null);
      requestAnimationFrame(() => { requestAnimationFrame(() => setFadeOpacity(1)); });
    }, 350);
    return () => { if (fadeRef.current) clearTimeout(fadeRef.current); };
  }, [avatarUrl]);

  if (!activeUrl) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 20 }}>
        Set a 3D Avatar URL in config<br />
        <span style={{ fontSize: 10 }}>Create one free at avaturn.me or download from Sketchfab</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#ef4444', fontSize: 11, textAlign: 'center', padding: 20 }}>
        Failed to load avatar model.<br />
        <span style={{ fontSize: 10, color: '#94a3b8' }}>Check the URL ends in .glb or .fbx</span>
      </div>
    );
  }

  return (
    <div id={npcEnabled ? `npc-wrapper-${widgetId}` : undefined} style={{
      width, height, position: 'relative',
      transition: npcEnabled ? undefined : undefined,
      willChange: npcEnabled ? 'transform' : undefined,
      zIndex: npcEnabled ? 9999 : undefined,
    }}>
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

        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={1.2} castShadow />
        <directionalLight position={[-1, 2, -1]} intensity={0.4} color="#8b5cf6" />
        <pointLight position={[0, 1, 2]} intensity={0.3} color={accentColor} />

        <React.Suspense fallback={
          <Html center>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, whiteSpace: 'nowrap',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>Loading 3D model…</div>
          </Html>
        }>
          {activeUrl.toLowerCase().endsWith('.fbx')
            ? <FBXAvatarModel url={activeUrl} state={state} flipModel={flipModel}
                modelScale={modelScale} breathing={breathing} sway={sway} headMove={headMove}
                armMove={armMove} gestures={gestures} animSpeed={animSpeed} reaction={reaction}
                npcRef={npcEnabled ? npcRef : null} />
            : <AvatarModel url={activeUrl} state={state} flipModel={flipModel}
                modelScale={modelScale} breathing={breathing} sway={sway} headMove={headMove}
                armMove={armMove} gestures={gestures} animSpeed={animSpeed} reaction={reaction}
                npcRef={npcEnabled ? npcRef : null} />
          }
        </React.Suspense>

        {showParticles && <FloatingParticles color={accentColor} count={40} />}
        <Environment preset="city" />
      </Canvas>
    </div>
    </div>
  );
}
