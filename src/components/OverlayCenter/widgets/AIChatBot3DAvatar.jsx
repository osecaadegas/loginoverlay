import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, Html } from '@react-three/drei';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { resolveRig } from './avatar3d/rigMapper';
import { createAnimationController } from './avatar3d/animationController';

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

/* ── Avatar Model (inner R3F component) ────────────────── */
function AvatarModel({ url, state, flipModel, modelScale, breathing, sway, headMove, armMove, gestures, animSpeed, reaction }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef();
  const rigRef = useRef(null);
  const controllerRef = useRef(null);
  const lastReaction = useRef(0);

  // Clone scene for isolation, fix missing textures/colors
  const clonedScene = useMemo(() => {
    let clone;
    try { clone = skeletonClone(scene); } catch { clone = scene.clone(true); }
    clone.traverse((child) => {
      if (child.isMesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        const cloned = mats.map(mat => {
          const m = mat.clone();
          const texProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap', 'envMap', 'lightMap', 'specularMap'];
          for (const prop of texProps) { if (mat[prop]) m[prop] = mat[prop]; }
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
  }, [scene]);

  // Resolve rig + create animation controller on scene load
  useEffect(() => {
    const rig = resolveRig(clonedScene, url);
    rigRef.current = rig;
    controllerRef.current = createAnimationController();

    // Debug logging
    console.log('[3DAvatar] Bones:', Object.keys(rig.bones).join(', ') || 'none');
    console.log('[3DAvatar] Visemes:', rig.hasVisemes);
    console.log('[3DAvatar] T-pose:', rig.needsArmDown);
    const allBoneNames = [];
    clonedScene.traverse((c) => { if (c.isBone || c.type === 'Bone') allBoneNames.push(c.name); });
    console.log('[3DAvatar] All bones:', allBoneNames.join(', '));
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

    // Tick the animation controller (orchestrates all behavior layers)
    controller.update(dt, rig, { breathing, sway, headMove, armMove, gestures, animSpeed }, groupRef);
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
}) {
  const [error, setError] = useState(null);
  const [activeUrl, setActiveUrl] = useState(avatarUrl);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const fadeRef = useRef(null);

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
          <AvatarModel url={activeUrl} state={state} flipModel={flipModel}
            modelScale={modelScale} breathing={breathing} sway={sway} headMove={headMove}
            armMove={armMove} gestures={gestures} animSpeed={animSpeed} reaction={reaction} />
        </React.Suspense>

        {showParticles && <FloatingParticles color={accentColor} count={40} />}
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
