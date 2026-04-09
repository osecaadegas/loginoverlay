/**
 * clipPlayer.js — AnimationClip-based playback for Mixamo FBX animations
 *
 * Loads FBX files on demand, extracts the AnimationClip, caches it,
 * and plays it on any avatar's skeleton via AnimationMixer.
 *
 * During clip playback, the procedural animation system scales down
 * so the clip has full control of the bones. Transitions use smooth
 * weight blending (fade in/out).
 *
 * Usage:
 *   const player = createClipPlayer(avatarScene);
 *   player.play('taunt');          // async, loads on first use
 *   player.update(dt);             // call every frame
 *   const suppress = player.weight; // 0..1, scale down procedural by (1 - suppress)
 */

import { AnimationMixer, LoopOnce, LoopRepeat } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

/* ── Clip registry ── */
const CLIP_DEFS = {
  capoeira:   { url: '/animations/Capoeira.fbx',                 loop: false, duration: null, category: 'emote' },
  defeated:   { url: '/animations/Defeated.fbx',                  loop: false, duration: null, category: 'reaction' },
  dying:      { url: '/animations/Dying.fbx',                     loop: false, duration: null, category: 'reaction' },
  jumpDown:   { url: '/animations/Jumping Down.fbx',              loop: false, duration: null, category: 'reaction' },
  shovedSpin: { url: '/animations/Shoved Reaction With Spin.fbx', loop: false, duration: null, category: 'reaction' },
  taunt:      { url: '/animations/Taunt.fbx',                     loop: false, duration: null, category: 'emote' },
};

export const CLIP_NAMES = Object.keys(CLIP_DEFS);

// Maps reaction trigger names to clip names for convenience
export const CLIP_REACTION_MAP = {
  capoeira:   'capoeira',
  defeated:   'defeated',
  dying:      'dying',
  jumpDown:   'jumpDown',
  shovedSpin: 'shovedSpin',
  taunt:      'taunt',
};

/* ── Clip cache (shared across all player instances) ── */
const clipCache = new Map();
const loadingPromises = new Map();
let loader = null;

function getLoader() {
  if (!loader) loader = new FBXLoader();
  return loader;
}

/**
 * Load an FBX file, extract & cache its first AnimationClip.
 * Returns null if the file has no animations.
 */
function loadClip(name) {
  if (clipCache.has(name)) return Promise.resolve(clipCache.get(name));
  if (loadingPromises.has(name)) return loadingPromises.get(name);

  const def = CLIP_DEFS[name];
  if (!def) return Promise.resolve(null);

  const promise = new Promise((resolve) => {
    getLoader().load(
      def.url,
      (fbx) => {
        if (fbx.animations?.length > 0) {
          const clip = fbx.animations[0];
          // Strip mixamorig: prefix from track names to match our bone naming
          for (const track of clip.tracks) {
            if (track.name) {
              track.name = track.name.replace(/mixamorig:/g, '');
            }
          }
          clip.name = name;
          clipCache.set(name, clip);
          console.log(`[ClipPlayer] Loaded "${name}" — ${clip.tracks.length} tracks, ${clip.duration.toFixed(2)}s`);
          resolve(clip);
        } else {
          console.warn(`[ClipPlayer] "${name}" has no animations`);
          resolve(null);
        }
        loadingPromises.delete(name);
      },
      undefined,
      (err) => {
        console.error(`[ClipPlayer] Failed to load "${name}":`, err);
        loadingPromises.delete(name);
        resolve(null);
      }
    );
  });

  loadingPromises.set(name, promise);
  return promise;
}

/**
 * Create a clip player bound to a specific scene (avatar).
 * The mixer drives bones on that scene's skeleton.
 *
 * @param {Object3D} scene — the avatar's root scene object
 */
export function createClipPlayer(scene) {
  const mixer = new AnimationMixer(scene);
  let activeAction = null;
  let activeClipName = null;
  let weight = 0;          // current blend weight (0 = procedural, 1 = clip)
  let fadingOut = false;
  let fadingIn = false;
  const FADE_IN_SPEED = 6;   // ~0.17s fade in
  const FADE_OUT_SPEED = 4;  // ~0.25s fade out

  function _onFinished() {
    fadingOut = true;
    fadingIn = false;
  }

  return {
    /** Whether a clip is currently active (playing or fading) */
    get isPlaying() { return activeAction !== null; },

    /** Current blend weight 0..1. Procedural should scale by (1 - weight). */
    get weight() { return weight; },

    /** Name of the currently playing clip */
    get currentClip() { return activeClipName; },

    /**
     * Play a clip by name. Loads on first use.
     * If a clip is already playing, crossfades to the new one.
     *
     * @param {string} clipName — key from CLIP_DEFS
     * @param {Object} [options]
     * @param {boolean} [options.loop=false] — loop the clip
     */
    async play(clipName, options = {}) {
      const clip = await loadClip(clipName);
      if (!clip) return;

      // Stop current action
      if (activeAction) {
        activeAction.stop();
        mixer.removeEventListener('finished', _onFinished);
      }

      const def = CLIP_DEFS[clipName] || {};
      const shouldLoop = options.loop ?? def.loop ?? false;

      const action = mixer.clipAction(clip);
      action.reset();
      action.setLoop(shouldLoop ? LoopRepeat : LoopOnce);
      action.clampWhenFinished = !shouldLoop;
      action.play();

      activeAction = action;
      activeClipName = clipName;
      fadingIn = true;
      fadingOut = false;

      // Auto-fade-out when clip finishes (non-looping)
      if (!shouldLoop) {
        mixer.addEventListener('finished', _onFinished);
      }
    },

    /**
     * Tick every frame. Updates mixer and blend weight.
     * @param {number} dt — seconds
     * @returns {number} current blend weight (0..1)
     */
    update(dt) {
      if (!activeAction) return 0;

      mixer.update(dt);

      if (fadingOut) {
        weight = Math.max(0, weight - dt * FADE_OUT_SPEED);
        if (weight <= 0) {
          activeAction.stop();
          mixer.removeEventListener('finished', _onFinished);
          activeAction = null;
          activeClipName = null;
          fadingOut = false;
          fadingIn = false;
          weight = 0;
        }
      } else if (fadingIn) {
        weight = Math.min(1, weight + dt * FADE_IN_SPEED);
        if (weight >= 1) fadingIn = false;
      }

      return weight;
    },

    /** Force-stop the current clip with fade out */
    stop() {
      if (activeAction) {
        fadingOut = true;
        fadingIn = false;
      }
    },

    /** Hard-stop, no fade */
    kill() {
      if (activeAction) {
        activeAction.stop();
        mixer.removeEventListener('finished', _onFinished);
        activeAction = null;
        activeClipName = null;
        weight = 0;
        fadingOut = false;
        fadingIn = false;
      }
    },

    /** Clean up */
    dispose() {
      this.kill();
      mixer.uncacheRoot(scene);
    },
  };
}
