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
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('rtp_stats'), true, 'RTP Stats Bar is migrated to V2');
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('navbar'), true, 'Navbar is migrated to V2');
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('bonus_hunt'), true, 'Bonus Hunt is a V2 pilot');
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('slot_requests'), true, 'Slot Requests is migrated to V2');
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('giveaway'), true, 'Giveaway is migrated to V2');
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('spotify_now_playing'), true, 'Spotify is enabled for style-by-style V2 migration');
  assert.ok(registryModule.getWidgetAppearanceCapability('bonus_hunt').elements.slotRow, 'bonus hunt declares real slot row element');
  assert.ok(registryModule.getWidgetAppearanceCapability('rtp_stats').elements.rtpValue, 'RTP Stats declares real RTP value element');
  assert.ok(registryModule.getWidgetAppearanceCapability('navbar').elements.displayName, 'Navbar declares display name element');
  assert.ok(registryModule.getWidgetAppearanceCapability('slot_requests').elements.requestCard, 'slot requests declares request row element');
  assert.ok(registryModule.getWidgetAppearanceCapability('giveaway').elements.winnerArea, 'giveaway declares winner area element');
  assert.ok(registryModule.getWidgetAppearanceCapability('spotify_now_playing').elements.albumArt, 'Spotify declares album art as an editable element');
  assert.ok(registryModule.getWidgetStyleOptionsForQuickEditor('bonus_hunt').some(style => style.id === 'v12_classic_sr'), 'Bonus Hunt exposes style-specific Quick Editor options');
  ['v1', 'vertical', 'neon', 'minimal', 'glass'].forEach(styleId => {
    assert.ok(registryModule.getWidgetStyleOptionsForQuickEditor('rtp_stats').some(style => style.id === styleId), `RTP Stats exposes ${styleId} style option`);
  });
  ['v1', 'metallic', 'glass', 'retro'].forEach(styleId => {
    assert.ok(registryModule.getWidgetStyleOptionsForQuickEditor('navbar').some(style => style.id === styleId), `Navbar exposes ${styleId} style option`);
  });
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
  const slotRequestsMinimalAdvancedImage = registryModule.getWidgetStyleElements('slot_requests', 'v1_minimal').find(element => element.id === 'slotImage');
  assert.ok(!slotRequestsMinimalAdvancedImage.controls.includes('imageUrl'), 'Slot Requests list advanced slot image hides unsupported custom URL');
  assert.ok(!slotRequestsMinimalAdvancedImage.controls.includes('imageSize'), 'Slot Requests list advanced slot image hides unsupported size');
  assert.ok(!slotRequestsMinimalAdvancedImage.controls.includes('imageFit'), 'Slot Requests list advanced slot image hides unsupported fit');
  const slotRequestsEditableAdvancedImage = registryModule.getWidgetStyleElements('slot_requests', 'v3_compact_editable').find(element => element.id === 'slotImage');
  assert.ok(slotRequestsEditableAdvancedImage.controls.includes('imageUrl'), 'Slot Requests editable compact advanced slot image exposes custom URL');
  assert.ok(slotRequestsEditableAdvancedImage.controls.includes('imageSize'), 'Slot Requests editable compact advanced slot image exposes size');
  assert.ok(slotRequestsEditableAdvancedImage.controls.includes('imageFit'), 'Slot Requests editable compact advanced slot image exposes fit');
  assert.ok(editorSchema.getElementControlGroups(slotRequestsEditableAdvancedImage, 'advanced').some(group => group.controls.some(control => control.id === 'imageUrl')), 'Slot Requests editable compact right panel renders custom URL control');
  assert.equal(registryModule.styleSupportsQuickCapability('rtp_stats', 'v1', 'fonts'), true, 'RTP Stats classic exposes typography controls');
  assert.equal(registryModule.styleSupportsQuickCapability('rtp_stats', 'v1', 'imageSize'), true, 'RTP Stats classic exposes provider logo size controls');
  assert.equal(registryModule.styleSupportsQuickCapability('rtp_stats', 'neon', 'glowIntensity'), true, 'RTP Stats neon exposes glow controls');
  assert.equal(registryModule.styleSupportsQuickCapability('rtp_stats', 'minimal', 'shadows'), false, 'RTP Stats minimal hides unsupported shadow controls');
  assert.equal(registryModule.styleSupportsQuickCapability('rtp_stats', 'glass', 'glowIntensity'), true, 'RTP Stats glass exposes glow controls');
  const rtpContainerControls = registryModule.getWidgetStyleQuickControls('rtp_stats', 'v1', 'container');
  assert.ok(rtpContainerControls.includes('material'), 'RTP Stats container exposes material');
  assert.ok(rtpContainerControls.includes('fontFamily'), 'RTP Stats container exposes font family');
  assert.ok(rtpContainerControls.includes('barHeight'), 'RTP Stats container exposes bar height');
  assert.ok(rtpContainerControls.includes('maxWidth'), 'RTP Stats container exposes bar width');
  assert.ok(!rtpContainerControls.includes('imageSize'), 'RTP Stats container hides image controls');
  assert.ok(!rtpContainerControls.includes('carouselSpeed'), 'RTP Stats container hides carousel controls');
  const rtpStyleLevelQuickControls = registryModule.getWidgetStyleQuickControls('rtp_stats', 'v1');
  assert.ok(rtpStyleLevelQuickControls.includes('imageSize'), 'RTP Stats simple panel exposes provider logo size at style level');
  assert.ok(rtpStyleLevelQuickControls.includes('imageShape'), 'RTP Stats simple panel exposes provider logo shape at style level');
  assert.ok(rtpStyleLevelQuickControls.includes('imageFit'), 'RTP Stats simple panel exposes provider logo fit at style level');
  const rtpProviderControls = registryModule.getWidgetStyleQuickControls('rtp_stats', 'v1', 'provider');
  assert.ok(rtpProviderControls.includes('imageSize'), 'RTP provider exposes logo size controls');
  assert.ok(rtpProviderControls.includes('imageShape'), 'RTP provider exposes logo shape controls');
  assert.ok(rtpProviderControls.includes('imageFit'), 'RTP provider exposes logo fit controls');
  const rtpProviderAdvanced = editorSchema.getWidgetElementSchema('rtp_stats').find(element => element.id === 'provider');
  assert.ok(rtpProviderAdvanced?.controls?.includes('imageUrl'), 'RTP provider advanced panel exposes custom logo URL');
  assert.ok(rtpProviderAdvanced?.controls?.includes('imageSize'), 'RTP provider advanced panel exposes custom logo size');
  assert.ok(rtpProviderAdvanced?.controls?.includes('imageFit'), 'RTP provider advanced panel exposes custom logo fit');
  assert.ok(rtpProviderAdvanced?.controls?.includes('radius'), 'RTP provider advanced panel exposes custom logo radius');
  const rtpValueControls = registryModule.getWidgetStyleQuickControls('rtp_stats', 'v1', 'rtpValue');
  assert.ok(rtpValueControls.includes('fontFamily'), 'RTP value exposes typography controls');
  assert.ok(rtpValueControls.includes('primaryColor'), 'RTP value exposes color controls');
  assert.ok(!rtpValueControls.includes('imageFit'), 'RTP value hides image fit');
  const rtpMinimalElements = registryModule.getWidgetStyleElements('rtp_stats', 'minimal');
  assert.ok(!rtpMinimalElements.some(element => element.id === 'spinner'), 'RTP minimal hides spinner element controls');
  assert.ok(!rtpMinimalElements.some(element => element.id === 'divider'), 'RTP minimal hides divider element controls');
  assert.equal(registryModule.styleSupportsQuickCapability('navbar', 'v1', 'fonts'), true, 'Navbar classic exposes typography controls');
  assert.equal(registryModule.styleSupportsQuickCapability('navbar', 'v1', 'imageSize'), true, 'Navbar classic exposes image size controls');
  assert.equal(registryModule.styleSupportsQuickCapability('navbar', 'v1', 'imageVisibility'), false, 'Navbar classic hides unsupported image visibility');
  assert.equal(registryModule.styleSupportsQuickCapability('navbar', 'glass', 'glowIntensity'), true, 'Navbar glass exposes glow controls');
  assert.equal(registryModule.styleSupportsQuickCapability('navbar', 'retro', 'carouselSpeed'), false, 'Navbar retro hides carousel controls');
  const navbarContainerControls = registryModule.getWidgetStyleQuickControls('navbar', 'v1', 'container');
  assert.ok(navbarContainerControls.includes('material'), 'Navbar container exposes material');
  assert.ok(navbarContainerControls.includes('fontFamily'), 'Navbar container exposes font family');
  assert.ok(navbarContainerControls.includes('barHeight'), 'Navbar container exposes bar height');
  assert.ok(navbarContainerControls.includes('maxWidth'), 'Navbar container exposes bar width');
  assert.ok(navbarContainerControls.includes('musicDisplayStyle'), 'Navbar container exposes Spotify style');
  assert.ok(!navbarContainerControls.includes('imageSize'), 'Navbar container hides image controls');
  assert.ok(!navbarContainerControls.includes('carouselSpeed'), 'Navbar container hides carousel controls');
  const navbarStyleLevelQuickControls = registryModule.getWidgetStyleQuickControls('navbar', 'v1');
  assert.ok(navbarStyleLevelQuickControls.includes('imageSize'), 'Navbar simple panel exposes image size at style level');
  assert.ok(navbarStyleLevelQuickControls.includes('imageShape'), 'Navbar simple panel exposes image shape at style level');
  assert.ok(navbarStyleLevelQuickControls.includes('imageFit'), 'Navbar simple panel exposes image fit at style level');
  assert.ok(navbarStyleLevelQuickControls.includes('musicDisplayStyle'), 'Navbar simple panel exposes Spotify style at style level');
  const navbarAvatarControls = registryModule.getWidgetStyleQuickControls('navbar', 'v1', 'avatar');
  assert.ok(navbarAvatarControls.includes('imageSize'), 'Navbar avatar exposes image size');
  assert.ok(navbarAvatarControls.includes('imageShape'), 'Navbar avatar exposes image shape');
  assert.ok(navbarAvatarControls.includes('imageFit'), 'Navbar avatar exposes image fit');
  assert.ok(!navbarAvatarControls.includes('imageVisibility'), 'Navbar avatar hides unsupported image visibility');
  assert.ok(!navbarAvatarControls.includes('fontFamily'), 'Navbar avatar hides typography controls');
  const navbarAvatarAdvanced = editorSchema.getWidgetElementSchema('navbar').find(element => element.id === 'avatar');
  assert.ok(navbarAvatarAdvanced?.controls?.includes('imageUrl'), 'Navbar avatar advanced panel exposes image URL');
  assert.ok(navbarAvatarAdvanced?.controls?.includes('imageFit'), 'Navbar avatar advanced panel exposes image fit');
  assert.ok(navbarAvatarAdvanced?.controls?.includes('radius'), 'Navbar avatar advanced panel exposes image radius');
  const navbarNameControls = registryModule.getWidgetStyleQuickControls('navbar', 'v1', 'displayName');
  assert.ok(navbarNameControls.includes('fontFamily'), 'Navbar display name exposes typography controls');
  assert.ok(!navbarNameControls.includes('imageSize'), 'Navbar display name hides image controls');
  const navbarBalanceControls = registryModule.getWidgetStyleQuickControls('navbar', 'v1', 'balance');
  assert.ok(navbarBalanceControls.includes('fontFamily'), 'Navbar balance exposes typography controls');
  assert.ok(navbarBalanceControls.includes('primaryColor'), 'Navbar balance exposes color controls');
  assert.ok(!navbarBalanceControls.includes('imageSize'), 'Navbar balance hides image controls');
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
  const spotifyStyleLevelQuickControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'mini_player');
  assert.ok(spotifyStyleLevelQuickControls.includes('imageSize'), 'Spotify simple panel exposes album-art size at style level');
  assert.ok(spotifyStyleLevelQuickControls.includes('imageShape'), 'Spotify simple panel exposes album-art shape at style level');
  assert.ok(spotifyStyleLevelQuickControls.includes('imageFit'), 'Spotify simple panel exposes album-art fit at style level');
  const spotifyAlbumArtQuickControls = registryModule.getWidgetStyleQuickControls('spotify_now_playing', 'mini_player', 'albumArt');
  assert.ok(spotifyAlbumArtQuickControls.includes('imageSize'), 'Spotify album art exposes image size');
  assert.ok(spotifyAlbumArtQuickControls.includes('imageShape'), 'Spotify album art exposes image shape');
  assert.ok(spotifyAlbumArtQuickControls.includes('imageFit'), 'Spotify album art exposes image fit');
  assert.ok(spotifyAlbumArtQuickControls.includes('imageVisibility'), 'Spotify album art exposes image visibility');
  assert.ok(!spotifyAlbumArtQuickControls.includes('fontFamily'), 'Spotify album art hides typography controls');
  const spotifyAlbumArtAdvanced = editorSchema.getWidgetElementSchema('spotify_now_playing').find(element => element.id === 'albumArt');
  assert.ok(spotifyAlbumArtAdvanced?.controls?.includes('imageUrl'), 'Spotify album art advanced panel exposes image URL');
  assert.ok(spotifyAlbumArtAdvanced?.controls?.includes('imageSize'), 'Spotify album art advanced panel exposes image size');
  assert.ok(spotifyAlbumArtAdvanced?.controls?.includes('imageFit'), 'Spotify album art advanced panel exposes image fit');
  assert.ok(spotifyAlbumArtAdvanced?.controls?.includes('radius'), 'Spotify album art advanced panel exposes rounded corners');
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
  assert.ok(spotifyCompactAlbumControls.includes('imageSize'), 'Spotify compact-bar album art exposes size');
  assert.ok(spotifyCompactAlbumControls.includes('imageShape'), 'Spotify compact-bar album art exposes shape');
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
  assert.ok(spotifyAlbumArtControls.includes('imageShape'), 'Spotify album-card album art exposes image shape');
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
  assert.ok(spotifyGlassArtControls.includes('imageShape'), 'Spotify glass album art exposes image shape');
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
    assert.ok(albumControls.includes('imageShape'), `Spotify ${styleId} album art exposes image shape`);
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
  const rtpStatsWidget = {
    id: 'rtp1',
    widget_type: 'rtp_stats',
    width: 720,
    height: 72,
    config: {
      displayStyle: 'neon',
      previewMode: true,
      subElements: {},
    },
  };
  const navbarWidget = {
    id: 'nav1',
    widget_type: 'navbar',
    width: 1200,
    height: 80,
    config: {
      displayStyle: 'glass',
      streamerName: 'Streamer',
      motto: 'Just Content',
      showAvatar: true,
      showClock: true,
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
      rtp1: {
        styles: {
          neon: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('rtp_stats', {
              material: 'neon',
              primaryColor: '#00ffcc',
              shape: 'pill',
              density: 'compact',
              textSize: 'large',
              scale: 1.04,
              glowStrength: 'strong',
            }),
          },
          glass: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('rtp_stats', {
              material: 'glass',
              primaryColor: '#38bdf8',
              shape: 'rounded',
              density: 'standard',
              textSize: 'standard',
              scale: 1,
            }),
          },
        },
      },
      nav1: {
        styles: {
          glass: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('navbar', {
              material: 'glass',
              primaryColor: '#38bdf8',
              shape: 'pill',
              density: 'standard',
              textSize: 'large',
              scale: 1.05,
              imageSize: 'large',
              imageShape: 'circle',
              imageFit: 'contain',
            }),
          },
          retro: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('navbar', {
              material: 'matte',
              primaryColor: '#ff6b2b',
              shape: 'square',
              density: 'compact',
              textSize: 'small',
              scale: 1,
              imageSize: 'small',
              imageShape: 'square',
              imageFit: 'cover',
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
              imageShape: 'circle',
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
              imageShape: 'square',
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
              imageShape: 'circle',
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
              imageSize: 'large',
              imageShape: 'square',
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

  const rtpConfig = appearanceModel.resolveWidgetAppearanceConfig(rtpStatsWidget, appearance, {});
  assert.equal(rtpConfig.__appearanceV2.material, 'neon', 'RTP Stats receives V2 material');
  assert.equal(rtpConfig.displayStyle, 'neon', 'RTP Stats keeps the selected renderer style');
  assert.ok(rtpConfig.barBgFrom, 'RTP Stats receives generated bar background');
  assert.ok(rtpConfig.borderColor, 'RTP Stats receives generated border color');
  assert.ok(rtpConfig.rtpIconColor, 'RTP Stats maps RTP icon color to widget config');
  assert.ok(rtpConfig.bestWinIconColor, 'RTP Stats maps personal best icon color to widget config');
  assert.ok(rtpConfig.spinnerColor, 'RTP Stats maps spinner color to widget config');
  assert.equal(rtpConfig.subElements.container.radius, rtpConfig.borderRadius, 'RTP Stats container radius mirrors the real CSS variable');
  assert.ok(rtpConfig.barHeight >= 42, 'RTP Stats receives generated bar height');
  assert.ok(rtpConfig.maxWidth >= 280, 'RTP Stats receives generated max width');
  assert.ok(rtpConfig.subElements.provider.imageSize > 0, 'RTP Stats provider receives generated logo size');
  assert.ok(rtpConfig.subElements.provider.imageFit, 'RTP Stats provider receives generated logo fit');
  assert.ok(rtpConfig.subElements.rtpValue.accentColor, 'RTP Stats RTP value receives generated accent');
  assert.ok(rtpConfig.subElements.personalBest.accentColor, 'RTP Stats personal best receives generated accent');
  assert.ok(rtpConfig.subElements.statCard.states.highlight.accentColor, 'RTP Stats keeps highlighted stat state explicit');
  assert.ok(!rtpConfig.__appearanceV2.unsupportedProperties.includes('layout.providerLogoDimensions'), 'RTP Stats provider logo dimensions are now supported');
  assert.ok(!rtpConfig.__appearanceV2.unsupportedProperties.includes('image.imageSize'), 'RTP Stats provider logo size is not reported as unsupported');
  assert.ok(!rtpConfig.__appearanceV2.unsupportedProperties.includes('image.imageFit'), 'RTP Stats provider logo fit is not reported as unsupported');
  const rtpWidgetSource = readFileSync(new URL('../src/components/OverlayCenter/widgets/RtpStatsWidget.jsx', import.meta.url), 'utf8');
  const overlayCssSource = readFileSync(new URL('../src/components/OverlayCenter/OverlayCenter.css', import.meta.url), 'utf8');
  assert.ok(rtpWidgetSource.includes('--rtp-value-rtp-family'), 'RTP Stats renderer maps RTP value font family to CSS');
  assert.ok(rtpWidgetSource.includes('--rtp-value-potential-family'), 'RTP Stats renderer maps max-win font family to CSS');
  assert.ok(rtpWidgetSource.includes('--rtp-value-volatility-family'), 'RTP Stats renderer maps volatility font family to CSS');
  assert.ok(rtpWidgetSource.includes('--rtp-value-bestwin-family'), 'RTP Stats renderer maps personal-best font family to CSS');
  assert.ok(rtpWidgetSource.includes('--rtp-provider-logo-width'), 'RTP Stats renderer maps provider logo width to CSS');
  assert.ok(rtpWidgetSource.includes('--rtp-provider-logo-radius'), 'RTP Stats renderer maps provider logo radius to CSS');
  assert.ok(rtpWidgetSource.includes('--rtp-provider-logo-fit'), 'RTP Stats renderer maps provider logo fit to CSS');
  assert.ok(rtpWidgetSource.includes('providerLogoUrl'), 'RTP Stats renderer supports configured provider logo images');
  assert.ok(rtpWidgetSource.includes('--rtp-bar-height'), 'RTP Stats renderer maps bar height to CSS');
  assert.ok(rtpWidgetSource.includes('--rtp-max-width'), 'RTP Stats renderer maps max width to CSS');
  assert.ok(overlayCssSource.includes('font-family: var(--rtp-value-rtp-family'), 'RTP Stats CSS consumes per-value RTP font family');
  assert.ok(overlayCssSource.includes('font-family: var(--rtp-value-bestwin-family'), 'RTP Stats CSS consumes per-value personal-best font family');
  assert.ok(overlayCssSource.includes('var(--rtp-label-rtp-family'), 'RTP Stats CSS lets value font cascade into RTP label text');
  assert.ok(overlayCssSource.includes('object-fit: var(--rtp-provider-logo-fit'), 'RTP Stats CSS consumes provider logo fit');
  assert.ok(overlayCssSource.includes('border-radius: var(--rtp-provider-logo-radius'), 'RTP Stats CSS consumes provider logo radius');
  assert.ok(overlayCssSource.includes('max-width: var(--rtp-max-width'), 'RTP Stats CSS consumes max width');
  const rtpGlassConfig = appearanceModel.resolveWidgetAppearanceConfig(rtpStatsWidget, appearance, {}, { styleId: 'glass' });
  assert.equal(rtpGlassConfig.displayStyle, 'glass', 'RTP Stats can switch to glass style appearance');
  assert.equal(rtpGlassConfig.__appearanceV2.material, 'glass', 'RTP Stats loads glass style-specific appearance');
  assert.equal(rtpGlassConfig.subElements.provider.label, undefined, 'RTP Stats provider style does not inject non-rendered labels');

  const navbarConfig = appearanceModel.resolveWidgetAppearanceConfig(navbarWidget, appearance, {});
  assert.equal(navbarConfig.__appearanceV2.material, 'glass', 'Navbar receives V2 material');
  assert.equal(navbarConfig.displayStyle, 'glass', 'Navbar keeps the selected renderer style');
  assert.ok(navbarConfig.accentColor, 'Navbar maps accent color to widget config');
  assert.ok(navbarConfig.bgColor, 'Navbar maps background color to widget config');
  assert.ok(navbarConfig.ctaColor, 'Navbar maps sponsor CTA color to widget config');
  assert.ok(navbarConfig.cryptoUpColor, 'Navbar maps crypto positive color to widget config');
  assert.ok(navbarConfig.cryptoDownColor, 'Navbar maps crypto negative color to widget config');
  assert.ok(navbarConfig.barHeight >= 48, 'Navbar receives generated bar height');
  assert.ok(navbarConfig.maxWidth >= 480, 'Navbar receives generated max width');
  assert.equal(navbarConfig.musicDisplayStyle, 'text', 'Navbar receives default Spotify style');
  assert.ok(navbarConfig.subElements.avatar.imageSize > 42, 'Navbar avatar resolves large image size');
  assert.equal(navbarConfig.subElements.avatar.imageFit, 'contain', 'Navbar avatar resolves image fit');
  assert.ok(navbarConfig.subElements.badgeImage.imageSize > 54, 'Navbar badge image resolves large image size');
  assert.ok(navbarConfig.subElements.clock.background, 'Navbar clock receives generated surface');
  assert.ok(navbarConfig.subElements.music.states.connected.accentColor, 'Navbar music connected state remains explicit');
  assert.ok(navbarConfig.subElements.balance.fontFamily, 'Navbar balance receives generated typography');
  assert.ok(navbarConfig.__appearanceV2.unsupportedProperties.includes('layout.sectionOrder'), 'Navbar records section ordering as unsupported');
  const navbarWidgetSource = readFileSync(new URL('../src/components/OverlayCenter/widgets/NavbarWidget.jsx', import.meta.url), 'utf8');
  assert.ok(navbarWidgetSource.includes('containerFontFamily'), 'Navbar renderer maps container font family');
  assert.ok(navbarWidgetSource.includes('musicFontFamily'), 'Navbar renderer maps music font family');
  assert.ok(navbarWidgetSource.includes('cryptoFontFamily'), 'Navbar renderer maps crypto font family');
  assert.ok(navbarWidgetSource.includes('sponsorFontFamily'), 'Navbar renderer maps sponsor font family');
  assert.ok(navbarWidgetSource.includes('balanceFontFamily'), 'Navbar renderer maps balance font family');
  assert.ok(navbarWidgetSource.includes('barOuterSized'), 'Navbar renderer applies bar frame sizing');
  assert.ok(navbarWidgetSource.includes('sponsorBorderColor'), 'Navbar renderer maps CTA border controls');
  const navbarRetroConfig = appearanceModel.resolveWidgetAppearanceConfig(navbarWidget, appearance, {}, { styleId: 'retro' });
  assert.equal(navbarRetroConfig.displayStyle, 'retro', 'Navbar can switch to retro style appearance');
  assert.equal(navbarRetroConfig.__appearanceV2.material, 'matte', 'Navbar loads retro style-specific appearance');
  assert.ok(navbarRetroConfig.subElements.avatar.imageSize < navbarConfig.subElements.avatar.imageSize, 'Navbar style isolation preserves image sizes per style');

  const spotifyWidgetSource = readFileSync(new URL('../src/components/OverlayCenter/widgets/SpotifyWidget.jsx', import.meta.url), 'utf8');
  assert.ok(spotifyWidgetSource.includes('spotifyAlbumArtStyle'), 'Spotify renderer centralizes album-art size and radius controls');
  assert.ok(spotifyWidgetSource.includes('spotifyAlbumArtPercent'), 'Spotify renderer supports percentage artwork sizing for album/vinyl styles');
  assert.ok(!spotifyWidgetSource.includes("width: '38%'"), 'Spotify vinyl center art is no longer hardcoded to a fixed size');

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
  assert.equal(spotifyConfig.subElements.albumArt.radius, 999, 'Spotify mini-player resolves round album art shape');
  assert.equal(spotifyConfig.subElements.albumArt.imageFit, 'contain', 'Spotify mini-player resolves album art fit');
  assert.equal(spotifyConfig.subElements.trackTitle.fontSize, 18, 'Spotify mini-player large text reaches the track title');
  assert.ok(spotifyConfig.subElements.equalizer.animationDuration < 0.4, 'Spotify mini-player fast animation maps to equalizer duration');

  const spotifyAlbumConfig = appearanceModel.resolveWidgetAppearanceConfig(spotifyAlbumWidget, appearance, {});
  assert.equal(spotifyAlbumConfig.__appearanceV2.material, 'metallic', 'Spotify album-card receives V2 material');
  assert.equal(spotifyAlbumConfig.displayStyle, 'album_card', 'Spotify album-card quick style keeps the real renderer');
  assert.equal(spotifyAlbumConfig.subElements.container.radius, 0, 'Spotify album-card resolves square container shape');
  assert.equal(spotifyAlbumConfig.subElements.albumArt.visible, true, 'Spotify album-card keeps album art visible');
  assert.ok(spotifyAlbumConfig.subElements.albumArt.sizePercent > 42, 'Spotify album-card resolves large artwork as a card percentage');
  assert.equal(spotifyAlbumConfig.subElements.albumArt.radius, 0, 'Spotify album-card resolves square album art shape');
  assert.equal(spotifyAlbumConfig.subElements.albumArt.imageFit, 'contain', 'Spotify album-card resolves album art fit');
  assert.equal(spotifyAlbumConfig.subElements.trackTitle.fontSize, 22, 'Spotify album-card large text reaches the track title');
  assert.ok(spotifyAlbumConfig.subElements.playbackState.animationDuration < 1.5, 'Spotify album-card fast animation maps to playback pulse');

  const spotifyGlassConfig = appearanceModel.resolveWidgetAppearanceConfig(spotifyGlassWidget, appearance, {});
  assert.equal(spotifyGlassConfig.__appearanceV2.material, 'glass', 'Spotify glass receives V2 material');
  assert.equal(spotifyGlassConfig.displayStyle, 'glass', 'Spotify glass quick style switches the real renderer');
  assert.ok(spotifyGlassConfig.subElements.container.backdropBlur > 0, 'Spotify glass resolves frosted backdrop blur');
  assert.equal(spotifyGlassConfig.subElements.albumArt.visible, true, 'Spotify glass keeps album art visible');
  assert.ok(spotifyGlassConfig.subElements.albumArt.imageSize > 72, 'Spotify glass resolves large album art tile');
  assert.equal(typeof spotifyGlassConfig.subElements.albumArt.radius, 'number', 'Spotify glass resolves album art radius');
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
  assert.ok(spotifyVinylConfig.subElements.albumArt.sizePercent > 38, 'Spotify vinyl resolves center album-art size');
  assert.equal(spotifyVinylConfig.subElements.albumArt.radius, 0, 'Spotify vinyl center album art can be square');
  assert.equal(spotifyVinylConfig.subElements.albumArt.imageFit, 'contain', 'Spotify vinyl resolves center album-art fit');

  const spotifyCompactConfig = appearanceModel.resolveWidgetAppearanceConfig(spotifyCompactWidget, appearance, {});
  assert.equal(spotifyCompactConfig.__appearanceV2.material, 'glass', 'Spotify compact-bar receives V2 material');
  assert.equal(spotifyCompactConfig.displayStyle, 'compact_bar', 'Spotify compact-bar quick style switches the real renderer');
  assert.equal(spotifyCompactConfig.subElements.albumArt.visible, true, 'Spotify compact-bar keeps album art visible');
  assert.ok(spotifyCompactConfig.subElements.albumArt.imageSize < 44, 'Spotify compact-bar resolves small album art size');
  assert.equal(spotifyCompactConfig.subElements.albumArt.radius, 999, 'Spotify compact-bar resolves round album art shape');
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

  const rtpOverrideConfig = appearanceModel.resolveWidgetAppearanceConfig({
    ...rtpStatsWidget,
    config: {
      ...rtpStatsWidget.config,
      __appearanceExplicitSubElements: {
        rtpValue: { fontFamily: 'Orbitron', fontSize: 19, fontWeight: 400 },
        maxWin: { fontFamily: 'Montserrat', fontSize: 17, fontWeight: 800 },
        label: { fontFamily: 'Oxanium', fontSize: 12, fontWeight: 500 },
      },
    },
  }, appearance, {});
  assert.equal(rtpOverrideConfig.subElements.rtpValue.fontFamily, 'Orbitron', 'RTP value explicit font family wins over generated tokens');
  assert.equal(rtpOverrideConfig.subElements.maxWin.fontSize, 17, 'RTP max-win explicit font size wins over generated tokens');
  assert.equal(rtpOverrideConfig.subElements.label.fontWeight, 500, 'RTP label explicit font weight wins over generated tokens');

  const navbarOverrideConfig = appearanceModel.resolveWidgetAppearanceConfig({
    ...navbarWidget,
    config: {
      ...navbarWidget.config,
      __appearanceExplicitSubElements: {
        displayName: { fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 600 },
        music: { fontFamily: 'Poppins', fontSize: 13, fontWeight: 500 },
        sponsor: { fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 700 },
        crypto: { fontFamily: 'Orbitron', fontSize: 14, fontWeight: 800 },
        balance: { fontFamily: 'Oxanium', fontSize: 16, fontWeight: 600 },
        casino: { fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700 },
        clock: { fontFamily: 'Inter', fontSize: 15, fontWeight: 500 },
      },
    },
  }, appearance, {});
  assert.equal(navbarOverrideConfig.subElements.displayName.fontFamily, 'Rajdhani', 'Navbar display name explicit font family wins over generated tokens');
  assert.equal(navbarOverrideConfig.subElements.music.fontFamily, 'Poppins', 'Navbar music explicit font family wins over generated tokens');
  assert.equal(navbarOverrideConfig.subElements.sponsor.fontSize, 12, 'Navbar sponsor explicit font size wins over generated tokens');
  assert.equal(navbarOverrideConfig.subElements.crypto.fontWeight, 800, 'Navbar crypto explicit font weight wins over generated tokens');
  assert.equal(navbarOverrideConfig.subElements.balance.fontFamily, 'Oxanium', 'Navbar balance explicit font family wins over generated tokens');
  assert.equal(navbarOverrideConfig.subElements.clock.fontWeight, 500, 'Navbar clock explicit font weight wins over generated tokens');

  const rtpDimensionConfig = appearanceModel.resolveWidgetAppearanceConfig(rtpStatsWidget, {
    widgets: {
      rtp1: {
        styles: {
          neon: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('rtp_stats', {
              material: 'glass',
              primaryColor: '#14d8d8',
              shape: 'rounded',
              density: 'large',
              barHeight: 72,
              maxWidth: 840,
              imageSize: 'large',
              imageShape: 'circle',
              imageFit: 'cover',
            }),
          },
        },
      },
    },
  }, {});
  assert.equal(rtpDimensionConfig.barHeight, 72, 'RTP Stats simple bar height reaches widget config');
  assert.equal(rtpDimensionConfig.maxWidth, 840, 'RTP Stats simple max width reaches widget config');
  assert.ok(rtpDimensionConfig.subElements.provider.imageSize >= 34, 'RTP Stats simple image size reaches provider logo');
  assert.equal(rtpDimensionConfig.subElements.provider.radius, 999, 'RTP Stats simple image shape reaches provider logo');
  assert.equal(rtpDimensionConfig.subElements.provider.imageFit, 'cover', 'RTP Stats simple image fit reaches provider logo');

  const rtpClientGlassConfig = appearanceModel.resolveWidgetAppearanceConfig(rtpStatsWidget, {
    widgets: {
      rtp1: {
        styles: {
          glass: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('rtp_stats', {
              material: 'metallic',
              primaryColor: '#7c3aed',
              accentColor: '#ef4444',
              useSecondColor: true,
              shape: 'pill',
              density: 'standard',
              fontFamily: 'Rajdhani',
              textSize: 'large',
            }),
          },
        },
      },
    },
  }, {}, { styleId: 'glass' });
  assert.equal(rtpClientGlassConfig.displayStyle, 'glass', 'RTP Stats keeps glass renderer style when material/texture changes');
  assert.equal(rtpClientGlassConfig.__appearanceV2.simple.useAccentColor, true, 'RTP Stats maps Use second colour into V2 accent tokens');
  assert.equal(rtpClientGlassConfig.dividerColor, '#ef4444', 'RTP Stats second colour reaches visible dividers');
  assert.equal(rtpClientGlassConfig.volatilityIconColor, '#ef4444', 'RTP Stats second colour reaches visible stat icons');
  assert.equal(rtpClientGlassConfig.borderRadius, 80, 'RTP Stats rounded-corner control reaches bar radius');
  assert.equal(rtpClientGlassConfig.subElements.rtpValue.fontFamily, 'Rajdhani', 'RTP Stats generated value fonts use selected font');

  const navbarDimensionConfig = appearanceModel.resolveWidgetAppearanceConfig(navbarWidget, {
    widgets: {
      nav1: {
        styles: {
          glass: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('navbar', {
              material: 'metallic',
              primaryColor: '#f59e0b',
              shape: 'pill',
              density: 'standard',
              barHeight: 88,
              maxWidth: 980,
              musicDisplayStyle: 'vinyl',
            }),
          },
        },
      },
    },
  }, {});
  assert.equal(navbarDimensionConfig.barHeight, 88, 'Navbar simple bar height reaches widget config');
  assert.equal(navbarDimensionConfig.maxWidth, 980, 'Navbar simple max width reaches widget config');
  assert.equal(navbarDimensionConfig.musicDisplayStyle, 'vinyl', 'Navbar simple Spotify style reaches widget config');

  const resolvedWidgets = appearanceModel.resolveWidgetsForAppearance([
    bhStatsWidget,
    bonusHuntWidget,
    rtpStatsWidget,
    navbarWidget,
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
  assert.equal(resolvedWidgets[2].config.__appearanceV2.material, 'neon', 'preview/OBS shared resolver resolves RTP Stats');
  assert.equal(resolvedWidgets[3].config.__appearanceV2.material, 'glass', 'preview/OBS shared resolver resolves Navbar');
  assert.equal(resolvedWidgets[4].config.__appearanceV2.material, 'glass', 'preview/OBS shared resolver resolves Slot Requests');
  assert.equal(resolvedWidgets[5].config.__appearanceV2.material, 'neon', 'preview/OBS shared resolver resolves Giveaway');
  assert.equal(resolvedWidgets[6].config.__appearanceV2.material, 'matte', 'preview/OBS shared resolver resolves Spotify mini-player');
  assert.equal(resolvedWidgets[7].config.__appearanceV2.material, 'metallic', 'preview/OBS shared resolver resolves Spotify album-card');
  assert.equal(resolvedWidgets[8].config.__appearanceV2.material, 'glass', 'preview/OBS shared resolver resolves Spotify compact-bar');
  assert.equal(resolvedWidgets[9].config.__appearanceV2.material, 'glass', 'preview/OBS shared resolver resolves Spotify glass');
  assert.equal(resolvedWidgets[10].config.__appearanceV2.material, 'matte', 'preview/OBS shared resolver resolves Spotify wave');
  assert.equal(resolvedWidgets[11].config.__appearanceV2.material, 'neon', 'preview/OBS shared resolver resolves Spotify neon');
  assert.equal(resolvedWidgets[12].config.__appearanceV2.material, 'metallic', 'preview/OBS shared resolver resolves Spotify metal');
  assert.equal(resolvedWidgets[13].config.__appearanceV2.material, 'glass', 'preview/OBS shared resolver resolves Spotify vinyl');
  assert.notEqual(resolvedWidgets[4].config.bgColor, resolvedWidgets[5].config.bgColor, 'Slot Requests and Giveaway styles do not leak between widgets');

  const bhStatsElements = editorSchema.getWidgetElementSchema('bh_stats');
  const rtpStatsElements = editorSchema.getWidgetElementSchema('rtp_stats');
  const navbarElements = editorSchema.getWidgetElementSchema('navbar');
  const bonusElements = editorSchema.getWidgetElementSchema('bonus_hunt');
  const slotRequestElements = editorSchema.getWidgetElementSchema('slot_requests');
  const giveawayElements = editorSchema.getWidgetElementSchema('giveaway');
  const spotifyElements = editorSchema.getWidgetElementSchema('spotify_now_playing');
  assert.ok(bhStatsElements.some(element => element.id === 'statsCard'), 'Advanced Mode schema for BH Stats comes from V2 registry');
  assert.ok(rtpStatsElements.some(element => element.id === 'rtpValue'), 'Advanced Mode schema for RTP Stats comes from V2 registry');
  assert.ok(rtpStatsElements.some(element => element.id === 'personalBest'), 'Advanced Mode schema for RTP Stats personal best comes from V2 registry');
  assert.ok(navbarElements.some(element => element.id === 'displayName'), 'Advanced Mode schema for Navbar display name comes from V2 registry');
  assert.ok(navbarElements.some(element => element.id === 'avatar'), 'Advanced Mode schema for Navbar avatar comes from V2 registry');
  assert.ok(navbarElements.some(element => element.id === 'balance'), 'Advanced Mode schema for Navbar balance comes from V2 registry');
  assert.ok(bonusElements.some(element => element.id === 'slotRow'), 'Advanced Mode schema for Bonus Hunt comes from V2 registry');
  assert.ok(slotRequestElements.some(element => element.id === 'requestCard'), 'Advanced Mode schema for Slot Requests comes from V2 registry');
  assert.ok(giveawayElements.some(element => element.id === 'winnerArea'), 'Advanced Mode schema for Giveaway comes from V2 registry');
  assert.ok(spotifyElements.some(element => element.id === 'albumArt'), 'Advanced Mode schema for Spotify comes from V2 registry');
  assert.ok(spotifyElements.some(element => element.id === 'progressBar'), 'Advanced Mode schema for Spotify compact-bar progress comes from V2 registry');
  assert.ok(spotifyElements.some(element => element.id === 'waveform'), 'Advanced Mode schema for Spotify waveform comes from V2 registry');
  assert.ok(spotifyElements.some(element => element.id === 'vinylRecord'), 'Advanced Mode schema for Spotify vinyl record comes from V2 registry');
  assert.ok(!slotRequestElements.find(element => element.id === 'slotImage')?.controls.includes('imageSize'), 'Slot Requests hides unsafe image-size control');
  assert.ok(!slotRequestElements.find(element => element.id === 'slotImage')?.controls.includes('imageFit'), 'Slot Requests hides unsafe image-fit control');
  assert.ok(!slotRequestElements.find(element => element.id === 'slotImage')?.controls.includes('imageUrl'), 'Slot Requests hides unsafe custom image URL control');

  console.log('appearance v2 tests passed');
} finally {
  await server.close();
}
