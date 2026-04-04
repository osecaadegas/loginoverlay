import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * AvatarThumbnail — Renders a single snapshot of a GLB model as an image.
 * Uses ONE shared offscreen WebGLRenderer (not a Canvas per card).
 * Captures a frame, stores as data URL, then disposes the scene.
 */

// ── Shared offscreen renderer (created once, reused for all thumbnails) ──
let _renderer = null;
const _cache = new Map(); // url → dataUrl
const _queue = []; // pending render callbacks
let _processing = false;

function getRenderer() {
  if (!_renderer) {
    _renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    _renderer.setSize(160, 160);
    _renderer.setPixelRatio(1);
    _renderer.setClearColor(0x000000, 0);
    _renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  return _renderer;
}

function processQueue() {
  if (_processing || _queue.length === 0) return;
  _processing = true;
  const { url, resolve } = _queue.shift();

  if (_cache.has(url)) {
    resolve(_cache.get(url));
    _processing = false;
    setTimeout(processQueue, 0);
    return;
  }

  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      try {
        const renderer = getRenderer();
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        const dir = new THREE.DirectionalLight(0xffffff, 1.2);
        dir.position.set(2, 3, 2);
        scene.add(dir);
        const fill = new THREE.DirectionalLight(0x8b5cf6, 0.4);
        fill.position.set(-1, 1, -1);
        scene.add(fill);

        const model = gltf.scene;
        scene.add(model);

        // Play first animation briefly to avoid T-pose
        if (gltf.animations?.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          const action = mixer.clipAction(gltf.animations[0]);
          action.play();
          mixer.update(0.5);
        }

        // Auto-frame
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let dist = maxDim / (2 * Math.tan(fov / 2));
        dist *= 1.35;
        const lookY = center.y + size.y * 0.12;
        camera.position.set(dist * 0.3, lookY, dist);
        camera.lookAt(center.x, lookY, center.z);
        camera.updateProjectionMatrix();

        // Render
        renderer.render(scene, camera);
        const dataUrl = renderer.domElement.toDataURL('image/png');
        _cache.set(url, dataUrl);

        // Dispose
        model.traverse(child => {
          if (child.isMesh) {
            child.geometry?.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
              else child.material.dispose();
            }
          }
        });
        scene.clear();

        resolve(dataUrl);
      } catch {
        resolve(null);
      }
      _processing = false;
      // Small delay between renders to avoid blocking UI
      setTimeout(processQueue, 50);
    },
    undefined,
    () => {
      resolve(null);
      _processing = false;
      setTimeout(processQueue, 50);
    }
  );
}

function renderThumbnail(url) {
  return new Promise(resolve => {
    if (_cache.has(url)) { resolve(_cache.get(url)); return; }
    _queue.push({ url, resolve });
    processQueue();
  });
}

export default function AvatarThumbnail({ url, size = 80, onClick, selected, accentColor }) {
  const [thumb, setThumb] = useState(() => _cache.get(url) || null);
  const [loading, setLoading] = useState(!_cache.has(url));

  useEffect(() => {
    if (_cache.has(url)) { setThumb(_cache.get(url)); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    renderThumbnail(url).then(data => {
      if (!cancelled) { setThumb(data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
        border: selected ? `2px solid ${accentColor || '#9146FF'}` : '2px solid rgba(255,255,255,0.08)',
        background: selected ? `${accentColor || '#9146FF'}15` : 'rgba(0,0,0,0.4)',
        transition: 'all 0.2s',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {thumb ? (
        <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
      ) : (
        <div style={{
          fontSize: loading ? 11 : 28, color: '#64748b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%',
        }}>
          {loading ? (
            <div style={{
              width: 18, height: 18, border: '2px solid rgba(255,255,255,0.1)',
              borderTop: `2px solid ${accentColor || '#9146FF'}`, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          ) : '🧍'}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
