import { useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Tiny inline 3D preview of a GLB avatar for the config panel gallery.
 * Renders a single frame, auto-frames the model, slowly rotates.
 */

function AutoFrameModel({ url }) {
  const { scene, animations } = useGLTF(url);
  const groupRef = useRef();
  const { camera } = useThree();
  const mixerRef = useRef(null);

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(child => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.frustumCulled = false;
      }
    });
    return c;
  }, [scene]);

  // Auto-frame: compute bounding box and position camera to fit
  useEffect(() => {
    if (!cloned) return;
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let dist = maxDim / (2 * Math.tan(fov / 2));
    dist *= 1.3; // padding

    // Position camera at chest height, looking at center
    const lookY = center.y + size.y * 0.15;
    camera.position.set(0, lookY, dist);
    camera.lookAt(center.x, lookY, center.z);
    camera.updateProjectionMatrix();

    // Center the model
    if (groupRef.current) {
      groupRef.current.position.set(-center.x, -box.min.y, -center.z);
    }
  }, [cloned, camera]);

  // Play first animation if exists (for animated models)
  useEffect(() => {
    if (animations?.length > 0 && cloned) {
      const mixer = new THREE.AnimationMixer(cloned);
      mixerRef.current = mixer;
      const action = mixer.clipAction(animations[0]);
      action.play();
      // Advance to a nice frame (not T-pose)
      mixer.update(0.5);
      return () => { mixer.stopAllAction(); mixer.uncacheRoot(cloned); };
    }
  }, [animations, cloned]);

  // Slow rotation
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
    if (mixerRef.current) mixerRef.current.update(delta);
  });

  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  );
}

function FallbackBox() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#4a5568" />
    </mesh>
  );
}

export default function AvatarThumbnail({ url, size = 80, onClick, selected, accentColor }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
        border: selected ? `2px solid ${accentColor || '#9146FF'}` : '2px solid rgba(255,255,255,0.08)',
        background: selected ? `${accentColor || '#9146FF'}15` : 'rgba(0,0,0,0.4)',
        transition: 'all 0.2s',
        flexShrink: 0,
      }}
    >
      <Canvas
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        dpr={[1, 1.5]}
        camera={{ fov: 35, near: 0.01, far: 100 }}
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
        frameloop="always"
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 3, 2]} intensity={1.2} />
        <directionalLight position={[-1, 1, -1]} intensity={0.4} />
        <Suspense fallback={<FallbackBox />}>
          <AutoFrameModel url={url} />
        </Suspense>
      </Canvas>
    </div>
  );
}
