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

/* ── Avatar Model ────────────────────────────────────── */
function AvatarModel({ url, state, accentColor, flipModel }) {
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

  // Clone scene for isolation
  const clonedScene = useMemo(() => {
    // SkeletonUtils.clone properly clones skeleton bindings
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
          // Match common naming: "mixamorig:Hips", "Armature_Hips", "Hips", etc.
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

  // Play built-in animations if they exist (idle, breathing, etc.)
  useEffect(() => {
    if (animations && animations.length > 0 && clonedScene) {
      const mixer = new AnimationMixer(clonedScene);
      mixerRef.current = mixer;
      // Play first animation (usually idle) with low weight so our procedural anim still works
      const clip = animations[0];
      const action = mixer.clipAction(clip);
      action.play();
      return () => { mixer.stopAllAction(); mixer.uncacheRoot(clonedScene); };
    }
  }, [animations, clonedScene]);

  useFrame((_, delta) => {
    const meshes = morphMeshes.current;
    const b = bones.current;
    const dt = Math.min(delta, 0.1);

    // Update built-in animation mixer
    if (mixerRef.current) mixerRef.current.update(dt);

    // ── BREAK T-POSE: Lower arms naturally ──
    if (b.LeftArm && !animations?.length) {
      b.LeftArm.rotation.z = MathUtils.lerp(b.LeftArm.rotation.z, 1.1, dt * 2);
    }
    if (b.RightArm && !animations?.length) {
      b.RightArm.rotation.z = MathUtils.lerp(b.RightArm.rotation.z, -1.1, dt * 2);
    }
    if (b.LeftForeArm && !animations?.length) {
      b.LeftForeArm.rotation.z = MathUtils.lerp(b.LeftForeArm.rotation.z, 0.15, dt * 2);
    }
    if (b.RightForeArm && !animations?.length) {
      b.RightForeArm.rotation.z = MathUtils.lerp(b.RightForeArm.rotation.z, -0.15, dt * 2);
    }

    // ── BREATHING (spine + chest expansion) ──
    breathPhase.current += dt * 0.8;
    const breathVal = Math.sin(breathPhase.current);
    if (b.Spine1) {
      b.Spine1.rotation.x = breathVal * 0.008;
    }
    if (b.Spine2) {
      b.Spine2.rotation.x = breathVal * 0.006;
    }
    // Subtle hips breathing
    if (groupRef.current) {
      groupRef.current.position.y = breathVal * 0.002;
    }

    // ── BODY SWAY (weight shift) ──
    swayPhase.current += dt * 0.3;
    if (b.Hips && !animations?.length) {
      b.Hips.rotation.z = Math.sin(swayPhase.current) * 0.015;
      b.Hips.rotation.y = Math.sin(swayPhase.current * 0.7) * 0.01;
      b.Hips.position.x = Math.sin(swayPhase.current) * 0.003;
    }
    if (b.Spine) {
      b.Spine.rotation.z = Math.sin(swayPhase.current * 0.5 + 0.5) * -0.008;
    }

    // ── IDLE HEAD LOOK-AROUND ──
    lookPhase.current += dt * 0.15;
    idlePhase.current += dt;
    if (b.Head) {
      const lookX = Math.sin(lookPhase.current * 1.3) * 0.04 + Math.sin(lookPhase.current * 0.4) * 0.03;
      const lookY = Math.sin(lookPhase.current) * 0.06 + Math.sin(lookPhase.current * 0.6 + 1) * 0.04;
      if (state === 'idle') {
        b.Head.rotation.y = MathUtils.lerp(b.Head.rotation.y, lookY, dt * 2);
        b.Head.rotation.x = MathUtils.lerp(b.Head.rotation.x, lookX, dt * 2);
      }
    }
    if (b.Neck) {
      const neckY = Math.sin(lookPhase.current * 0.8 + 0.3) * 0.025;
      if (state === 'idle') {
        b.Neck.rotation.y = MathUtils.lerp(b.Neck.rotation.y, neckY, dt * 2);
      }
    }

    // ── SUBTLE ARM/HAND IDLE MOVEMENT ──
    if (!animations?.length) {
      const armSway = Math.sin(idlePhase.current * 0.4) * 0.03;
      if (b.LeftArm) b.LeftArm.rotation.x = armSway;
      if (b.RightArm) b.RightArm.rotation.x = -armSway * 0.7;
      if (b.LeftForeArm) b.LeftForeArm.rotation.y = Math.sin(idlePhase.current * 0.3) * 0.04;
      if (b.RightForeArm) b.RightForeArm.rotation.y = Math.sin(idlePhase.current * 0.35 + 1) * -0.04;
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

    // ── STATE: SPEAKING ──
    if (state === 'speaking') {
      mouthPhase.current += dt * 12;
      const mouthBase = 0.3;
      const mouthVar = Math.sin(mouthPhase.current) * 0.25 + Math.sin(mouthPhase.current * 2.3) * 0.15;
      if (meshes.length) {
        setMorph(meshes, 'mouthOpen', Math.max(0, mouthBase + mouthVar));
        setMorph(meshes, 'jawOpen', Math.max(0, (mouthBase + mouthVar) * 0.6));
        setMorph(meshes, 'mouthSmile', 0.15 + Math.sin(mouthPhase.current * 0.5) * 0.08);
        setMorph(meshes, 'browInnerUp', 0.1 + Math.sin(mouthPhase.current * 0.3) * 0.08);
      }
      // Head nod while speaking
      if (b.Head) {
        b.Head.rotation.x = Math.sin(mouthPhase.current * 0.8) * 0.04;
        b.Head.rotation.y = Math.sin(mouthPhase.current * 0.3) * 0.05;
      }
      // Gesture: subtle shoulder/arm movement while talking
      if (b.LeftShoulder) b.LeftShoulder.rotation.z = Math.sin(mouthPhase.current * 0.5) * 0.02;
      if (b.RightShoulder) b.RightShoulder.rotation.z = Math.sin(mouthPhase.current * 0.4 + 1) * -0.02;
      if (b.Spine2) b.Spine2.rotation.y = Math.sin(mouthPhase.current * 0.25) * 0.015;
    }

    // ── STATE: THINKING ──
    else if (state === 'thinking') {
      if (meshes.length) {
        setMorph(meshes, 'mouthOpen', 0);
        setMorph(meshes, 'jawOpen', 0);
        setMorph(meshes, 'browInnerUp', 0.35 + Math.sin(breathPhase.current * 2) * 0.1);
        setMorph(meshes, 'mouthSmile', 0.05);
      }
      // Look up and tilt head
      if (b.Head) {
        b.Head.rotation.x = MathUtils.lerp(b.Head.rotation.x, -0.12, dt * 3);
        b.Head.rotation.z = MathUtils.lerp(b.Head.rotation.z, 0.08, dt * 3);
        b.Head.rotation.y = Math.sin(breathPhase.current * 0.5) * 0.04;
      }
      // Touch chin gesture
      if (b.RightForeArm && !animations?.length) {
        b.RightForeArm.rotation.x = MathUtils.lerp(b.RightForeArm.rotation.x, -0.8, dt * 2);
        b.RightForeArm.rotation.z = MathUtils.lerp(b.RightForeArm.rotation.z, -0.3, dt * 2);
      }
    }

    // ── STATE: IDLE ── (morph cleanup)
    else {
      if (meshes.length) {
        const currentMouth = getMorphValue(meshes, 'mouthOpen');
        setMorph(meshes, 'mouthOpen', currentMouth * 0.85);
        setMorph(meshes, 'jawOpen', currentMouth * 0.5);
        setMorph(meshes, 'mouthSmile', Math.sin(breathPhase.current * 0.2) * 0.05);
        setMorph(meshes, 'browInnerUp', 0);
      }
      mouthPhase.current = 0;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} scale={1} rotation={[0, flipModel ? Math.PI : 0, 0]} />
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
  state = 'idle', // 'idle' | 'speaking' | 'thinking'
  accentColor = '#9146FF',
  width = 380,
  height = 400,
  bgColor = 'transparent',
  showParticles = true,
  flipModel = false,
  cameraDistance = 2.2,
  cameraHeight = 0.85,
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
          <AvatarModel url={avatarUrl} state={state} accentColor={accentColor} flipModel={flipModel} />
        </React.Suspense>

        {/* Particles */}
        {showParticles && <FloatingParticles color={accentColor} count={40} />}



        {/* Environment */}
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
