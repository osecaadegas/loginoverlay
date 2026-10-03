export const BACKGROUND_SOURCE_OPTIONS = [
  { value: "texture", label: "Texture" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "transparent", label: "Transparent — effects only" },
  { value: "chroma", label: "Chroma key" },
];

export const isExternalBackgroundSource = (mode) =>
  mode === "transparent" || mode === "chroma";

export function normalizeChromaKeyColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#00ff00";
}

export function updateBackgroundSource(config, patch) {
  const sourcePatch = Object.fromEntries(
    ["bgMode", "chromaKeyColor"].filter((key) => Object.hasOwn(patch, key))
      .map((key) => [key, key === "chromaKeyColor" ? normalizeChromaKeyColor(patch[key]) : patch[key]]),
  );
  const next = { ...config, ...patch, ...sourcePatch };
  if (!Object.keys(sourcePatch).length) return next;
  // Use the same explicit element settings as the shared appearance renderer.
  const key = Object.hasOwn(config, "__appearanceExplicitSubElements")
    ? "__appearanceExplicitSubElements" : "subElements";
  next[key] = { ...config[key], source: { ...config[key]?.source, ...sourcePatch } };
  return next;
}

// Generate a lossless, full-resolution key image in the user's chosen colour.
export function downloadChromaKeyImage(color) {
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const context = canvas.getContext("2d");
  context.fillStyle = normalizeChromaKeyColor(color);
  context.fillRect(0, 0, canvas.width, canvas.height);
  const link = document.createElement("a");
  link.download = `chroma-key-${context.fillStyle.slice(1)}-1920x1080.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
