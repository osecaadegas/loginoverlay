const VALID_SCALE_MODES = new Set(["fit", "fill", "native"]);

function positiveNumber(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeObsScaleMode(value) {
  return VALID_SCALE_MODES.has(value) ? value : "fit";
}

export function getObsRenderGeometry({
  viewportWidth,
  viewportHeight,
  targetWidth,
  targetHeight,
  scaleMode = "fit",
  standalone = false,
}) {
  const viewport = {
    width: positiveNumber(viewportWidth),
    height: positiveNumber(viewportHeight),
  };
  const target = {
    width: positiveNumber(targetWidth),
    height: positiveNumber(targetHeight),
  };
  const mode = normalizeObsScaleMode(scaleMode);
  const fitScale = Math.min(
    viewport.width / target.width,
    viewport.height / target.height,
  );
  const fillScale = Math.max(
    viewport.width / target.width,
    viewport.height / target.height,
  );
  const renderScale = positiveNumber(
    mode === "fit" ? fitScale : mode === "fill" ? fillScale : 1,
  );
  const displayWidth = Math.max(1, Math.round(target.width * renderScale));
  const displayHeight = Math.max(1, Math.round(target.height * renderScale));

  if (standalone) {
    return {
      mode,
      renderScale,
      layoutWidth: displayWidth,
      layoutHeight: displayHeight,
      displayWidth,
      displayHeight,
      transform: "none",
      nativeLayout: true,
    };
  }

  return {
    mode,
    renderScale,
    layoutWidth: target.width,
    layoutHeight: target.height,
    displayWidth,
    displayHeight,
    transform: renderScale === 1 ? "none" : `scale(${renderScale})`,
    nativeLayout: false,
  };
}
