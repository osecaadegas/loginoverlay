const BRUTUS_VIDEO_DIRECTORY = "/Banners%20Videos";

const BRUTUS_VIDEO_FILES = [
  ["!bacana.mp4", "Bacana"],
  ["!betclic.mp4", "Betclic"],
  ["!betclic2.mp4", "Betclic 2"],
  ["!casino.mp4", "Casino"],
  ["!CP.mp4", "CP"],
  ["!CP2.mp4", "CP 2"],
  ["!discord.mp4", "Discord"],
  ["!IG.mp4", "Instagram"],
  ["!lebull.mp4", "LeBull"],
  ["!loja.mp4", "Loja"],
  ["!Luckia.mp4", "Luckia"],
  ["!ofertas.mp4", "Ofertas"],
  ["!overlay.mp4", "Overlay"],
  ["!solverde.mp4", "Solverde"],
  ["!ultima.mp4", "Ultima"],
  ["others/1785376308363-CvBAZObJ-0.mp4", "Banner 1"],
  ["others/1785377076122-wktfNaXq-0.mp4", "Banner 2"],
  ["others/1785377712173-blizgNZK-0.mp4", "Banner 3"],
  ["others/b_make_the_golden_rock (online-video-cutter.com) (1).mp4", "Golden Rock 1"],
  ["others/b_make_the_golden_rock (online-video-cutter.com) (2).mp4", "Golden Rock 2"],
  ["others/hailuo-2.3-fast_a_make_the_golden_rock.mp4", "Golden Rock 3"],
  ["others/minimax-h3_a_Create_a_seamless_lo.mp4", "Seamless Loop 1"],
  ["others/wan2.6-i2v_b_Create_a_seamless_lo.mp4", "Seamless Loop 2"],
];

export const BRUTUS_SLIDESHOW_ROLE = "brutus";

function encodeRelativePath(fileName) {
  return String(fileName)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export const BRUTUS_VIDEO_LIBRARY = Object.freeze(
  BRUTUS_VIDEO_FILES.map(([fileName, label]) => ({
    id: `brutus-${fileName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    fileName,
    label,
    url: `${BRUTUS_VIDEO_DIRECTORY}/${encodeRelativePath(fileName)}`,
    mediaLine: `${BRUTUS_VIDEO_DIRECTORY}/${encodeRelativePath(fileName)}|video|${label}`,
  })),
);

function normalizePath(value = "") {
  const path = String(value).split("|")[0].split(/[?#]/)[0].trim();
  try {
    return decodeURIComponent(path).replaceAll("\\", "/").toLowerCase();
  } catch {
    return path.replaceAll("\\", "/").toLowerCase();
  }
}

export function isBrutusVideoUrl(value = "") {
  const path = normalizePath(value);
  return /(?:^|\/)banners videos(?:\/|$)/.test(path);
}

export function filterBrutusMediaText(mediaText = "", hasBrutusRole = false) {
  if (hasBrutusRole) return String(mediaText || "");
  return String(mediaText || "")
    .split(/\r?\n/)
    .filter((line) => !isBrutusVideoUrl(line))
    .join("\n");
}

export function hasMediaLine(mediaText = "", item) {
  const targetPath = normalizePath(item?.url);
  return String(mediaText || "")
    .split(/\r?\n/)
    .some((line) => normalizePath(line) === targetPath);
}

export function toggleBrutusMediaLine(mediaText = "", item) {
  if (!item?.url || !item?.mediaLine) return String(mediaText || "");
  const lines = String(mediaText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const targetPath = normalizePath(item.url);
  const withoutTarget = lines.filter((line) => normalizePath(line) !== targetPath);
  if (withoutTarget.length !== lines.length) return withoutTarget.join("\n");
  return [...lines, item.mediaLine].join("\n");
}

export function addAllBrutusMedia(mediaText = "") {
  return BRUTUS_VIDEO_LIBRARY.reduce(
    (next, item) => (hasMediaLine(next, item) ? next : toggleBrutusMediaLine(next, item)),
    String(mediaText || ""),
  );
}
