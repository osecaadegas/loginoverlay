const imageFiles = [
  "ChatGPT Image Sep 11, 2026, 04_05_16 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_09_41 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_11_02 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_12_06 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_13_41 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_14_38 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_15_42 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_16_34 AM.png",
  "ChatGPT Image Sep 28, 2026, 08_21_05 AM.png",
  "ChatGPT Image Sep 28, 2026, 08_21_23 AM.png",
  "ChatGPT Image Sep 28, 2026, 08_22_53 AM.png",
  "ChatGPT Image Sep 28, 2026, 08_27_07 AM.png",
  "DeWatermark.ai_1742924273687.png",
  "ai-generated-black-casino-background-with-copy-space-free-photo.jpg",
  "b2651115-4ddb-4c3c-9b39-e6fea44e1e67.jpeg",
  "background.png",
  "black-prism-concept-ai-generated.jpg",
  "dribbble-particle-wave.gif",
  "image.png",
  "neonbrick.png",
  "wmremove-transformed (1).jpeg",
];

const videoFiles = [
  "700 F 535601524 S Kh Gd Em Wb 1 Ow 8 Lx P Ll N 7 N 9 Tj Ug NZ Xc 3 I ST (online-video-cutter.com).mp4",
  "Abstract Neon Colored Pink And Blue Liquid Motion Light Effect Animation This Trippy Psychedelic Motion Background Is Full Hd And Looping Free Video.mp4",
  "minimax-h3_a_Create_a_seamless_lo.mp4",
  "wan2.6-i2v_b_Create_a_seamless_lo.mp4",
];

const makeLibrary = (files, type, labelPrefix) => Object.freeze(
  files.map((file, index) => Object.freeze({
    label: `${labelPrefix} ${index + 1}`,
    type,
    url: encodeURI(`/backgrounds/${file}`),
  })),
);

// Keep published URLs stable when adding media to these libraries.
export const BACKGROUND_IMAGE_LIBRARY = makeLibrary(imageFiles, "image", "Background");
export const BACKGROUND_VIDEO_LIBRARY = makeLibrary(videoFiles, "video", "Video background");

// Kept for existing imports and saved-editor regression tests.
export const BACKGROUND_LIBRARY = BACKGROUND_IMAGE_LIBRARY;
