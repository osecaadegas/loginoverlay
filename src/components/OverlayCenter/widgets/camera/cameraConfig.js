import { DEFAULT_CONFIG as DEFAULT_ICE_CONFIG, sanitizeConfig as sanitizeIceConfig } from "../freeze-shatter/config";
import { DEFAULT_MONEY_EXPLOSION_CONFIG, sanitizeMoneyExplosionConfig } from "../money-explosion/config";

export const CAMERA_STYLES = Object.freeze([
  { id: "ice_shatter", label: "Ice Shatter" },
  { id: "money_explosion", label: "Money Explosion" },
]);

export const DEFAULT_CAMERA_CONFIG = Object.freeze({
  displayStyle: "ice_shatter",
  iceConfig: { ...DEFAULT_ICE_CONFIG },
  moneyConfig: { ...DEFAULT_MONEY_EXPLOSION_CONFIG },
});

const SHARED_CAMERA_KEYS = Object.freeze([
  "enabled", "source", "sourceLabel", "mirror", "chromaColor", "tolerance",
  "softness", "spill", "subjectScale", "subjectX", "subjectY",
]);

function copySharedCameraSettings(from, to) {
  const next = { ...to };
  SHARED_CAMERA_KEYS.forEach((key) => {
    if (Object.hasOwn(from || {}, key)) next[key] = from[key];
  });
  return next;
}

export function migrateCameraConfig(input = {}, legacyType = "") {
  if (input?.iceConfig || input?.moneyConfig) return sanitizeCameraConfig(input);
  if (legacyType === "money_explosion" || input?.displayStyle === "money_explosion") {
    return sanitizeCameraConfig({ displayStyle: "money_explosion", moneyConfig: input });
  }
  return sanitizeCameraConfig({ displayStyle: "ice_shatter", iceConfig: input });
}

export function sanitizeCameraConfig(input = {}) {
  const displayStyle = input?.displayStyle === "money_explosion" ? "money_explosion" : "ice_shatter";
  return {
    displayStyle,
    ...(input?.colourTheme ? {colourTheme:input.colourTheme} : {}),
    ...(input?.studio ? {studio:{...input.studio},fontFamily:input.fontFamily} : {}),
    iceConfig: sanitizeIceConfig({ ...DEFAULT_ICE_CONFIG, ...(input?.iceConfig || {}) }),
    moneyConfig: sanitizeMoneyExplosionConfig({ ...DEFAULT_MONEY_EXPLOSION_CONFIG, ...(input?.moneyConfig || {}) }),
  };
}

export function activeCameraStyleConfig(config = {}) {
  const normalized = sanitizeCameraConfig(config);
  return normalized.displayStyle === "money_explosion"
    ? { ...normalized.moneyConfig, displayStyle: "money_explosion" }
    : { ...normalized.iceConfig, displayStyle: "freeze_shatter" };
}

export function switchCameraStyle(config = {}, displayStyle) {
  const normalized = sanitizeCameraConfig(config);
  const current = activeCameraStyleConfig(normalized);
  const nextStyle = displayStyle === "money_explosion" ? "money_explosion" : "ice_shatter";
  return sanitizeCameraConfig({
    ...normalized,
    displayStyle: nextStyle,
    iceConfig: copySharedCameraSettings(current, normalized.iceConfig),
    moneyConfig: copySharedCameraSettings(current, normalized.moneyConfig),
  });
}

export function updateCameraStyleConfig(config = {}, styleConfig = {}) {
  const normalized = sanitizeCameraConfig(config);
  const isMoney = normalized.displayStyle === "money_explosion";
  const activeKey = isMoney ? "moneyConfig" : "iceConfig";
  const inactiveKey = isMoney ? "iceConfig" : "moneyConfig";
  return sanitizeCameraConfig({
    ...normalized,
    [activeKey]: styleConfig,
    [inactiveKey]: copySharedCameraSettings(styleConfig, normalized[inactiveKey]),
  });
}
