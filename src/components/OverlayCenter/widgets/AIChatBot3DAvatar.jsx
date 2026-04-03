import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';

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
function AvatarModel({ url, state, accentColor }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef();
  const morphMeshes = useRef([]);
  const blinkTimer = useRef(0);
  const nextBlink = useRef(Math.random() * 4 + 2);
  const breathPhase = useRef(0);
  const swayPhase = useRef(0);
  const mouthPhase = useRef(0);

  // Clone scene for isolation
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    // Ensure materials are cloned
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    morphMeshes.current = findMorphMeshes(clonedScene);
  }, [clonedScene]);

  useFrame((_, delta) => {
    const meshes = morphMeshes.current;
    if (!meshes.length) return;
    const dt = Math.min(delta, 0.1);

    // ── BREATHING ──
    breathPhase.current += dt * 0.8;
    const breathVal = Math.sin(breathPhase.current) * 0.003;
    if (groupRef.current) {
      groupRef.current.position.y = breathVal;
    }

    // ── BODY SWAY ──
    swayPhase.current += dt * 0.3;
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(swayPhase.current) * 0.01;
      groupRef.current.rotation.y = Math.sin(swayPhase.current * 0.7) * 0.015;
    }

    // ── EYE BLINKS ──
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

    // ── STATE: SPEAKING ──
    if (state === 'speaking') {
      mouthPhase.current += dt * 12;
      // Rapid mouth open/close pattern
      const mouthBase = 0.3;
      const mouthVar = Math.sin(mouthPhase.current) * 0.25 + Math.sin(mouthPhase.current * 2.3) * 0.15;
      setMorph(meshes, 'mouthOpen', Math.max(0, mouthBase + mouthVar));
      // Jaw movement
      setMorph(meshes, 'jawOpen', Math.max(0, (mouthBase + mouthVar) * 0.6));
      // Slight smile while talking
      setMorph(meshes, 'mouthSmile', 0.15 + Math.sin(mouthPhase.current * 0.5) * 0.08);
      // Eyebrow movement
      setMorph(meshes, 'browInnerUp', 0.1 + Math.sin(mouthPhase.current * 0.3) * 0.08);
      // Subtle head nod while speaking
      if (groupRef.current) {
        groupRef.current.rotation.x = Math.sin(mouthPhase.current * 0.8) * 0.02;
      }
    }

    // ── STATE: THINKING ──
    else if (state === 'thinking') {
      // Look up and tilt head
      setMorph(meshes, 'mouthOpen', 0);
      setMorph(meshes, 'jawOpen', 0);
      setMorph(meshes, 'browInnerUp', 0.35 + Math.sin(breathPhase.current * 2) * 0.1);
      setMorph(meshes, 'mouthSmile', 0.05);
      if (groupRef.current) {
        groupRef.current.rotation.x = -0.08 + Math.sin(breathPhase.current) * 0.02;
        groupRef.current.rotation.z = 0.06;
      }
    }

    // ── STATE: IDLE ──
    else {
      // Smoothly return to neutral
      const currentMouth = getMorphValue(meshes, 'mouthOpen');
      setMorph(meshes, 'mouthOpen', currentMouth * 0.85);
      setMorph(meshes, 'jawOpen', currentMouth * 0.5);
      setMorph(meshes, 'mouthSmile', Math.sin(breathPhase.current * 0.2) * 0.05);
      setMorph(meshes, 'browInnerUp', 0);
      if (groupRef.current) {
        groupRef.current.rotation.x *= 0.9;
      }
      mouthPhase.current = 0;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} scale={1} rotation={[0, Math.PI, 0]} />
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
          <AvatarModel url={avatarUrl} state={state} accentColor={accentColor} />
        </React.Suspense>

        {/* Particles */}
        {showParticles && <FloatingParticles color={accentColor} count={40} />}



        {/* Environment */}
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
