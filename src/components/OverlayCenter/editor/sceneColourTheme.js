import { applyWidgetColourTheme, getSelectedWidgetColourTheme } from './widgetColourThemes.js';
import { createBetterInstance } from './betterWidgetRegistry.jsx';
import { GALACTIC_COMMAND_COMPOSITION, applyGalacticCommandComposition } from './galacticCommandComposition.js';
import { STARTER_STUDIO_COMPOSITION, applyStarterStudioComposition } from './starterStudioComposition.js';
import { STREET_ART_COMPOSITION, applyStreetArtComposition } from './streetArtComposition.js';
import { SOLVERDE_COMPOSITION, applySolverdeComposition } from './solverdeComposition.js';
import { CANDY_COMPOSITION, applyCandyComposition } from './candyComposition.js';
import { VOLCANIC_COMPOSITION, applyVolcanicComposition } from './volcanicComposition.js';
import { ORBITAL_COMPOSITION, applyOrbitalComposition } from './orbitalComposition.js';
import { STREET_ART_TOKENS } from '../../../effects/ThemeEffects/street-art/streetArtTheme.js';

// Palettes without a dedicated reference scene share a complete arrangement.
// The middle stays open for the streamer's game capture.
export const STANDARD_SCENE_COMPOSITION = Object.freeze({
  background: { x: 0, y: 0, width: 1920, height: 1080 },
  navbar: { x: 12, y: 10, width: 1896, height: 72 },
  bonus_hunt: { x: 14, y: 92, width: 360, height: 960 },
  slideshow_frame: { x: 1540, y: 92, width: 364, height: 244 },
  chat: { x: 1540, y: 348, width: 364, height: 374 },
  giveaway: { x: 1540, y: 734, width: 364, height: 180 },
  bets: { x: 1540, y: 926, width: 364, height: 150 },
  rtp_stats: { x: 390, y: 766, width: 1134, height: 66 },
  current_slot: { x: 390, y: 844, width: 1134, height: 208 },
});

const REFERENCE_SCENES = Object.freeze({
  galactic_command: { specs: GALACTIC_COMMAND_COMPOSITION, apply: applyGalacticCommandComposition },
  starter_studio: { specs: STARTER_STUDIO_COMPOSITION, apply: applyStarterStudioComposition },
  street_art: { specs: STREET_ART_COMPOSITION, apply: applyStreetArtComposition },
  solverde: { specs: SOLVERDE_COMPOSITION, apply: applySolverdeComposition },
  candy: { specs: CANDY_COMPOSITION, apply: applyCandyComposition },
  volcanic: { specs: VOLCANIC_COMPOSITION, apply: applyVolcanicComposition },
  orbital: { specs: ORBITAL_COMPOSITION, apply: applyOrbitalComposition },
});

function recolourAll(layout, key) {
  return { ...layout, instances: (layout.instances || []).map(instance => ({
    ...instance,
    config: (() => {
      const config = { ...applyWidgetColourTheme(instance.widgetType, instance.config, key) };
      // A scene replacement must not retain a source-scene role or layout
      // variant that would override the newly selected reference style.
      delete config.streamerOverlay;
      if (instance.widgetType === 'bonus_hunt') config.orientation = 'vertical';
      if (instance.widgetType === 'chat') Object.assign(config, { orientation: 'standard', chatStyle: 'better_chat' });
      if (instance.widgetType === 'current_slot') config.displayStyle = 'immersive_current';
      if (instance.widgetType === 'bets') config.displayStyle = 'better_bets';
      return config;
    })(),
  })) };
}

function standardConfig(instance, geometry) {
  const config = { ...instance.config };
  if (instance.widgetType === 'bonus_hunt') Object.assign(config, {
    displayStyle: 'better_bonus_hunt', orientation: 'mainstream',
    widgetWidth: geometry.width, panelWidth: geometry.width,
    widgetHeight: geometry.height, panelHeight: geometry.height,
  });
  if (instance.widgetType === 'chat') Object.assign(config, {
    orientation: 'standard', chatStyle: 'broadcast_chat',
    width: geometry.width, height: geometry.height,
  });
  if (instance.widgetType === 'bets') config.displayStyle = 'compact_scoreboard';
  if (instance.widgetType === 'rtp_stats') config.barHeight = geometry.height;
  if (instance.widgetType === 'navbar') config.barHeight = geometry.height;
  return config;
}

function applyStandardComposition(layout) {
  return { ...layout, instances: layout.instances.map(instance => {
    const geometry = STANDARD_SCENE_COMPOSITION[instance.widgetType];
    return geometry ? { ...instance, ...geometry, config: standardConfig(instance, geometry), visible: true } : instance;
  }) };
}

function prepareReferenceScene(layout, specs, key) {
  const required = new Set(Array.isArray(specs) ? specs.map(spec => spec.type) : Object.keys(specs));
  required.add('background');
  // Street Art can retain an existing gameplay source without creating an empty one.
  if (key === 'street_art' && layout.instances.some(instance => instance.widgetType === 'slot_window')) required.add('slot_window');
  const primary = [];
  const saved = [];
  const preferred = new Map();
  for (const instance of layout.instances) {
    if (!required.has(instance.widgetType)) continue;
    const current = preferred.get(instance.widgetType);
    if (!current || (current.visible === false && instance.visible !== false)) preferred.set(instance.widgetType, instance);
  }
  for (const instance of layout.instances) {
    if (preferred.get(instance.widgetType) === instance) {
      primary.push({ ...instance, ...(instance.widgetType === 'background'
        ? { x: 0, y: 0, width: 1920, height: 1080 }
        : {}), locked: instance.widgetType === 'background', visible: true });
    } else {
      saved.push({ ...instance, visible: false });
    }
  }
  for (const type of required) {
    if (primary.some(instance => instance.widgetType === type)) continue;
    const created = createBetterInstance(type);
    if (created) primary.push({ ...created, config: applyWidgetColourTheme(type, created.config, key) });
  }
  return { primary, saved };
}

export function getSceneColourTheme(layout) {
  const instances = layout?.instances || [];
  if (!instances.length) return null;
  const first = getSelectedWidgetColourTheme(instances[0].widgetType, instances[0].config);
  const matches = instance => {
    if (getSelectedWidgetColourTheme(instance.widgetType, instance.config) === first) return true;
    // Street Art's Current Slot reference card intentionally uses its own
    // highlight accent while the remaining colours still follow the theme.
    return first === 'street_art' && instance.widgetType === 'current_slot' &&
      instance.config?.displayStyle === 'street_art_card' &&
      instance.config?.accentColor === STREET_ART_TOKENS.highlight &&
      getSelectedWidgetColourTheme('current_slot', {
        ...instance.config, accentColor: STREET_ART_TOKENS.accent,
      }) === first;
  };
  return first && instances.every(matches) ? first : null;
}

// The top-level picker changes the whole scene. Existing IDs and live data
// survive; extras stay hidden so Undo and later theme changes can reuse them.
export function applySceneColourTheme(layout, key) {
  const coloured = recolourAll(layout, key);
  const reference = REFERENCE_SCENES[key];
  if (key === 'galactic_command') {
    const locks = new Map(coloured.instances.map(instance => [instance.instanceId, instance.locked]));
    const composed = reference.apply({ ...coloured, instances: coloured.instances.map(instance => ({
      ...instance, locked: instance.widgetType === 'background',
    })) });
    const expected = new Set(GALACTIC_COMMAND_COMPOSITION.map(spec => `${spec.type}:${spec.role}`));
    const shown = new Set();
    return { ...composed, instances: composed.instances.map(instance => {
      const role = `${instance.widgetType}:${instance.config?.galactic?.role || ''}`;
      const visible = expected.has(role) && !shown.has(role);
      if (visible) shown.add(role);
      return { ...instance, visible, locked: instance.widgetType === 'background' || locks.get(instance.instanceId) === true };
    }) };
  }
  const { primary, saved } = prepareReferenceScene(coloured, reference?.specs || STANDARD_SCENE_COMPOSITION, key);
  const previouslyLocked = new Map(primary.map(instance => [instance.instanceId,
    layout.instances.find(original => original.instanceId === instance.instanceId)?.locked === true,
  ]));
  const composed = reference
    ? reference.apply({ ...coloured, instances: primary })
    : applyStandardComposition({ ...coloured, instances: primary });
  return { ...composed, instances: [
    ...composed.instances.map(instance => ({ ...instance, locked: instance.widgetType === 'background' || previouslyLocked.get(instance.instanceId) === true })),
    ...saved,
  ] };
}
