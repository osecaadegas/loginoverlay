import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const server = await createServer({
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const registryModule = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js');
  const materialModule = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/v2/materialGenerators.js');
  const colorModule = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/v2/colorUtils.js');
  const resolverModule = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/v2/appearanceResolver.js');
  const appearanceModel = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/appearanceModel.js');
  const editorSchema = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/editorSchema.js');

  const registryResult = registryModule.validateWidgetAppearanceRegistry();
  assert.equal(registryResult.valid, true, `registry should validate: ${registryResult.errors.join(', ')}`);
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('bh_stats'), true, 'BH Stats is a V2 pilot');
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('bonus_hunt'), true, 'Bonus Hunt is a V2 pilot');
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('slot_requests'), true, 'Slot Requests is migrated to V2');
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('giveaway'), true, 'Giveaway is migrated to V2');
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('spotify_now_playing'), true, 'Spotify is enabled for style-by-style V2 migration');
  assert.ok(registryModule.getWidgetAppearanceCapability('bonus_hunt').elements.slotRow, 'bonus hunt declares real slot row element');
  assert.ok(registryModule.getWidgetAppearanceCapability('slot_requests').elements.requestCard, 'slot requests declares request row element');
  assert.ok(registryModule.getWidgetAppearanceCapability('giveaway').elements.winnerArea, 'giveaway declares winner area element');
  assert.ok(registryModule.getWidgetAppearanceCapability('spotify_now_playing').elements.albumArt, 'Spotify declares album art as an editable element');
  assert.ok(registryModule.getWidgetStyleOptionsForQuickEditor('bonus_hunt').some(style => style.id === 'v12_classic_sr'), 'Bonus Hunt exposes style-specific Quick Editor options');
  assert.ok(registryModule.getWidgetStyleOptionsForQuickEditor('slot_requests').some(style => style.id === 'v2_card_stack'), 'Slot Requests exposes card-stack style option');
  assert.ok(registryModule.getWidgetStyleOptionsForQuickEditor('giveaway').some(style => style.id === 'v4'), 'Giveaway exposes minimal style option');
  assert.ok(registryModule.getWidgetStyleOptionsForQuickEditor('spotify_now_playing').some(style => style.id === 'mini_player'), 'Spotify exposes mini-player style option');
  assert.ok(registryModule.getWidgetStyleOptionsForQuickEditor('spotify_now_playing').some(style => style.id === 'compact_bar'), 'Spotify exposes compact-bar style option');
  ['wave', 'neon', 'metal', 'vinyl'].forEach(styleId => {
    assert.ok(registryModule.getWidgetStyleOptionsForQuickEditor('spotify_now_playing').some(style => style.id === styleId), `Spotify exposes ${styleId} style option`);
  });
  assert.equal(registryModule.styleSupportsQuickCapability('slot_requests', 'v1_minimal', 'carouselSpeed'), false, 'Slot Requests list style hides carousel speed');
  assert.equal(registryModule.styleSupportsQuickCapability('slot_requests', 'v2_card_stack', 'carouselSpeed'), true, 'Slot Requests card-stack style exposes carousel speed');
  assert.equal(registryModule.styleSupportsQuickCapability('slot_requests', 'v1_minimal', 'imageVisibility'), false, 'Slot Requests list style hides unsupported image visibility');
  assert.equal(registryModule.styleSupportsQuickCapability('slot_requests', 'v2_card_stack', 'imageFit'), false, 'Slot Requests card-stack hides unsupported image fit');
  assert.equal(registryModule.styleSupportsQuickCapability('slot_requests', 'v3_compact', 'imageSize'), false, 'Slot Requests compact overlay hides unsupported image size');
  assert.equal(registryModule.styleSupportsQuickCapability('slot_requests', 'v3_compact_editable', 'imageSize'), true, 'Slot Requests editable compact exposes image size');
  const slotRequestsMinimalImageControls = registryModule.getWidgetStyleQuickControls('slot_requests', 'v1_minimal', 'slotImage');
  assert.ok(slotRequestsMinimalImageControls.includes('imageShape'), 'Slot Requests list slot image exposes supported image shape');
  assert.ok(!slotRequestsMinimalImageControls.includes('imageVisibility'), 'Slot Requests list slot image hides unsupported visibility');
  assert.ok(!slotRequestsMinimalImageControls.includes('imageSize'), 'Slot Requests list slot image hides unsupported size');
  assert.ok(!slotRequestsMinimalImageControls.includes('imageFit'), 'Slot Requests list slot image hides unsupported fit');
  const slotRequestsCardImageControls = registryModule.getWidgetStyleQuickControls('slot_requests', 'v2_card_stack', 'slotImage');
  assert.ok(slotRequestsCardImageControls.includes('imageShape'), 'Slot Requests card-stack slot image exposes supported image shape');
  assert.ok(!slotRequestsCardImageControls.includes('imageVisibility'), 'Slot Requests card-stack slot image hides unsupported visibility');
  assert.ok(!slotRequestsCardImageControls.includes('imageFit'), 'Slot Requests card-stack slot image hides unsupported fit');
  const slotRequestsEditableImageControls = registryModule.getWidgetStyleQuickControls('slot_requests', 'v3_compact_editable', 'slotImage');
  assert.ok(slotRequestsEditableImageControls.includes('imageVisibility'), 'Slot Requests editable compact slot image exposes visibility');
  assert.ok(slotRequestsEditableImageControls.includes('imageSize'), 'Slot Requests editable compact slot image exposes size');
  assert.ok(slotRequestsEditableImageControls.includes('imageFit'), 'Slot Requests editable compact slot image exposes fit');
  assert.ok(!registryModule.getWidgetStyleQuickControls('slot_requests', 'v3_compact_editable', 'slotTitle').includes('imageSize'), 'Slot Requests editable compact text hides image controls');
  assert.equal(registryModule.styleSupportsQuickCapability('giveaway', 'v4', 'containers'), false, 'Giveaway minimal style hides container controls');
  assert.equal(registryModule.styleSupportsQuickCapability('giveaway', 'v4', 'animations'), false, 'Quick Editor hides unimplemented animation controls');
  assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', 'album_card', 'fonts'), true, 'Spotify album-card exposes typography controls');
  assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', 'album_card', 'imageSize'), true, 'Spotify album-card exposes album-art size controls');
  assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', 'album_card', 'progressBar'), false, 'Spotify album-card hides unrelated progress controls');
  assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', 'album_card', 'carouselSpeed'), false, 'Spotify album-card hides unrelated carousel controls');
  assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', 'glass', 'fonts'), true, 'Spotify glass exposes typography controls');
  assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', 'glass', 'imageSize'), true, 'Spotify glass exposes album-art size controls');
  assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', 'glass', 'progressBar'), false, 'Spotify glass hides unrelated progress controls');
  assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', 'glass', 'carouselSpeed'), false, 'Spotify glass hides unrelated carousel controls');
  ['wave', 'neon', 'metal', 'vinyl'].forEach(styleId => {
    assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', styleId, 'fonts'), true, `Spotify ${styleId} exposes typography controls`);
    assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', styleId, 'imageSize'), true, `Spotify ${styleId} exposes album-art size controls`);
    assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', styleId, 'progressBar'), false, `Spotify ${styleId} hides unrelated progress controls`);
    assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', styleId, 'carouselSpeed'), false, `Spotify ${styleId} hides unrelated carousel controls`);
  });
  assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', 'mini_player', 'imageSize'), true, 'Spotify mini-player exposes album-art size controls');
  assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', 'mini_player', 'carouselSpeed'), false, 'Spotify mini-player hides unrelated carousel controls');
  assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', 'compact_bar', 'progressBar'), true, 'Spotify compact-bar exposes progress controls');
  assert.equal(registryModule.styleSupportsQuickCapability('spotify_now_playing', 'compact_bar', 'carouselSpeed'), false, 'Spotify compact-bar hides unrelated carousel controls');
  const spotifyContainerQuickControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'mini_player', 'container');
  assert.ok(spotifyContainerQuickControls.includes('fontFamily'), 'Spotify mini-player container exposes font family');
  assert.ok(spotifyContainerQuickControls.includes('animationSpeed'), 'Spotify mini-player container exposes equalizer animation speed');
  assert.ok(!spotifyContainerQuickControls.includes('imageSize'), 'Spotify mini-player container hides image-only controls');
  assert.ok(!spotifyContainerQuickControls.includes('carouselSpeed'), 'Spotify mini-player container hides carousel controls');
  const spotifyAlbumArtQuickControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'mini_player', 'albumArt');
  assert.ok(spotifyAlbumArtQuickControls.includes('imageSize'), 'Spotify album art exposes image size');
  assert.ok(spotifyAlbumArtQuickControls.includes('imageFit'), 'Spotify album art exposes image fit');
  assert.ok(spotifyAlbumArtQuickControls.includes('imageVisibility'), 'Spotify album art exposes image visibility');
  assert.ok(!spotifyAlbumArtQuickControls.includes('fontFamily'), 'Spotify album art hides typography controls');
  const spotifyTitleQuickControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'mini_player', 'trackTitle');
  assert.ok(spotifyTitleQuickControls.includes('fontFamily'), 'Spotify track title exposes text controls');
  assert.ok(!spotifyTitleQuickControls.includes('imageSize'), 'Spotify track title hides image controls');
  const spotifyEqualizerQuickControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'mini_player', 'equalizer');
  assert.ok(spotifyEqualizerQuickControls.includes('animationSpeed'), 'Spotify equalizer exposes animation speed');
  assert.ok(!spotifyEqualizerQuickControls.includes('imageSize'), 'Spotify equalizer hides image controls');
  const spotifyCompactProgressControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'compact_bar', 'progressBar');
  assert.ok(spotifyCompactProgressControls.includes('primaryColor'), 'Spotify compact-bar progress exposes primary color');
  assert.ok(spotifyCompactProgressControls.includes('accentColor'), 'Spotify compact-bar progress exposes accent color');
  assert.ok(spotifyCompactProgressControls.includes('shape'), 'Spotify compact-bar progress exposes shape controls');
  assert.ok(!spotifyCompactProgressControls.includes('imageSize'), 'Spotify compact-bar progress hides image controls');
  const spotifyCompactTimeControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'compact_bar', 'timeLabel');
  assert.ok(spotifyCompactTimeControls.includes('fontFamily'), 'Spotify compact-bar time label exposes text controls');
  assert.ok(!spotifyCompactTimeControls.includes('imageSize'), 'Spotify compact-bar time label hides image controls');
  const spotifyCompactAlbumControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'compact_bar', 'albumArt');
  assert.ok(spotifyCompactAlbumControls.includes('imageVisibility'), 'Spotify compact-bar album art exposes visibility');
  assert.ok(!spotifyCompactAlbumControls.includes('fontFamily'), 'Spotify compact-bar album art hides typography controls');
  const spotifyCompactEqualizerControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'compact_bar', 'equalizer');
  assert.ok(spotifyCompactEqualizerControls.includes('animationSpeed'), 'Spotify compact-bar equalizer exposes animation speed');
  assert.ok(!spotifyCompactEqualizerControls.includes('imageSize'), 'Spotify compact-bar equalizer hides image controls');
  const spotifyAlbumContainerControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'album_card', 'container');
  assert.ok(spotifyAlbumContainerControls.includes('fontFamily'), 'Spotify album-card container exposes font family');
  assert.ok(spotifyAlbumContainerControls.includes('animationSpeed'), 'Spotify album-card container exposes playback pulse speed');
  assert.ok(!spotifyAlbumContainerControls.includes('imageSize'), 'Spotify album-card container hides image-only controls');
  assert.ok(!spotifyAlbumContainerControls.includes('progressBar'), 'Spotify album-card container hides progress controls');
  const spotifyAlbumArtControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'album_card', 'albumArt');
  assert.ok(spotifyAlbumArtControls.includes('imageSize'), 'Spotify album-card album art exposes image size');
  assert.ok(spotifyAlbumArtControls.includes('imageFit'), 'Spotify album-card album art exposes image fit');
  assert.ok(spotifyAlbumArtControls.includes('imageVisibility'), 'Spotify album-card album art exposes visibility');
  assert.ok(!spotifyAlbumArtControls.includes('fontFamily'), 'Spotify album-card album art hides typography controls');
  const spotifyAlbumTitleControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'album_card', 'trackTitle');
  assert.ok(spotifyAlbumTitleControls.includes('fontFamily'), 'Spotify album-card title exposes text controls');
  assert.ok(!spotifyAlbumTitleControls.includes('imageSize'), 'Spotify album-card title hides image controls');
  const spotifyGlassContainerControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'glass', 'container');
  assert.ok(spotifyGlassContainerControls.includes('fontFamily'), 'Spotify glass container exposes font family');
  assert.ok(spotifyGlassContainerControls.includes('animationSpeed'), 'Spotify glass container exposes playback pulse speed');
  assert.ok(!spotifyGlassContainerControls.includes('imageSize'), 'Spotify glass container hides image-only controls');
  assert.ok(!spotifyGlassContainerControls.includes('progressBar'), 'Spotify glass container hides progress controls');
  const spotifyGlassArtControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'glass', 'albumArt');
  assert.ok(spotifyGlassArtControls.includes('imageSize'), 'Spotify glass album art exposes image size');
  assert.ok(spotifyGlassArtControls.includes('imageFit'), 'Spotify glass album art exposes image fit');
  assert.ok(spotifyGlassArtControls.includes('imageVisibility'), 'Spotify glass album art exposes visibility');
  assert.ok(!spotifyGlassArtControls.includes('fontFamily'), 'Spotify glass album art hides typography controls');
  const spotifyGlassTitleControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'glass', 'trackTitle');
  assert.ok(spotifyGlassTitleControls.includes('fontFamily'), 'Spotify glass title exposes text controls');
  assert.ok(!spotifyGlassTitleControls.includes('imageSize'), 'Spotify glass title hides image controls');
  for (const styleId of ['wave', 'neon', 'metal', 'vinyl']) {
    const controls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', styleId, 'container');
    assert.ok(controls.includes('fontFamily'), `Spotify ${styleId} container exposes font family`);
    assert.ok(controls.includes('animationSpeed'), `Spotify ${styleId} container exposes animation speed`);
    assert.ok(!controls.includes('imageSize'), `Spotify ${styleId} container hides image-only controls`);
    assert.ok(!controls.includes('progressBar'), `Spotify ${styleId} container hides progress controls`);
    const albumControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', styleId, 'albumArt');
    assert.ok(albumControls.includes('imageSize'), `Spotify ${styleId} album art exposes image size`);
    assert.ok(albumControls.includes('imageFit'), `Spotify ${styleId} album art exposes image fit`);
    assert.ok(albumControls.includes('imageVisibility'), `Spotify ${styleId} album art exposes visibility`);
    assert.ok(!albumControls.includes('fontFamily'), `Spotify ${styleId} album art hides typography controls`);
  }
  const spotifyWaveformControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'wave', 'waveform');
  assert.ok(spotifyWaveformControls.includes('animationSpeed'), 'Spotify wave waveform exposes animation speed');
  const spotifyVinylRecordControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'vinyl', 'vinylRecord');
  assert.ok(spotifyVinylRecordControls.includes('animationSpeed'), 'Spotify vinyl record exposes spin speed');
  assert.ok(registryModule.getWidgetStyleElements('bonus_hunt', 'v3').some(element => element.id === 'slotCarouselContainer'), 'Bonus Hunt flip-card style has carousel-specific elements');
  assert.ok(!registryModule.getWidgetStyleElements('bonus_hunt', 'v3').some(element => element.id === 'slotRow'), 'Bonus Hunt flip-card style hides list-only row elements');

  assert.ok(materialModule.MATERIAL_IDS.includes('original'), 'Original material is available for baseline widgets');
  const originalTokens = materialModule.generateAppearanceTokens({
    material: 'original',
    primaryColor: '#14d8d8',
  }, registryModule.getWidgetAppearanceCapability('bonus_hunt'));
  assert.equal(originalTokens.material, 'original', 'Original token material is preserved');
  assert.equal(originalTokens.isOriginalBaseline, true, 'Original material marks the widget baseline');
  assert.deepEqual(resolverModule.buildWidgetV2CssVars(originalTokens), {}, 'Original material emits no generic CSS variables');

  for (const material of materialModule.MATERIAL_IDS.filter(item => item !== 'original')) {
    const tokens = materialModule.generateAppearanceTokens({
      material,
      primaryColor: material === 'metallic' ? '#f5b301' : '#14d8d8',
      accentColor: '#8b5cf6',
      useAccentColor: material === 'gradient',
      shape: 'rounded',
      density: 'standard',
      textSize: 'standard',
      scale: 1,
    }, registryModule.getWidgetAppearanceCapability('bh_stats'));
    assert.equal(tokens.material, material, `${material} token material is preserved`);
    assert.ok(tokens.colors.text, `${material} provides readable text`);
    assert.ok(tokens.colors.surface !== undefined, `${material} provides surface token`);
    assert.ok(tokens.validation.some(item => item.code === 'valid' || item.code === 'low-contrast'), `${material} reports contrast validation`);
  }

  const metallicGold = materialModule.generateMetallicTokens({
    primaryColor: '#f5b301',
    shape: 'rounded',
  });
  assert.ok(String(metallicGold.colors.surface).includes('linear-gradient'), 'metallic gold uses reflective gradient surface');
  assert.ok(colorModule.getContrastRatio(metallicGold.colors.surfaceReference, metallicGold.colors.text) >= 4.5, 'metallic gold text is readable');

  const glassCyan = materialModule.generateGlassTokens({ primaryColor: '#14d8d8' });
  assert.ok(glassCyan.materialTokens.blurStrength > 0, 'glass cyan exposes safe blur token');
  assert.ok(colorModule.getContrastRatio(glassCyan.colors.surfaceReference, glassCyan.colors.text) >= 4.5, 'glass cyan text is readable');

  const neonGreen = materialModule.generateNeonTokens({ primaryColor: '#22c55e' });
  assert.ok(neonGreen.materialTokens.glowIntensity > 0, 'neon green exposes controlled glow');
  assert.ok(colorModule.getContrastRatio(neonGreen.colors.surfaceReference, neonGreen.colors.text) >= 4.5, 'neon green contrast stays safe');

  const normalized = materialModule.normalizeSimpleAppearanceV2({ material: 'fake', primaryColor: 'nope', scale: 9 });
  assert.equal(normalized.material, 'matte', 'invalid material falls back');
  assert.equal(normalized.primaryColor, '#14d8d8', 'invalid color falls back');
  assert.equal(normalized.scale, 1.5, 'scale clamps to safe max');
  assert.equal(materialModule.normalizeSimpleAppearanceV2({ carouselSpeed: 'fast', carouselAutoplay: false }).carouselAutoplay, false, 'carousel autoplay setting is persisted');
  const fastCarouselTokens = materialModule.generateAppearanceTokens({
    material: 'neon',
    primaryColor: '#14d8d8',
    carouselSpeed: 'fast',
    carouselAutoplay: false,
  }, registryModule.getWidgetAppearanceCapability('slot_requests'));
  assert.equal(fastCarouselTokens.motion.carouselIntervalMs, 1400, 'fast carousel maps to concrete renderer interval');
  assert.equal(fastCarouselTokens.motion.carouselAutoplay, false, 'carousel autoplay token can disable cycling');

  const bhStatsWidget = {
    id: 'stats1',
    widget_type: 'bh_stats',
    width: 320,
    height: 220,
    config: {
      displayStyle: 'default',
      subElements: {},
    },
  };
  const bonusHuntWidget = {
    id: 'hunt1',
    widget_type: 'bonus_hunt',
    width: 400,
    height: 720,
    config: {
      displayStyle: 'v12_classic_sr',
      bonuses: [],
      subElements: {},
    },
  };
  const slotRequestsWidget = {
    id: 'sr1',
    widget_type: 'slot_requests',
    width: 360,
    height: 520,
    config: {
      displayStyle: 'v1_minimal',
      subElements: {},
    },
  };
  const giveawayWidget = {
    id: 'give1',
    widget_type: 'giveaway',
    width: 480,
    height: 360,
    config: {
      displayStyle: 'v1',
      title: 'Giveaway',
      prize: '1000 points',
      keyword: 'join',
      participants: [],
      subElements: {},
    },
  };
  const spotifyWidget = {
    id: 'spotify1',
    widget_type: 'spotify_now_playing',
    width: 460,
    height: 120,
    config: {
      displayStyle: 'album_card',
      manualArtist: 'Streamers Center Radio',
      manualTrack: 'Bonus Hunt Live',
      manualAlbumArt: 'https://example.com/album.jpg',
      subElements: {},
    },
  };
  const spotifyAlbumWidget = {
    ...spotifyWidget,
    id: 'spotifyAlbum1',
    width: 320,
    height: 320,
    config: {
      ...spotifyWidget.config,
      displayStyle: 'album_card',
      subElements: {},
    },
  };
  const spotifyCompactWidget = {
    ...spotifyWidget,
    id: 'spotifyCompact1',
    width: 520,
    height: 92,
    config: {
      ...spotifyWidget.config,
      displayStyle: 'album_card',
      subElements: {},
    },
  };
  const spotifyGlassWidget = {
    ...spotifyWidget,
    id: 'spotifyGlass1',
    width: 430,
    height: 150,
    config: {
      ...spotifyWidget.config,
      displayStyle: 'glass',
      subElements: {},
    },
  };
  const spotifyWaveWidget = {
    ...spotifyWidget,
    id: 'spotifyWave1',
    config: {
      ...spotifyWidget.config,
      displayStyle: 'wave',
      subElements: {},
    },
  };
  const spotifyNeonWidget = {
    ...spotifyWidget,
    id: 'spotifyNeon1',
    config: {
      ...spotifyWidget.config,
      displayStyle: 'neon',
      subElements: {},
    },
  };
  const spotifyMetalWidget = {
    ...spotifyWidget,
    id: 'spotifyMetal1',
    config: {
      ...spotifyWidget.config,
      displayStyle: 'metal',
      subElements: {},
    },
  };
  const spotifyVinylWidget = {
    ...spotifyWidget,
    id: 'spotifyVinyl1',
    config: {
      ...spotifyWidget.config,
      displayStyle: 'vinyl',
      subElements: {},
    },
  };
  const slotRequestsCarouselWidget = {
    ...slotRequestsWidget,
    id: 'sr2',
    config: {
      displayStyle: 'v2_card_stack',
      subElements: {},
    },
  };

  const appearance = {
    widgets: {
      stats1: {
        styles: {
          default: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('bh_stats', {
              material: 'glass',
              primaryColor: '#14d8d8',
              shape: 'rounded',
              density: 'compact',
              textSize: 'large',
              scale: 1.15,
            }),
          },
        },
      },
      hunt1: {
        styles: {
          v12_classic_sr: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('bonus_hunt', {
              material: 'metallic',
              primaryColor: '#f5b301',
              shape: 'rounded',
              density: 'standard',
              textSize: 'standard',
              scale: 1.05,
            }),
          },
        },
      },
      sr1: {
        styles: {
          v1_minimal: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('slot_requests', {
              material: 'glass',
              primaryColor: '#8b5cf6',
              shape: 'rounded',
              density: 'compact',
              textSize: 'standard',
              scale: 1.08,
            }),
          },
        },
      },
      give1: {
        styles: {
          v1: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('giveaway', {
              material: 'neon',
              primaryColor: '#22c55e',
              shape: 'slightly_rounded',
              density: 'standard',
              textSize: 'large',
              scale: 1.1,
            }),
          },
        },
      },
      spotify1: {
        activeStyleId: 'mini_player',
        styles: {
          mini_player: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('spotify_now_playing', {
              material: 'matte',
              primaryColor: '#1DB954',
              shape: 'rounded',
              textSize: 'large',
              imageVisibility: 'hidden',
              imageSize: 'large',
              imageFit: 'contain',
              animationSpeed: 'fast',
            }),
          },
        },
      },
      spotifyAlbum1: {
        activeStyleId: 'album_card',
        styles: {
          album_card: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('spotify_now_playing', {
              material: 'metallic',
              primaryColor: '#ff4fa3',
              shape: 'square',
              textSize: 'large',
              imageVisibility: 'show',
              imageSize: 'large',
              imageFit: 'contain',
              animationSpeed: 'fast',
            }),
          },
        },
      },
      spotifyCompact1: {
        activeStyleId: 'compact_bar',
        styles: {
          compact_bar: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('spotify_now_playing', {
              material: 'glass',
              primaryColor: '#00d4c8',
              shape: 'pill',
              textSize: 'small',
              imageVisibility: 'show',
              imageSize: 'small',
              imageFit: 'cover',
              animationSpeed: 'slow',
            }),
          },
        },
      },
      spotifyGlass1: {
        activeStyleId: 'glass',
        styles: {
          glass: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('spotify_now_playing', {
              material: 'glass',
              primaryColor: '#38bdf8',
              shape: 'rounded',
              textSize: 'large',
              imageVisibility: 'show',
              imageSize: 'large',
              imageFit: 'contain',
              animationSpeed: 'fast',
            }),
          },
        },
      },
      spotifyWave1: {
        activeStyleId: 'wave',
        styles: {
          wave: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('spotify_now_playing', {
              material: 'matte',
              primaryColor: '#06b6d4',
              shape: 'slightly_rounded',
              textSize: 'large',
              imageVisibility: 'show',
              imageSize: 'large',
              imageFit: 'contain',
              animationSpeed: 'fast',
            }),
          },
        },
      },
      spotifyNeon1: {
        activeStyleId: 'neon',
        styles: {
          neon: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('spotify_now_playing', {
              material: 'neon',
              primaryColor: '#f472b6',
              shape: 'rounded',
              textSize: 'large',
              imageVisibility: 'show',
              imageSize: 'large',
              imageFit: 'cover',
              animationSpeed: 'fast',
              glowStrength: 'strong',
            }),
          },
        },
      },
      spotifyMetal1: {
        activeStyleId: 'metal',
        styles: {
          metal: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('spotify_now_playing', {
              material: 'metallic',
              primaryColor: '#94a3b8',
              shape: 'rounded',
              textSize: 'small',
              imageVisibility: 'hidden',
              imageSize: 'small',
              animationSpeed: 'slow',
            }),
          },
        },
      },
      spotifyVinyl1: {
        activeStyleId: 'vinyl',
        styles: {
          vinyl: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('spotify_now_playing', {
              material: 'glass',
              primaryColor: '#a78bfa',
              shape: 'pill',
              textSize: 'standard',
              scale: 1.2,
              imageVisibility: 'show',
              imageFit: 'contain',
              animationSpeed: 'fast',
            }),
          },
        },
      },
    },
  };
  const carouselAppearance = {
    widgets: {
      sr2: {
        activeStyleId: 'v2_card_stack',
        styles: {
          v2_card_stack: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('slot_requests', {
              material: 'neon',
              primaryColor: '#14d8d8',
              shape: 'rounded',
              density: 'standard',
              textSize: 'standard',
              scale: 1,
              carouselSpeed: 'fast',
              carouselAutoplay: false,
            }),
          },
          v1_minimal: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('slot_requests', {
              material: 'matte',
              primaryColor: '#f97316',
              shape: 'rounded',
              density: 'standard',
              textSize: 'standard',
              scale: 1,
            }),
          },
        },
      },
    },
  };

  const originalAppearance = {
    widgets: {
      hunt1: {
        styles: {
          v12_classic_sr: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('bonus_hunt', {
              material: 'original',
              primaryColor: '#14d8d8',
              shape: 'rounded',
              density: 'standard',
              textSize: 'standard',
              scale: 1,
            }),
          },
        },
      },
    },
  };

  const unstyledHuntConfig = appearanceModel.resolveWidgetAppearanceConfig(bonusHuntWidget, {}, {});
  assert.equal(unstyledHuntConfig.__appearanceV2, undefined, 'No Bonus Hunt appearance record leaves the original widget baseline untouched by V2');

  const originalHuntConfig = appearanceModel.resolveWidgetAppearanceConfig(bonusHuntWidget, originalAppearance, {});
  assert.equal(originalHuntConfig.__appearanceV2.material, 'original', 'Bonus Hunt can explicitly restore Original');
  assert.equal(originalHuntConfig.displayStyle, 'v12_classic_sr', 'Original keeps the selected production renderer');
  assert.equal(originalHuntConfig.headerColor, undefined, 'Original does not inject generic header color');
  assert.equal(originalHuntConfig.cardPadding, undefined, 'Original does not inject generic card padding');
  assert.equal(originalHuntConfig.cardGap, undefined, 'Original does not inject generic card gap');
  assert.equal(originalHuntConfig.subElements.headerContainer?.background, undefined, 'Original does not box the header with generated sub-element surfaces');
  assert.equal(originalHuntConfig.subElements.slotRow?.background, undefined, 'Original does not turn slot rows into generated dashboard cards');
  assert.deepEqual(originalHuntConfig.__appearanceV2Vars, {}, 'Original emits no V2 CSS variable overrides');

  const bonusHuntV12Source = readFileSync(new URL('../src/components/OverlayCenter/widgets/BonusHuntWidgetV12.jsx', import.meta.url), 'utf8');
  assert.ok(bonusHuntV12Source.includes('V12_ORIGINAL_STYLE'), 'Bonus Hunt V12 declares an explicit original baseline');
  assert.ok(!bonusHuntV12Source.includes("c.headerColor || '#1e3a8a'"), 'Bonus Hunt V12 original baseline does not fall back to generic blue header');
  assert.ok(!bonusHuntV12Source.includes("c.listCardColor || '#581c87'"), 'Bonus Hunt V12 original baseline does not fall back to generic purple list cards');
  assert.ok(bonusHuntV12Source.includes('composeV12RootBackground'), 'Bonus Hunt V12 composes safe root backgrounds without invalid rgba alpha suffixes');

  const statsConfig = appearanceModel.resolveWidgetAppearanceConfig(bhStatsWidget, appearance, {});
  assert.equal(statsConfig.__appearanceV2.material, 'glass', 'BH Stats receives V2 material');
  assert.equal(statsConfig.displayStyle, 'glass', 'BH Stats maps glass material to existing renderer style');
  assert.ok(statsConfig.subElements.container.background, 'BH Stats container sub-element is generated');
  assert.equal(statsConfig.subElements.value.fontSize, 21, 'BH Stats large text maps to value font size');
  assert.ok(statsConfig.__appearanceV2Vars['--sc-v2-primary'], 'BH Stats exposes V2 CSS variables');

  const huntConfig = appearanceModel.resolveWidgetAppearanceConfig(bonusHuntWidget, appearance, {});
  assert.equal(huntConfig.__appearanceV2.material, 'metallic', 'Bonus Hunt receives V2 material');
  assert.equal(huntConfig.displayStyle, 'v12_classic_sr', 'Bonus Hunt keeps selected renderer style');
  assert.equal(huntConfig.subElements.headerContainer?.padding, undefined, 'Bonus Hunt material presets do not alter structural header padding');
  assert.equal(huntConfig.subElements.slotRow?.padding, undefined, 'Bonus Hunt material presets do not alter structural slot row padding');
  assert.equal(huntConfig.subElements.slotImage?.height, undefined, 'Bonus Hunt material presets do not alter carousel image dimensions');
  assert.ok(huntConfig.headerColor, 'Bonus Hunt material presets recolor the original surface variables');
  assert.ok(huntConfig.subElements.footerTotalValue.states.success.textColor, 'Bonus Hunt state-specific success style remains explicit');

  const slotRequestsConfig = appearanceModel.resolveWidgetAppearanceConfig(slotRequestsWidget, appearance, {});
  assert.equal(slotRequestsConfig.__appearanceV2.material, 'glass', 'Slot Requests receives V2 material');
  assert.equal(slotRequestsConfig.displayStyle, 'v1_minimal', 'Slot Requests keeps selected renderer style');
  assert.ok(slotRequestsConfig.subElements.requestCard.background, 'Slot Requests request rows receive generated surface');
  assert.ok(slotRequestsConfig.subElements.requestCard.states.playing.accentColor, 'Slot Requests keeps request state colors explicit');
  assert.equal(slotRequestsConfig.subElements.slotImage.imageSize, undefined, 'Slot Requests image size is intentionally unsupported');
  assert.ok(slotRequestsConfig.__appearanceV2.unsupportedProperties.includes('layout.cardStackTransform'), 'Slot Requests records animation-sensitive unsupported transforms');
  const slotRequestsCarouselConfig = appearanceModel.resolveWidgetAppearanceConfig(slotRequestsCarouselWidget, carouselAppearance, {});
  assert.equal(slotRequestsCarouselConfig.displayStyle, 'v2_card_stack', 'selected style switches the real Slot Requests renderer');
  assert.equal(slotRequestsCarouselConfig.__appearanceV2.material, 'neon', 'selected style loads its own saved appearance');
  assert.equal(slotRequestsCarouselConfig.autoSpeed, 1400, 'carousel speed resolves into the real widget config');
  assert.equal(slotRequestsCarouselConfig.carouselAutoplay, false, 'carousel autoplay resolves into the real widget config');
  const slotRequestsListConfig = appearanceModel.resolveWidgetAppearanceConfig(slotRequestsCarouselWidget, carouselAppearance, {}, { styleId: 'v1_minimal' });
  assert.equal(slotRequestsListConfig.displayStyle, 'v1_minimal', 'style settings remain isolated by style id');
  assert.equal(slotRequestsListConfig.__appearanceV2.material, 'matte', 'switching styles restores that style appearance');

  const giveawayConfig = appearanceModel.resolveWidgetAppearanceConfig(giveawayWidget, appearance, {});
  assert.equal(giveawayConfig.__appearanceV2.material, 'neon', 'Giveaway receives V2 material');
  assert.equal(giveawayConfig.displayStyle, 'v1', 'Giveaway keeps selected renderer style');
  assert.ok(giveawayConfig.subElements.keyword.background, 'Giveaway keyword receives generated token mapping');
  assert.ok(giveawayConfig.subElements.statusBadge.states.live.textColor, 'Giveaway live state remains semantic');
  assert.notEqual(giveawayConfig.subElements.statusBadge.states.live.textColor, giveawayConfig.subElements.statusBadge.states.closed.textColor, 'Giveaway live and closed states remain distinguishable');

  const spotifyConfig = appearanceModel.resolveWidgetAppearanceConfig(spotifyWidget, appearance, {});
  assert.equal(spotifyConfig.__appearanceV2.material, 'matte', 'Spotify mini-player receives V2 material');
  assert.equal(spotifyConfig.displayStyle, 'mini_player', 'Spotify mini-player quick style switches the real renderer');
  assert.equal(spotifyConfig.subElements.albumArt.visible, false, 'Spotify mini-player resolves image visibility into album art config');
  assert.ok(spotifyConfig.subElements.albumArt.imageSize > 44, 'Spotify mini-player resolves large album art size');
  assert.equal(spotifyConfig.subElements.albumArt.imageFit, 'contain', 'Spotify mini-player resolves album art fit');
  assert.equal(spotifyConfig.subElements.trackTitle.fontSize, 18, 'Spotify mini-player large text reaches the track title');
  assert.ok(spotifyConfig.subElements.equalizer.animationDuration < 0.4, 'Spotify mini-player fast animation maps to equalizer duration');

  const spotifyAlbumConfig = appearanceModel.resolveWidgetAppearanceConfig(spotifyAlbumWidget, appearance, {});
  assert.equal(spotifyAlbumConfig.__appearanceV2.material, 'metallic', 'Spotify album-card receives V2 material');
  assert.equal(spotifyAlbumConfig.displayStyle, 'album_card', 'Spotify album-card quick style keeps the real renderer');
  assert.equal(spotifyAlbumConfig.subElements.container.radius, 0, 'Spotify album-card resolves square container shape');
  assert.equal(spotifyAlbumConfig.subElements.albumArt.visible, true, 'Spotify album-card keeps album art visible');
  assert.ok(spotifyAlbumConfig.subElements.albumArt.sizePercent > 42, 'Spotify album-card resolves large artwork as a card percentage');
  assert.equal(spotifyAlbumConfig.subElements.albumArt.imageFit, 'contain', 'Spotify album-card resolves album art fit');
  assert.equal(spotifyAlbumConfig.subElements.trackTitle.fontSize, 22, 'Spotify album-card large text reaches the track title');
  assert.ok(spotifyAlbumConfig.subElements.playbackState.animationDuration < 1.5, 'Spotify album-card fast animation maps to playback pulse');

  const spotifyGlassConfig = appearanceModel.resolveWidgetAppearanceConfig(spotifyGlassWidget, appearance, {});
  assert.equal(spotifyGlassConfig.__appearanceV2.material, 'glass', 'Spotify glass receives V2 material');
  assert.equal(spotifyGlassConfig.displayStyle, 'glass', 'Spotify glass quick style switches the real renderer');
  assert.ok(spotifyGlassConfig.subElements.container.backdropBlur > 0, 'Spotify glass resolves frosted backdrop blur');
  assert.equal(spotifyGlassConfig.subElements.albumArt.visible, true, 'Spotify glass keeps album art visible');
  assert.ok(spotifyGlassConfig.subElements.albumArt.imageSize > 72, 'Spotify glass resolves large album art tile');
  assert.equal(spotifyGlassConfig.subElements.albumArt.imageFit, 'contain', 'Spotify glass resolves album art fit');
  assert.equal(spotifyGlassConfig.subElements.trackTitle.fontSize, 20, 'Spotify glass large text reaches the track title');
  assert.ok(spotifyGlassConfig.subElements.playbackState.animationDuration < 1.2, 'Spotify glass fast animation maps to playback pulse');

  const spotifyWaveConfig = appearanceModel.resolveWidgetAppearanceConfig(spotifyWaveWidget, appearance, {});
  assert.equal(spotifyWaveConfig.__appearanceV2.material, 'matte', 'Spotify wave receives V2 material');
  assert.equal(spotifyWaveConfig.displayStyle, 'wave', 'Spotify wave quick style switches the real renderer');
  assert.ok(spotifyWaveConfig.subElements.albumArt.imageSize > 50, 'Spotify wave resolves large album art tile');
  assert.equal(spotifyWaveConfig.subElements.albumArt.imageFit, 'contain', 'Spotify wave resolves album art fit');
  assert.ok(spotifyWaveConfig.subElements.waveform.animationDuration < 0.32, 'Spotify wave fast animation maps to waveform bars');
  assert.ok(spotifyWaveConfig.subElements.equalizer.animationDuration < 0.4, 'Spotify wave fast animation maps to equalizer bars');

  const spotifyNeonConfig = appearanceModel.resolveWidgetAppearanceConfig(spotifyNeonWidget, appearance, {});
  assert.equal(spotifyNeonConfig.__appearanceV2.material, 'neon', 'Spotify neon receives V2 material');
  assert.equal(spotifyNeonConfig.displayStyle, 'neon', 'Spotify neon quick style switches the real renderer');
  assert.ok(spotifyNeonConfig.subElements.albumArt.imageSize > 56, 'Spotify neon resolves large album art tile');
  assert.equal(spotifyNeonConfig.subElements.albumArt.borderColor, '#f472b6', 'Spotify neon maps primary color to album border');
  assert.ok(spotifyNeonConfig.subElements.playbackState.animationDuration < 1.1, 'Spotify neon fast animation maps to playback state');

  const spotifyMetalConfig = appearanceModel.resolveWidgetAppearanceConfig(spotifyMetalWidget, appearance, {});
  assert.equal(spotifyMetalConfig.__appearanceV2.material, 'metallic', 'Spotify metal receives V2 material');
  assert.equal(spotifyMetalConfig.displayStyle, 'metal', 'Spotify metal quick style switches the real renderer');
  assert.equal(spotifyMetalConfig.subElements.albumArt.visible, false, 'Spotify metal resolves hidden album art');
  assert.ok(spotifyMetalConfig.subElements.albumArt.imageSize < 52, 'Spotify metal resolves small album art tile');
  assert.ok(spotifyMetalConfig.subElements.equalizer.animationDuration > 0.4, 'Spotify metal slow animation maps to equalizer');

  const spotifyVinylConfig = appearanceModel.resolveWidgetAppearanceConfig(spotifyVinylWidget, appearance, {});
  assert.equal(spotifyVinylConfig.__appearanceV2.material, 'glass', 'Spotify vinyl receives V2 material');
  assert.equal(spotifyVinylConfig.displayStyle, 'vinyl', 'Spotify vinyl quick style switches the real renderer');
  assert.ok(spotifyVinylConfig.subElements.vinylRecord.sizePercent > 55, 'Spotify vinyl resolves scaled record size');
  assert.ok(spotifyVinylConfig.subElements.vinylRecord.animationDuration < 3, 'Spotify vinyl fast animation maps to spin speed');
  assert.equal(spotifyVinylConfig.subElements.albumArt.imageFit, 'contain', 'Spotify vinyl resolves center album-art fit');

  const spotifyCompactConfig = appearanceModel.resolveWidgetAppearanceConfig(spotifyCompactWidget, appearance, {});
  assert.equal(spotifyCompactConfig.__appearanceV2.material, 'glass', 'Spotify compact-bar receives V2 material');
  assert.equal(spotifyCompactConfig.displayStyle, 'compact_bar', 'Spotify compact-bar quick style switches the real renderer');
  assert.equal(spotifyCompactConfig.subElements.albumArt.visible, true, 'Spotify compact-bar keeps album art visible');
  assert.ok(spotifyCompactConfig.subElements.albumArt.imageSize < 44, 'Spotify compact-bar resolves small album art size');
  assert.equal(spotifyCompactConfig.subElements.progressBar.fillColor, '#00d4c8', 'Spotify compact-bar maps primary color to progress fill');
  assert.ok(spotifyCompactConfig.subElements.progressBar.background, 'Spotify compact-bar resolves progress background');
  assert.equal(spotifyCompactConfig.subElements.timeLabel.fontSize, 9, 'Spotify compact-bar resolves compact time label text');
  assert.ok(spotifyCompactConfig.subElements.equalizer.animationDuration > 0.35, 'Spotify compact-bar slow animation maps to equalizer duration');

  const legacyAppearance = {
    widgets: {
      stats1: {
        styles: {
          default: {
            appearance: {
              simpleSettings: {
                material: 'neon',
                primaryColor: '#22c55e',
                shape: 'slightly_rounded',
              },
            },
          },
        },
      },
    },
  };
  const migratedConfig = appearanceModel.resolveWidgetAppearanceConfig(bhStatsWidget, legacyAppearance, {});
  assert.equal(migratedConfig.__appearanceV2.material, 'neon', 'legacy simple settings migrate into V2 resolver');
  assert.equal(migratedConfig.borderRadius, 8, 'legacy shape is preserved through migration');

  const overrideConfig = appearanceModel.resolveWidgetAppearanceConfig({
    ...bhStatsWidget,
    config: {
      ...bhStatsWidget.config,
      __appearanceExplicitSubElements: {
        value: { textColor: '#ff00ff' },
      },
    },
  }, appearance, {});
  assert.equal(overrideConfig.subElements.value.textColor, '#ff00ff', 'advanced explicit sub-element overrides generated tokens');

  const giveawayOverride = appearanceModel.resolveWidgetAppearanceConfig({
    ...giveawayWidget,
    config: {
      ...giveawayWidget.config,
      __appearanceExplicitSubElements: {
        keyword: { textColor: '#ff00ff' },
      },
    },
  }, appearance, {});
  assert.equal(giveawayOverride.subElements.keyword.textColor, '#ff00ff', 'Giveaway advanced override wins over generated keyword token');

  const resolvedWidgets = appearanceModel.resolveWidgetsForAppearance([
    bhStatsWidget,
    bonusHuntWidget,
    slotRequestsWidget,
    giveawayWidget,
    spotifyWidget,
    spotifyAlbumWidget,
    spotifyCompactWidget,
    spotifyGlassWidget,
    spotifyWaveWidget,
    spotifyNeonWidget,
    spotifyMetalWidget,
    spotifyVinylWidget,
  ], appearance, {});
  assert.equal(resolvedWidgets[0].config.__appearanceV2.material, 'glass', 'preview/OBS shared resolver resolves simple pilot');
  assert.equal(resolvedWidgets[1].config.__appearanceV2.material, 'metallic', 'preview/OBS shared resolver resolves complex pilot');
  assert.equal(resolvedWidgets[2].config.__appearanceV2.material, 'glass', 'preview/OBS shared resolver resolves Slot Requests');
  assert.equal(resolvedWidgets[3].config.__appearanceV2.material, 'neon', 'preview/OBS shared resolver resolves Giveaway');
  assert.equal(resolvedWidgets[4].config.__appearanceV2.material, 'matte', 'preview/OBS shared resolver resolves Spotify mini-player');
  assert.equal(resolvedWidgets[5].config.__appearanceV2.material, 'metallic', 'preview/OBS shared resolver resolves Spotify album-card');
  assert.equal(resolvedWidgets[6].config.__appearanceV2.material, 'glass', 'preview/OBS shared resolver resolves Spotify compact-bar');
  assert.equal(resolvedWidgets[7].config.__appearanceV2.material, 'glass', 'preview/OBS shared resolver resolves Spotify glass');
  assert.equal(resolvedWidgets[8].config.__appearanceV2.material, 'matte', 'preview/OBS shared resolver resolves Spotify wave');
  assert.equal(resolvedWidgets[9].config.__appearanceV2.material, 'neon', 'preview/OBS shared resolver resolves Spotify neon');
  assert.equal(resolvedWidgets[10].config.__appearanceV2.material, 'metallic', 'preview/OBS shared resolver resolves Spotify metal');
  assert.equal(resolvedWidgets[11].config.__appearanceV2.material, 'glass', 'preview/OBS shared resolver resolves Spotify vinyl');
  assert.notEqual(resolvedWidgets[2].config.bgColor, resolvedWidgets[3].config.bgColor, 'Slot Requests and Giveaway styles do not leak between widgets');

  const bhStatsElements = editorSchema.getWidgetElementSchema('bh_stats');
  const bonusElements = editorSchema.getWidgetElementSchema('bonus_hunt');
  const slotRequestElements = editorSchema.getWidgetElementSchema('slot_requests');
  const giveawayElements = editorSchema.getWidgetElementSchema('giveaway');
  const spotifyElements = editorSchema.getWidgetElementSchema('spotify_now_playing');
  assert.ok(bhStatsElements.some(element => element.id === 'statsCard'), 'Advanced Mode schema for BH Stats comes from V2 registry');
  assert.ok(bonusElements.some(element => element.id === 'slotRow'), 'Advanced Mode schema for Bonus Hunt comes from V2 registry');
  assert.ok(slotRequestElements.some(element => element.id === 'requestCard'), 'Advanced Mode schema for Slot Requests comes from V2 registry');
  assert.ok(giveawayElements.some(element => element.id === 'winnerArea'), 'Advanced Mode schema for Giveaway comes from V2 registry');
  assert.ok(spotifyElements.some(element => element.id === 'albumArt'), 'Advanced Mode schema for Spotify comes from V2 registry');
  assert.ok(spotifyElements.some(element => element.id === 'progressBar'), 'Advanced Mode schema for Spotify compact-bar progress comes from V2 registry');
  assert.ok(spotifyElements.some(element => element.id === 'waveform'), 'Advanced Mode schema for Spotify waveform comes from V2 registry');
  assert.ok(spotifyElements.some(element => element.id === 'vinylRecord'), 'Advanced Mode schema for Spotify vinyl record comes from V2 registry');
  assert.ok(!slotRequestElements.find(element => element.id === 'slotImage')?.controls.includes('imageSize'), 'Slot Requests hides unsafe image-size control');

  console.log('appearance v2 tests passed');
} finally {
  await server.close();
}
