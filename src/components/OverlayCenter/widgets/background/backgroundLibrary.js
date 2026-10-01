const imageFiles = [
  "ChatGPT Image Sep 11, 2026, 04_05_16 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_09_41 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_11_02 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_12_06 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_13_41 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_14_38 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_15_42 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_16_34 AM.png",
  ["Artic/ChatGPT Image Sep 28, 2026, 08_21_05 AM.png", "Arctic background 1"],
  ["Artic/ChatGPT Image Sep 28, 2026, 08_21_23 AM.png", "Arctic background 2"],
  ["Artic/ChatGPT Image Sep 28, 2026, 08_22_53 AM.png", "Arctic background 3"],
  ["Artic/ChatGPT Image Sep 28, 2026, 08_27_07 AM.png", "Arctic background 4"],
  "DeWatermark.ai_1742924273687.png",
  "b2651115-4ddb-4c3c-9b39-e6fea44e1e67.jpeg",
  "background.png",
  "black-prism-concept-ai-generated.jpg",
  "dribbble-particle-wave.gif",
  "image.png",
  "neonbrick.png",
  "wmremove-transformed (1).jpeg",
];

const videoFiles = [
  ["OldRome/happyhorse-1.1_a_can_you_make_the_ref.mp4", "Old Rome video 1"],
  ["OldRome/R2V [@happyhorse-1.1_a_c_10-01_06_45_46.mp4", "Old Rome video 2"],
  "700 F 535601524 S Kh Gd Em Wb 1 Ow 8 Lx P Ll N 7 N 9 Tj Ug NZ Xc 3 I ST (online-video-cutter.com).mp4",
  "Abstract Neon Colored Pink And Blue Liquid Motion Light Effect Animation This Trippy Psychedelic Motion Background Is Full Hd And Looping Free Video.mp4",
  ["Artic/minimax-h3_a_Create_a_seamless_lo.mp4", "Arctic video 1"],
  ["Artic/wan2.6-i2v_b_Create_a_seamless_lo.mp4", "Arctic video 2"],
];

const makeLibrary = (files, type, labelPrefix) => Object.freeze(
  files.map((entry, index) => {
    const [file, label] = Array.isArray(entry)
      ? entry
      : [entry, `${labelPrefix} ${index + 1}`];
    return Object.freeze({
      label,
      type,
      url: encodeURI(`/backgrounds/${file}`),
    });
  }),
);

// Keep published URLs stable when adding media to these libraries.
export const BACKGROUND_IMAGE_LIBRARY = makeLibrary(imageFiles, "image", "Background");
export const BACKGROUND_VIDEO_LIBRARY = makeLibrary(videoFiles, "video", "Video background");

// Kept for existing imports and saved-editor regression tests.
export const BACKGROUND_LIBRARY = BACKGROUND_IMAGE_LIBRARY;
