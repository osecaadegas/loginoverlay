// Keep published URLs stable when adding new library images.
const files = [
  "ChatGPT Image Sep 11, 2026, 04_05_16 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_09_41 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_11_02 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_12_06 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_13_41 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_14_38 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_15_42 AM.png",
  "ChatGPT Image Sep 11, 2026, 04_16_34 AM.png",
];

export const BACKGROUND_LIBRARY = Object.freeze(files.map((file, index) => Object.freeze({
  label: `Background ${index + 1}`,
  url: encodeURI(`/backgrounds/${file}`),
})));
