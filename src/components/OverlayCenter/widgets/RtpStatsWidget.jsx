import React, { useMemo, useState, useEffect, useRef } from "react";
import { supabase } from "../../../config/supabaseClient";
import {
  findUserSlotRecord,
  getSlotIdentity,
  hydrateSlotPersonalBestFromHistory,
  recordMatchesSlot,
} from "../../../services/slotRecordService";
import { getProviderImage } from "../../../utils/gameProviders";
import { subElementStyle, subValue } from "./shared/appearanceStyles";
import {
  brushedMetalBackground,
  metalBorderColor,
  metalSurfaceShadow,
} from "./shared/metalTexture";
import {
  STYLE_SECA,
  resolveStyleSecaValue,
  styleSecaSurfaceGradient,
} from "./shared/styleSecaTheme";

const DEFAULT_RTP_METAL = Object.freeze({
  primaryColor: "#6f7d91",
  secondaryColor: "#252c38",
  syncWithBonusHuntColors: false,
});

const SLOT_SELECT_COLUMNS =
  "id, name, provider, image, rtp, volatility, max_win_multiplier, reels, min_bet, max_bet, features";

function firstColor(...values) {
  for (const value of values) {
    const color = String(value || "").trim();
    if (color) return color;
  }
  return "";
}

function bonusHuntMetalColors(config = {}) {
  return {
    primaryColor: firstColor(
      config.headerAccent,
      config.currentBonusAccent,
      config.listCardAccent,
      config.accentColor,
      "#2dd4bf",
    ),
    secondaryColor: firstColor(
      config.headerColor,
      config.countCardColor,
      config.listCardColor,
      config.bgColor,
      "#26282e",
    ),
  };
}

function slotsTableQuery() {
  return supabase.from("slots").select(SLOT_SELECT_COLUMNS);
}

async function fetchSlotQuery(query, confidence) {
  const { data, error } = await query.limit(1).single();
  if (error || !data) return null;
  return { ...data, source: "database", confidence };
}

function bonusTypeRank(bonus) {
  if (bonus.isExtremeBonus) return 2;
  if (bonus.isSuperBonus) return 1;
  return 0;
}

function resolveRtpSurfaceFallback({
  isStyleSeca,
  isNeon,
  isMinimal,
  isGlassStyle,
}) {
  if (isStyleSeca) return STYLE_SECA.surface;
  if (isNeon) return "#050510";
  if (isMinimal) return "#0a0a14";
  if (isGlassStyle) return "#0f172a";
  return "#111827";
}

function resolveRtpElevatedFallback({
  isStyleSeca,
  isNeon,
  isMinimal,
  isGlassStyle,
}) {
  if (isStyleSeca) return STYLE_SECA.elevated;
  if (isNeon) return "#0a0a2e";
  if (isMinimal) return "#0a0a14";
  if (isGlassStyle) return "#1e293b";
  return "#1e3a5f";
}

function resolveRtpBorderFallback({
  isStyleSeca,
  isMetal,
  isNeon,
  isMinimal,
  isGlassStyle,
  metalPrimaryColor,
}) {
  if (isStyleSeca) return STYLE_SECA.border;
  if (isMetal) return metalBorderColor(metalPrimaryColor, 0.34);
  if (isNeon) return "#00ffcc";
  if (isMinimal) return "rgba(255,255,255,0.08)";
  if (isGlassStyle) return "rgba(255,255,255,0.2)";
  return "#1d4ed8";
}

function resolveRtpRadiusFallback({
  isStyleSeca,
  isMetal,
  isMinimal,
  isGlassStyle,
}) {
  if (isStyleSeca || isMetal) return 10;
  if (isMinimal) return 4;
  if (isGlassStyle) return 16;
  return 8;
}

function resolveRtpTextFallback(
  { isStyleSeca, isMetal },
  styleSecaColor,
  metalColor,
  fallbackColor,
) {
  if (isStyleSeca) return styleSecaColor;
  if (isMetal) return metalColor;
  return fallbackColor;
}

function resolveRtpIconFallback(
  { isStyleSeca, isMetal, metalPrimaryColor },
  styleSecaColor,
  fallbackColor,
) {
  if (isStyleSeca) return styleSecaColor;
  if (isMetal) return metalPrimaryColor;
  return fallbackColor;
}

function resolveLivePreviewValue({
  isLive,
  showDemoData,
  liveValue,
  demoValue,
  emptyValue,
}) {
  if (isLive) return liveValue;
  if (showDemoData) return demoValue;
  return emptyValue;
}

function resolveRtpStyleClass({
  isVertical,
  isStyleSeca,
  isMetal,
  isNeon,
  isMinimal,
  isGlassStyle,
}) {
  if (isVertical) return " rtp-stats-bar--vertical";
  if (isStyleSeca) return " rtp-stats-bar--styleseca rtp-stats-bar--metal";
  if (isMetal) return " rtp-stats-bar--metal";
  if (isNeon) return " rtp-stats-bar--neon";
  if (isMinimal) return " rtp-stats-bar--minimal";
  if (isGlassStyle) return " rtp-stats-bar--glass";
  return "";
}

function resolveRtpStatCardStyle({
  isStyleSeca,
  isMetal,
  cardSurfaceStyle,
  borderWidth,
  metalPrimaryColor,
  metalSecondaryColor,
  styleSecaValue,
}) {
  if (isStyleSeca) {
    return {
      ...cardSurfaceStyle,
      background: styleSecaValue(
        cardSurfaceStyle.background,
        styleSecaSurfaceGradient("90deg"),
      ),
      border:
        cardSurfaceStyle.border ||
        `${borderWidth}px solid ${cardSurfaceStyle.borderColor || STYLE_SECA.border}`,
      borderColor: cardSurfaceStyle.borderColor || STYLE_SECA.border,
      boxShadow:
        cardSurfaceStyle.boxShadow ||
        `0 16px 34px rgba(0,0,0,0.34), 0 0 24px ${STYLE_SECA.glow}`,
    };
  }
  if (isMetal) {
    return {
      ...cardSurfaceStyle,
      background: brushedMetalBackground(
        `linear-gradient(to right, var(--rtp-metal-secondary, ${metalSecondaryColor}) 0%, var(--rtp-metal-primary, ${metalPrimaryColor}) 50%, var(--rtp-metal-secondary, ${metalSecondaryColor}) 100%)`,
        metalPrimaryColor,
        { highlightOpacity: 0.06, grainOpacity: 0.028 },
      ),
      border:
        cardSurfaceStyle.border ||
        `${borderWidth}px solid ${metalBorderColor(metalPrimaryColor, 0.3)}`,
      borderColor: metalBorderColor(metalPrimaryColor, 0.3),
      boxShadow:
        cardSurfaceStyle.boxShadow ||
        metalSurfaceShadow(metalPrimaryColor, 0.72),
    };
  }
  return cardSurfaceStyle;
}

function resolveRtpMetalConfig(config, bonusHuntConfig) {
  const overrides =
    config.rtpMetal &&
    typeof config.rtpMetal === "object" &&
    !Array.isArray(config.rtpMetal)
      ? config.rtpMetal
      : null;
  const rtpMetal = overrides
    ? { ...DEFAULT_RTP_METAL, ...overrides }
    : DEFAULT_RTP_METAL;
  const syncedMetalColors = bonusHuntMetalColors(bonusHuntConfig);
  if (rtpMetal.syncWithBonusHuntColors) {
    return {
      rtpMetal,
      metalPrimaryColor: syncedMetalColors.primaryColor,
      metalSecondaryColor: syncedMetalColors.secondaryColor,
    };
  }
  return {
    rtpMetal,
    metalPrimaryColor: firstColor(
      rtpMetal.primaryColor,
      DEFAULT_RTP_METAL.primaryColor,
    ),
    metalSecondaryColor: firstColor(
      rtpMetal.secondaryColor,
      DEFAULT_RTP_METAL.secondaryColor,
    ),
  };
}

function resolveRtpStyleFlags(displayStyle) {
  return {
    isVertical: displayStyle === "vertical",
    isMetal: displayStyle === "metal",
    isStyleSeca: displayStyle === "StyleSecaRTP",
    isNeon: displayStyle === "neon",
    isMinimal: displayStyle === "minimal",
    isGlassStyle: displayStyle === "glass",
  };
}

function resolveRtpStyleSecaValue(isStyleSeca, value, fallback) {
  if (isStyleSeca) return resolveStyleSecaValue(value, fallback);
  return value;
}

function resolveRtpBarBgFrom({
  config,
  styleFlags,
  metalSecondaryColor,
  styleSecaValue,
}) {
  if (styleFlags.isMetal)
    return styleSecaValue(metalSecondaryColor, STYLE_SECA.surface);
  return styleSecaValue(
    subValue(
      config,
      "container",
      "background",
      config.barBgFrom || resolveRtpSurfaceFallback(styleFlags),
    ),
    STYLE_SECA.surface,
  );
}

function resolveRtpBarBgVia({
  config,
  styleFlags,
  metalPrimaryColor,
  styleSecaValue,
}) {
  if (styleFlags.isMetal)
    return styleSecaValue(metalPrimaryColor, STYLE_SECA.elevated);
  return styleSecaValue(
    config.barBgVia || resolveRtpElevatedFallback(styleFlags),
    STYLE_SECA.elevated,
  );
}

function resolveRtpBarBgTo({
  config,
  styleFlags,
  metalSecondaryColor,
  styleSecaValue,
}) {
  if (styleFlags.isMetal)
    return styleSecaValue(metalSecondaryColor, STYLE_SECA.surface);
  return styleSecaValue(
    config.barBgTo || resolveRtpSurfaceFallback(styleFlags),
    STYLE_SECA.surface,
  );
}

function resolveRtpFontFamily(config, isStyleSeca) {
  return subValue(
    config,
    "container",
    "fontFamily",
    config.fontFamily ||
      (isStyleSeca
        ? "'Rajdhani', 'Barlow Condensed', sans-serif"
        : "'Inter', sans-serif"),
  );
}

function resolveRtpBorderWidth(config, isMinimal) {
  return subValue(
    config,
    "container",
    "borderWidth",
    config.borderWidth ?? (isMinimal ? 0 : 1),
  );
}

function resolveRtpPotentialIconFallback(isStyleSeca) {
  if (isStyleSeca) return STYLE_SECA.primary;
  return "#facc15";
}

function resolveRtpVolatilityIconFallback(isStyleSeca) {
  if (isStyleSeca) return STYLE_SECA.secondary;
  return "#3b82f6";
}

function resolveRtpSpinnerColor({ config, isMetal, metalPrimaryColor }) {
  if (config.spinnerColor) return config.spinnerColor;
  if (isMetal) return metalPrimaryColor;
  return "#60a5fa";
}

function resolveRtpTransform(widgetScale) {
  if (!widgetScale || Number(widgetScale) === 1) return undefined;
  return `scale(${Number(widgetScale)})`;
}

function resolveRtpFilter({ brightness, contrast, saturation }) {
  if (brightness === 100 && contrast === 100 && saturation === 100)
    return undefined;
  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
}

function formatProviderLogoRadius(providerLogoRadius) {
  if (typeof providerLogoRadius === "number") return `${providerLogoRadius}px`;
  return providerLogoRadius;
}

function buildRtpRootStyle(values) {
  const rootStyle = {
    fontFamily: values.fontFamily,
    fontSize: `${values.fontSize}px`,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: resolveRtpTransform(values.widgetScale),
    transformOrigin: "center",
    filter: resolveRtpFilter(values),
    "--rtp-bg-from": values.barBgFrom,
    "--rtp-bg-via": values.barBgVia,
    "--rtp-bg-to": values.barBgTo,
    "--rtp-metal-primary": values.metalPrimaryColor,
    "--rtp-metal-secondary": values.metalSecondaryColor,
    "--rtp-border-color": values.borderColor,
    "--rtp-border-width": `${values.borderWidth}px`,
    "--rtp-border-radius": `${values.borderRadius}px`,
    "--rtp-text": values.textColor,
    "--rtp-provider": values.providerColor,
    "--rtp-slot-name": values.slotNameColor,
    "--rtp-label": values.labelColor,
    "--rtp-value-rtp": values.rtpValueColor,
    "--rtp-value-potential": values.potentialValueColor,
    "--rtp-value-volatility": values.volatilityValueColor,
    "--rtp-value-bestwin": values.bestWinValueColor,
    "--rtp-icon-rtp": values.rtpIconColor,
    "--rtp-icon-potential": values.potentialIconColor,
    "--rtp-icon-volatility": values.volatilityIconColor,
    "--rtp-divider": values.dividerColor,
    "--rtp-spinner": values.spinnerColor,
    "--rtp-px": `${values.compactPaddingX}px`,
    "--rtp-py": `${values.compactPaddingY}px`,
    "--rtp-provider-family": values.providerFontFamily,
    "--rtp-provider-size": `${values.providerFontSize}px`,
    "--rtp-provider-weight": values.providerFontWeight,
    "--rtp-provider-logo-width": `${values.providerLogoWidth}px`,
    "--rtp-provider-logo-height": `${values.providerLogoHeight}px`,
    "--rtp-provider-logo-radius": formatProviderLogoRadius(
      values.providerLogoRadius,
    ),
    "--rtp-provider-logo-fit": values.providerLogoFit,
    "--rtp-slot-family": values.slotTitleFontFamily,
    "--rtp-slot-size": `${values.slotTitleFontSize}px`,
    "--rtp-slot-weight": values.slotTitleFontWeight,
    "--rtp-value-rtp-family": values.rtpValueFontFamily,
    "--rtp-value-rtp-size": `${values.rtpValueFontSize}px`,
    "--rtp-value-rtp-weight": values.rtpValueFontWeight,
    "--rtp-value-potential-family": values.potentialValueFontFamily,
    "--rtp-value-potential-size": `${values.potentialValueFontSize}px`,
    "--rtp-value-potential-weight": values.potentialValueFontWeight,
    "--rtp-value-volatility-family": values.volatilityValueFontFamily,
    "--rtp-value-volatility-size": `${values.volatilityValueFontSize}px`,
    "--rtp-value-volatility-weight": values.volatilityValueFontWeight,
    "--rtp-value-bestwin-family": values.bestWinValueFontFamily,
    "--rtp-value-bestwin-size": `${values.bestWinValueFontSize}px`,
    "--rtp-value-bestwin-weight": values.bestWinValueFontWeight,
    "--rtp-label-family": values.labelFontFamily,
    "--rtp-label-size": `${values.labelFontSize}px`,
    "--rtp-label-weight": values.labelFontWeight,
    "--rtp-label-rtp-family": values.rtpValueFontFamily,
    "--rtp-label-rtp-size": `${Math.max(10, Math.round(Number(values.rtpValueFontSize) * 0.88))}px`,
    "--rtp-label-rtp-weight": values.rtpValueFontWeight,
    "--rtp-label-potential-family": values.potentialValueFontFamily,
    "--rtp-label-potential-size": `${Math.max(10, Math.round(Number(values.potentialValueFontSize) * 0.88))}px`,
    "--rtp-label-potential-weight": values.potentialValueFontWeight,
    "--rtp-label-volatility-family": values.volatilityValueFontFamily,
    "--rtp-label-volatility-size": `${Math.max(10, Math.round(Number(values.volatilityValueFontSize) * 0.88))}px`,
    "--rtp-label-volatility-weight": values.volatilityValueFontWeight,
    "--rtp-label-bestwin-family": values.bestWinValueFontFamily,
    "--rtp-label-bestwin-size": `${Math.max(10, Math.round(Number(values.bestWinValueFontSize) * 0.88))}px`,
    "--rtp-label-bestwin-weight": values.bestWinValueFontWeight,
    "--rtp-gap": `${values.itemGap}px`,
    "--rtp-bar-height":
      values.barHeight != null ? `${values.barHeight}px` : "100%",
    "--rtp-max-width":
      values.maxWidth != null ? `${values.maxWidth}px` : "100%",
    "--rtp-icon-bestwin": values.bestWinIconColor,
    "--rtp-shadow": values.shadow,
    "--rtp-glow": values.glow,
    "--rtp-blur": `${Number(values.backdropBlur) || 0}px`,
  };
  if (values.isNeon) rootStyle["--rtp-accent"] = values.borderColor;
  return rootStyle;
}

function resolveRtpProviderStyle({
  displayProviderLogo,
  rawProviderStyle,
  providerExplicitWidth,
  providerExplicitHeight,
  providerLogoWidth,
  providerLogoHeight,
}) {
  if (!displayProviderLogo)
    return flexSizedStyle(rawProviderStyle, "inline-flex");
  const providerStyle = { ...rawProviderStyle };
  providerStyle.width =
    providerExplicitWidth != null
      ? rawProviderStyle.width
      : `${providerLogoWidth}px`;
  providerStyle.height =
    providerExplicitHeight != null
      ? rawProviderStyle.height
      : `${providerLogoHeight}px`;
  providerStyle.maxWidth = rawProviderStyle.maxWidth ?? providerStyle.width;
  return flexSizedStyle(providerStyle, "inline-flex");
}

function resolveBestWinDisplayStyles({
  isVertical,
  rawPersonalBestStyle,
  labelStyle,
}) {
  if (isVertical) {
    return {
      personalBestStyle: rawPersonalBestStyle,
      bestWinLabelStyle: labelStyle,
      bestWinValueStyle: undefined,
      bestWinGroupStyle: undefined,
    };
  }
  return {
    personalBestStyle: {
      ...rawPersonalBestStyle,
      display: "inline-flex",
      flex: "0 0 auto",
      flexDirection: "row",
      flexWrap: "nowrap",
      alignItems: "center",
      width: "auto",
      maxWidth: "none",
      minWidth: "max-content",
      whiteSpace: "nowrap",
    },
    bestWinLabelStyle: {
      ...labelStyle,
      display: "inline",
      width: "auto",
      maxWidth: "none",
      whiteSpace: "nowrap",
    },
    bestWinValueStyle: {
      display: "inline-flex",
      flexDirection: "row",
      flexWrap: "nowrap",
      alignItems: "center",
      width: "auto",
      maxWidth: "none",
      minWidth: "max-content",
      whiteSpace: "nowrap",
    },
    bestWinGroupStyle: {
      display: "inline-flex",
      flex: "0 0 auto",
      flexWrap: "nowrap",
      minWidth: "max-content",
      maxWidth: "none",
      overflow: "visible",
    },
  };
}

function resolveRtpInnerClassName({ isLive, previewMode, showEmptyState }) {
  return `rtp-stats-inner ${!isLive && previewMode ? "rtp-stats-inner--preview" : ""} ${showEmptyState ? "rtp-stats-inner--empty" : ""}`;
}

/* ─── Fetch slot info from the database (slots table) ─── */
async function fetchSlotFromDB(slotRef) {
  const slot = getSlotIdentity(slotRef);
  if (!slot.name && !slot.id) return null;

  try {
    const lookups = [
      slot.id ? [slotsTableQuery().eq("id", slot.id), "exact"] : null,
      slot.name && slot.provider
        ? [
            slotsTableQuery()
              .ilike("name", slot.name)
              .ilike("provider", slot.provider),
            "high",
          ]
        : null,
      slot.name ? [slotsTableQuery().ilike("name", slot.name), "high"] : null,
      slot.name
        ? [slotsTableQuery().ilike("name", `%${slot.name}%`), "medium"]
        : null,
    ].filter(Boolean);
    for (const [query, confidence] of lookups) {
      const result = await fetchSlotQuery(query, confidence);
      if (result) return result;
    }
  } catch {
    // DB not reachable — fall through to API
  }
  return null;
}

/* ─── API fallback (slot-ai pipeline: DB + Gemini) ─── */
async function fetchSlotInfoAPI(name) {
  try {
    const res = await fetch("/api/slot-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    // slot-ai returns a flat object with name, provider, rtp, etc.
    if (json.source === "blocked" || json.source === "not_found" || json.error)
      return null;
    return json.name ? json : null;
  } catch {
    return null;
  }
}

/* ─── Volatility formatting ─── */
function fmtVolatility(v) {
  if (!v) return "—";
  return v.replaceAll("_", " ").toUpperCase();
}

/* ─── Format max win multiplier ─── */
function fmtMultiplier(m) {
  if (!m) return "—";
  return `x${Number(m).toLocaleString()}`;
}

function cachedBestWinMatchesUser(cached, userId) {
  if (!cached) return false;
  const cachedUserId = cached.userId || cached.user_id;
  return !cachedUserId || !userId || cachedUserId === userId;
}

function normalizeBestWinRecord(record) {
  if (!record?.best_win) return null;
  return {
    slot_id: record.slot_id || record.slotId || null,
    slot_name: record.slot_name || record.slotName || "",
    slot_provider: record.slot_provider || record.provider || null,
    best_win: Number(record.best_win || record.bestWin || 0),
    best_multiplier: Number(record.best_multiplier || record.bestMulti || 0),
  };
}

function pickBestWinRecord(records) {
  return (
    records
      .map(normalizeBestWinRecord)
      .filter((record) => record?.best_win > 0)
      .sort(
        (a, b) =>
          Number(b.best_win || 0) - Number(a.best_win || 0) ||
          Number(b.best_multiplier || 0) - Number(a.best_multiplier || 0),
      )[0] || null
  );
}

/* ─── Main widget ─── */
function partAttrs(partId, stateId) {
  return {
    "data-widget-element": partId,
    "data-appearance-part": partId,
    ...(stateId ? { "data-widget-state": stateId } : {}),
  };
}

function flexSizedStyle(style, fallbackDisplay) {
  const sourceStyle = style ?? {};
  if (typeof sourceStyle !== "object") return sourceStyle;
  const next = { ...sourceStyle };
  if (fallbackDisplay && (!next.display || next.display === "inline-block"))
    next.display = fallbackDisplay;
  if (next.width != null) {
    next.flex = next.flex || `0 1 ${next.width}`;
    next.maxWidth = next.maxWidth ?? next.width;
  } else if (next.maxWidth != null) {
    next.flex = next.flex || `0 1 ${next.maxWidth}`;
  }
  if (next.height != null) next.maxHeight = next.maxHeight ?? next.height;
  return next;
}

function findBonusHuntConfig(allWidgets) {
  const widget = (allWidgets || []).find(
    (item) => item.widget_type === "bonus_hunt" && item.config,
  );
  return widget?.config || {};
}

function getTournamentCurrentMatchIndex(matches, allMatches, currentMatchIdx) {
  const inProgressIndex = matches.findIndex(
    (match) => match.status === "in_progress",
  );
  if (inProgressIndex >= 0) return inProgressIndex;
  const target = allMatches[currentMatchIdx ?? 0];
  if (!target) return 0;
  return Math.max(matches.indexOf(target), 0);
}

function resolveTournamentSlotName(allWidgets) {
  const tournamentWidget = (allWidgets || []).find(
    (item) => item.widget_type === "tournament" && item.config?.data,
  );
  if (!tournamentWidget) return "";
  const tournamentData = tournamentWidget.config.data;
  const allMatches = tournamentData.matches || [];
  const matches = allMatches.filter(
    (match) =>
      (match.player1 && match.player1 !== "TBD") ||
      (match.player2 && match.player2 !== "TBD"),
  );
  const current =
    matches[
      getTournamentCurrentMatchIndex(
        matches,
        allMatches,
        tournamentData.currentMatchIdx,
      )
    ];
  if (!current) return "";
  if (!current.winner) return current.slot1?.name || current.slot2?.name || "";
  const winningSlot =
    current.winner === "player1" ? current.slot1 : current.slot2;
  return winningSlot?.name || "";
}

function compareBonusProvider(a, b, direction) {
  const providerA = (a.slot?.provider || "").toLowerCase();
  const providerB = (b.slot?.provider || "").toLowerCase();
  if (providerA !== providerB)
    return providerA.localeCompare(providerB) * direction;
  return (a.slotName || "").localeCompare(b.slotName || "") * direction;
}

function sortRtpBonuses(bonuses, sortBy, sortDir = "asc") {
  const sourceBonuses = bonuses || [];
  if (!sortBy || sortBy === "default") return sourceBonuses;
  const direction = sortDir === "desc" ? -1 : 1;
  return [...sourceBonuses].sort((a, b) => {
    if (sortBy === "bet")
      return ((a.betSize || 0) - (b.betSize || 0)) * direction;
    if (sortBy === "provider") return compareBonusProvider(a, b, direction);
    if (sortBy === "type")
      return (bonusTypeRank(b) - bonusTypeRank(a)) * direction;
    return 0;
  });
}

function resolveCurrentBonusSlot(currentBonus) {
  if (!currentBonus) return null;
  return getSlotIdentity({
    slotId:
      currentBonus.slot?.id || currentBonus.slot_id || currentBonus.slotId,
    slotName: currentBonus.slotName || currentBonus.slot?.name,
    provider: currentBonus.slot?.provider || currentBonus.provider,
    imageUrl: currentBonus.slot?.image || currentBonus.imageUrl,
    slot: currentBonus.slot,
  });
}

function resolveActiveRtpSlot({
  previewSlotName,
  bonusOpening,
  currentBonusSlot,
  tournamentSlotName,
}) {
  if (previewSlotName) return getSlotIdentity({ slotName: previewSlotName });
  if (bonusOpening && currentBonusSlot?.name) return currentBonusSlot;
  if (tournamentSlotName)
    return getSlotIdentity({ slotName: tournamentSlotName });
  if (currentBonusSlot?.name) return currentBonusSlot;
  return getSlotIdentity({});
}

function resolveLocalSlotInfo({ slotName, currentBonus, activeSlot }) {
  if (!slotName) return null;
  const currentBonusRecord = currentBonus?.slot
    ? {
        slot_id: currentBonus.slot.id,
        slot_name: currentBonus.slot.name || currentBonus.slotName,
        slot_provider: currentBonus.slot.provider,
      }
    : null;
  if (currentBonusRecord && recordMatchesSlot(currentBonusRecord, activeSlot)) {
    return {
      ...currentBonus.slot,
      id: currentBonus.slot.id || activeSlot.id || null,
      name: currentBonus.slot.name || slotName,
      provider: currentBonus.slot.provider || activeSlot.provider || "",
      image: currentBonus.slot.image || activeSlot.image || "",
      source: "selected_bonus",
    };
  }
  return {
    id: activeSlot.id || null,
    name: slotName,
    provider: activeSlot.provider || "",
    image: activeSlot.image || "",
    source: "selected_slot",
  };
}

function useRtpSlotInfo({ activeSlot, localSlotInfo, slotKey, slotName }) {
  const [slotInfo, setSlotInfo] = useState(null);
  const lastSlotRef = useRef("");

  useEffect(() => {
    if (!slotName) {
      lastSlotRef.current = "";
      setSlotInfo(null);
      return;
    }
    if (slotKey === lastSlotRef.current) return;
    lastSlotRef.current = slotKey;
    let cancelled = false;
    setSlotInfo(localSlotInfo);

    async function lookup() {
      const dbResult = await fetchSlotFromDB(activeSlot);
      if (!cancelled && dbResult) {
        setSlotInfo(dbResult);
        return;
      }
      const apiResult = await fetchSlotInfoAPI(slotName);
      if (!cancelled) setSlotInfo(apiResult);
    }

    lookup();
    return () => {
      cancelled = true;
    };
  }, [activeSlot, localSlotInfo, slotKey, slotName]);

  return slotInfo;
}

function missingPreciseSlotFields(activeSlot, record) {
  return Boolean(
    activeSlot.id &&
    !record.slot_id &&
    activeSlot.provider &&
    !record.slot_provider,
  );
}

function cachedBestWinRecord(cached, userId, activeSlot) {
  const cachedRecord = cached
    ? {
        slot_id: cached.slotId || cached.slot_id || null,
        slot_name: cached.slotName,
        slot_provider: cached.provider || cached.slot_provider || null,
      }
    : null;
  const isExactEnough =
    cachedRecord &&
    cachedBestWinMatchesUser(cached, userId) &&
    recordMatchesSlot(cachedRecord, activeSlot) &&
    !missingPreciseSlotFields(activeSlot, cachedRecord);
  if (!cached?.best_win || !isExactEnough) return null;
  return {
    ...cachedRecord,
    best_win: cached.best_win,
    best_multiplier: cached.best_multiplier || 0,
  };
}

function widgetBestWinRecord(widget, activeSlot) {
  const widgetRecord = {
    slot_id: widget.config.slotId || null,
    slot_name: widget.config.slotName,
    slot_provider: widget.config.provider || null,
  };
  const matches =
    recordMatchesSlot(widgetRecord, activeSlot) &&
    !missingPreciseSlotFields(activeSlot, widgetRecord);
  if (!matches) return null;
  return {
    slot_id: widget.config.slotId || null,
    slot_name: widget.config.slotName,
    slot_provider: widget.config.provider || null,
    best_win: widget.config.bestWin,
    best_multiplier: widget.config.bestMulti || 0,
  };
}

function resolveConfigBestWin({
  slotName,
  cached,
  userId,
  allWidgets,
  activeSlot,
}) {
  if (!slotName) return null;
  const cachedRecord = cachedBestWinRecord(cached, userId, activeSlot);
  if (cachedRecord) return cachedRecord;
  const matchingWidget = (allWidgets || []).find((widget) => {
    const isSlotWidget =
      widget.widget_type === "single_slot" ||
      widget.widget_type === "current_slot";
    return (
      isSlotWidget &&
      widget.config?.bestWin &&
      widgetBestWinRecord(widget, activeSlot)
    );
  });
  return matchingWidget
    ? widgetBestWinRecord(matchingWidget, activeSlot)
    : null;
}

function usePersistRtpBestWin({
  activeSlot,
  bestWinData,
  config,
  slotKey,
  slotName,
  userId,
  widgetId,
}) {
  const persistRef = useRef("");
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (!bestWinData || !widgetId || !slotName || !userId) return;
    const key = `${userId}:${slotKey}:${bestWinData.best_win}:${bestWinData.best_multiplier}`;
    if (persistRef.current === key) return;
    persistRef.current = key;
    const latest = configRef.current;
    const bestSlot = getSlotIdentity(bestWinData);
    supabase
      .from("overlay_widgets")
      .update({
        config: {
          ...latest,
          _cachedBestWin: {
            userId,
            slotId: bestSlot.id || activeSlot.id || null,
            slotName: bestSlot.name || slotName,
            provider: bestSlot.provider || activeSlot.provider || null,
            best_win: bestWinData.best_win,
            best_multiplier: bestWinData.best_multiplier,
          },
        },
      })
      .eq("id", widgetId)
      .eq("user_id", userId)
      .then();
  }, [activeSlot, bestWinData, slotKey, userId, widgetId, slotName]);
}

async function fetchRtpBestWin(userId, activeSlot) {
  const data = await findUserSlotRecord(
    userId,
    activeSlot,
    "slot_id, slot_name, slot_provider, best_win, best_multiplier",
  );
  if (data && recordMatchesSlot(data, activeSlot)) return data;
  return hydrateSlotPersonalBestFromHistory(userId, activeSlot);
}

function useRtpBestWinData({ activeSlot, slotKey, slotName, userId }) {
  const [bestWinData, setBestWinData] = useState(null);

  useEffect(() => {
    if (!slotName || !userId) {
      setBestWinData(null);
      return undefined;
    }
    let cancelled = false;
    setBestWinData(null);

    async function fetchBestWin() {
      try {
        const record = await fetchRtpBestWin(userId, activeSlot);
        if (!cancelled) {
          setBestWinData(
            record && recordMatchesSlot(record, activeSlot)
              ? normalizeBestWinRecord(record)
              : null,
          );
        }
      } catch {
        if (!cancelled) setBestWinData(null);
      }
    }

    fetchBestWin();

    const channel = supabase
      .channel(`bestwin_${userId}_${slotKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_slot_records",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const rec = payload.new || payload.old;
          if (!recordMatchesSlot(rec, activeSlot)) return;
          if (payload.eventType === "DELETE" || !payload.new?.best_win) {
            setBestWinData(null);
            return;
          }
          setBestWinData(normalizeBestWinRecord(payload.new));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeSlot, slotKey, slotName, userId]);

  return bestWinData;
}

function resolveCurrentHuntBestWin({ activeSlot, bonuses, isLive }) {
  if (!isLive) return null;
  let best = null;
  for (const bonus of bonuses || []) {
    const payout = Number(bonus.payout) || Number(bonus.result) || 0;
    if (payout <= 0) continue;
    const record = {
      slot_id: bonus.slot?.id || bonus.slot_id || bonus.slotId || null,
      slot_name: bonus.slotName || bonus.slot?.name || "",
      slot_provider: bonus.slot?.provider || bonus.provider || null,
    };
    if (!recordMatchesSlot(record, activeSlot)) continue;
    const bet = Number(bonus.betSize) || 0;
    const candidate = {
      ...record,
      best_win: payout,
      best_multiplier: bet > 0 ? Math.round((payout / bet) * 100) / 100 : 0,
    };
    best = pickBestWinRecord([best, candidate]);
  }
  return best;
}

function RtpStatsProviderMark({ provider, logo, style }) {
  const [failedLogo, setFailedLogo] = useState("");

  useEffect(() => {
    setFailedLogo("");
  }, [provider, logo]);

  const canShowLogo = Boolean(logo) && failedLogo !== logo;
  const label = String(provider || "").trim();

  return (
    <span
      className={`rtp-stats-provider ${canShowLogo ? "rtp-stats-provider--logo" : "rtp-stats-provider--text"}`}
      title={label}
      style={style}
      {...partAttrs("provider")}
    >
      {canShowLogo ? (
        <img
          src={logo}
          alt={`${label} logo`}
          className="rtp-stats-provider-logo"
          draggable="false"
          decoding="async"
          onError={() => setFailedLogo(logo)}
        />
      ) : (
        label.toUpperCase()
      )}
    </span>
  );
}

function RtpStatsPreviewBadge({ isLive, previewMode }) {
  if (isLive || !previewMode) return null;
  return <span className="rtp-stats-preview-badge">PREVIEW</span>;
}

function RtpStatsDivider({ style }) {
  return (
    <div
      className="rtp-stats-divider"
      {...partAttrs("divider")}
      style={style}
    />
  );
}

function RtpStatsProviderSection({
  showProvider,
  displayProvider,
  displayProviderLogo,
  providerStyle,
  dividerStyle,
}) {
  if (!showProvider || !displayProvider) return null;
  return (
    <>
      <RtpStatsProviderMark
        provider={displayProvider}
        logo={displayProviderLogo}
        style={providerStyle}
      />
      <RtpStatsDivider style={dividerStyle} />
    </>
  );
}

function RtpStatsSpinner({ showSpinner, spinnerStyle }) {
  if (!showSpinner) return null;
  return (
    <svg
      className="rtp-stats-spinner"
      {...partAttrs("spinner")}
      style={spinnerStyle}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2a10 10 0 1 0 10 10H12V2z" opacity="0.25" />
      <path d="M22 12A10 10 0 0 1 12 22v-2a8 8 0 0 0 8-8z" />
    </svg>
  );
}

function RtpStatsMetric({
  show,
  className,
  partId,
  style,
  label,
  labelStyle,
  children,
}) {
  if (!show) return null;
  return (
    <div className={className} {...partAttrs(partId)} style={style}>
      <span className="rtp-stats-icon">⚡</span>
      <span className="rtp-stats-value">
        <span
          className="rtp-stats-label"
          {...partAttrs("label")}
          style={labelStyle}
        >
          {label}{" "}
        </span>
        {children}
      </span>
    </div>
  );
}

function RtpStatsLeftSection({
  showProvider,
  displayProvider,
  displayProviderLogo,
  providerStyle,
  dividerStyle,
  showSpinner,
  spinnerStyle,
  displaySlotName,
  slotTitleStyle,
  showRtp,
  showPotential,
  showVolatility,
  displayInfo,
  rtpValueStyle,
  maxWinStyle,
  volatilityStyle,
  labelStyle,
}) {
  return (
    <div className="rtp-stats-left">
      <RtpStatsProviderSection
        showProvider={showProvider}
        displayProvider={displayProvider}
        displayProviderLogo={displayProviderLogo}
        providerStyle={providerStyle}
        dividerStyle={dividerStyle}
      />
      <div className="rtp-stats-slot">
        <RtpStatsSpinner
          showSpinner={showSpinner}
          spinnerStyle={spinnerStyle}
        />
        <span
          className="rtp-stats-slot-name"
          {...partAttrs("slotTitle")}
          style={slotTitleStyle}
        >
          {(displaySlotName || "").toUpperCase()}
        </span>
      </div>
      {showRtp && <RtpStatsDivider style={dividerStyle} />}
      <RtpStatsMetric
        show={showRtp}
        className="rtp-stats-item rtp-stats-item--rtp"
        partId="rtpValue"
        style={rtpValueStyle}
        label="RTP"
        labelStyle={labelStyle}
      >
        {displayInfo?.rtp ? `${displayInfo.rtp}%` : "—"}
      </RtpStatsMetric>
      <RtpStatsMetric
        show={showPotential}
        className="rtp-stats-item rtp-stats-item--potential"
        partId="maxWin"
        style={maxWinStyle}
        label="POTENTIAL"
        labelStyle={labelStyle}
      >
        {fmtMultiplier(displayInfo?.max_win_multiplier)}
      </RtpStatsMetric>
      <RtpStatsMetric
        show={showVolatility}
        className="rtp-stats-item rtp-stats-item--volatility"
        partId="volatility"
        style={volatilityStyle}
        label="VOLATILITY"
        labelStyle={labelStyle}
      >
        {fmtVolatility(displayInfo?.volatility)}
      </RtpStatsMetric>
    </div>
  );
}

function formatBestWinAmount(displayBestWin, currency, emptyText) {
  if (!displayBestWin?.best_win) return emptyText;
  return `${currency}${Number(displayBestWin.best_win).toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatBestWinMultiplier(displayBestWin) {
  if (!displayBestWin?.best_multiplier) return "";
  return ` (${Number(displayBestWin.best_multiplier).toLocaleString()}x)`;
}

function RtpStatsBestWinSection({
  showBestWin,
  bestWinGroupStyle,
  personalBestStyle,
  bestWinValueStyle,
  bestWinLabelStyle,
  displayBestWin,
  currency,
  bestWinEmptyText,
}) {
  if (!showBestWin) return null;
  const hardcodedEuroAmount = formatBestWinAmount(displayBestWin, "€", "—");
  const currentCurrencyAmount = formatBestWinAmount(
    displayBestWin,
    currency,
    bestWinEmptyText,
  );
  const multiplier = formatBestWinMultiplier(displayBestWin);
  return (
    <div className="rtp-stats-right" style={bestWinGroupStyle}>
      <div
        className="rtp-stats-item rtp-stats-item--bestwin"
        {...partAttrs("personalBest")}
        style={personalBestStyle}
      >
        <span className="rtp-stats-icon">🏆</span>
        <span className="rtp-stats-value" style={bestWinValueStyle}>
          <span
            className="rtp-stats-label"
            {...partAttrs("label")}
            style={bestWinLabelStyle}
          >
            BEST WIN{" "}
          </span>
          {hardcodedEuroAmount}
          {multiplier}
        </span>
        <span
          className="rtp-stats-value rtp-stats-value--bestwin-current"
          style={bestWinValueStyle}
        >
          <span
            className="rtp-stats-label"
            {...partAttrs("label")}
            style={bestWinLabelStyle}
          >
            BEST WIN{" "}
          </span>
          {currentCurrencyAmount}
          {multiplier}
        </span>
      </div>
    </div>
  );
}

function RtpStatsWidget({ config, theme, allWidgets, userId, widgetId }) {
  const c = config || {};

  /* ── Find bonus hunt widget ── */
  const bhConfig = useMemo(() => findBonusHuntConfig(allWidgets), [allWidgets]);
  const bonusOpening = bhConfig.bonusOpening === true;
  const { metalPrimaryColor, metalSecondaryColor } = resolveRtpMetalConfig(
    c,
    bhConfig,
  );

  /* ── Find tournament widget & current match slot ── */
  const tournamentSlotName = useMemo(
    () => resolveTournamentSlotName(allWidgets),
    [allWidgets],
  );

  /* ── Apply same sort as BonusHuntWidget so current bonus matches ── */
  const bonuses = useMemo(
    () => sortRtpBonuses(bhConfig.bonuses, bhConfig.sortBy, bhConfig.sortDir),
    [bhConfig.bonuses, bhConfig.sortBy, bhConfig.sortDir],
  );

  /* ── Current bonus (first unopened) ── */
  const currentBonus = useMemo(() => bonuses.find((b) => !b.opened), [bonuses]);
  /* Priority: search preview → bonus opening slot → tournament slot → bonus hunt slot */
  const currentBonusSlot = useMemo(
    () => resolveCurrentBonusSlot(currentBonus),
    [currentBonus],
  );

  const activeSlot = useMemo(
    () =>
      resolveActiveRtpSlot({
        previewSlotName: bhConfig.previewSlotName || "",
        bonusOpening,
        currentBonusSlot,
        tournamentSlotName,
      }),
    [
      bhConfig.previewSlotName,
      bonusOpening,
      currentBonusSlot,
      tournamentSlotName,
    ],
  );

  const slotName = activeSlot.name || "";
  const slotKey = `${activeSlot.id || ""}|${activeSlot.provider || ""}|${slotName}`;
  const localSlotInfo = useMemo(
    () => resolveLocalSlotInfo({ slotName, currentBonus, activeSlot }),
    [activeSlot, currentBonus, slotName],
  );

  /* ── Slot info from DB (primary) or API (fallback) ── */
  const slotInfo = useRtpSlotInfo({
    activeSlot,
    localSlotInfo,
    slotKey,
    slotName,
  });

  /* ── Best win for this slot (from user_slot_records) ── */
  const bestWinData = useRtpBestWinData({
    activeSlot,
    slotKey,
    slotName,
    userId,
  });

  // Fallback: read bestWin cached in widget config (works in OBS where DB is blocked by RLS)
  const configBestWin = useMemo(
    () =>
      resolveConfigBestWin({
        slotName,
        cached: c._cachedBestWin,
        userId,
        allWidgets,
        activeSlot,
      }),
    [activeSlot, allWidgets, c._cachedBestWin, slotName, userId],
  );

  // Persist bestWin to widget config so OBS can read it (OBS has no auth -> can't query DB)
  usePersistRtpBestWin({
    activeSlot,
    bestWinData,
    config: c,
    slotKey,
    slotName,
    userId,
    widgetId,
  });

  /* ── Style config ── */
  const displayStyle = c.displayStyle || "v1";
  const styleFlags = resolveRtpStyleFlags(displayStyle);
  const { isVertical, isMetal, isStyleSeca, isNeon, isMinimal } = styleFlags;
  const styleSecaValue = (value, fallback) =>
    resolveRtpStyleSecaValue(isStyleSeca, value, fallback);
  const barBgFrom = resolveRtpBarBgFrom({
    config: c,
    styleFlags,
    metalSecondaryColor,
    styleSecaValue,
  });
  const barBgVia = resolveRtpBarBgVia({
    config: c,
    styleFlags,
    metalPrimaryColor,
    styleSecaValue,
  });
  const barBgTo = resolveRtpBarBgTo({
    config: c,
    styleFlags,
    metalSecondaryColor,
    styleSecaValue,
  });
  const borderColor = styleSecaValue(
    subValue(
      c,
      "container",
      "borderColor",
      c.borderColor ||
        resolveRtpBorderFallback({ ...styleFlags, metalPrimaryColor }),
    ),
    STYLE_SECA.border,
  );
  const borderWidth = resolveRtpBorderWidth(c, isMinimal);
  const borderRadius = subValue(
    c,
    "container",
    "radius",
    c.borderRadius ?? resolveRtpRadiusFallback(styleFlags),
  );
  const textColor = styleSecaValue(
    subValue(
      c,
      "statCard",
      "textColor",
      c.textColor ||
        resolveRtpTextFallback(
          styleFlags,
          STYLE_SECA.text,
          "#d4d4d8",
          "#ffffff",
        ),
    ),
    STYLE_SECA.text,
  );
  const providerColor = styleSecaValue(
    subValue(
      c,
      "provider",
      "textColor",
      c.providerColor ||
        resolveRtpTextFallback(
          styleFlags,
          STYLE_SECA.text,
          "#d4d4d8",
          "#ffffff",
        ),
    ),
    STYLE_SECA.text,
  );
  const slotNameColor = styleSecaValue(
    subValue(
      c,
      "slotTitle",
      "textColor",
      c.slotNameColor ||
        resolveRtpTextFallback(
          styleFlags,
          STYLE_SECA.text,
          "#f1f5f9",
          "#ffffff",
        ),
    ),
    STYLE_SECA.text,
  );
  const labelColor = styleSecaValue(
    subValue(
      c,
      "label",
      "textColor",
      c.labelColor ||
        resolveRtpTextFallback(
          styleFlags,
          STYLE_SECA.muted,
          "#8a8f98",
          "#94a3b8",
        ),
    ),
    STYLE_SECA.muted,
  );
  const rtpIconColor = styleSecaValue(
    subValue(
      c,
      "rtpValue",
      "accentColor",
      c.rtpIconColor ||
        resolveRtpIconFallback(styleFlags, STYLE_SECA.primary, "#60a5fa"),
    ),
    STYLE_SECA.primary,
  );
  const potentialIconColor = styleSecaValue(
    subValue(
      c,
      "maxWin",
      "accentColor",
      c.potentialIconColor || resolveRtpPotentialIconFallback(isStyleSeca),
    ),
    STYLE_SECA.primary,
  );
  const volatilityIconColor = styleSecaValue(
    subValue(
      c,
      "volatility",
      "accentColor",
      c.volatilityIconColor || resolveRtpVolatilityIconFallback(isStyleSeca),
    ),
    STYLE_SECA.secondary,
  );
  const dividerColor = subValue(
    c,
    "divider",
    "background",
    subValue(c, "statCard", "borderColor", c.dividerColor || "#3b82f6"),
  );
  const fontFamily = resolveRtpFontFamily(c, isStyleSeca);
  const fontSize = c.fontSize ?? 14;
  const barHeight = subValue(c, "container", "height", c.barHeight ?? null);
  const maxWidth = subValue(c, "container", "maxWidth", c.maxWidth ?? null);
  const providerFontFamily = subValue(c, "provider", "fontFamily", fontFamily);
  const providerFontSize = subValue(
    c,
    "provider",
    "fontSize",
    c.providerFontSize ?? 16,
  );
  const providerFontWeight = subValue(
    c,
    "provider",
    "fontWeight",
    c.fontWeight || 700,
  );
  const providerLogoHeight = subValue(
    c,
    "provider",
    "imageSize",
    c.providerLogoHeight ?? 29,
  );
  const providerLogoWidth = subValue(
    c,
    "provider",
    "width",
    c.providerLogoWidth ??
      Math.round((Number(providerLogoHeight) || 29) * 3.25),
  );
  const providerLogoRadius = subValue(
    c,
    "provider",
    "radius",
    c.providerLogoRadius ?? 0,
  );
  const providerLogoFit = subValue(
    c,
    "provider",
    "imageFit",
    c.providerLogoFit || "contain",
  );
  const slotTitleFontFamily = subValue(
    c,
    "slotTitle",
    "fontFamily",
    fontFamily,
  );
  const slotTitleFontSize = subValue(c, "slotTitle", "fontSize", fontSize);
  const slotTitleFontWeight = subValue(
    c,
    "slotTitle",
    "fontWeight",
    c.fontWeight || 700,
  );
  const rtpValueFontFamily = subValue(c, "rtpValue", "fontFamily", fontFamily);
  const rtpValueFontSize = subValue(c, "rtpValue", "fontSize", fontSize);
  const rtpValueFontWeight = subValue(
    c,
    "rtpValue",
    "fontWeight",
    c.fontWeight || 700,
  );
  const potentialValueFontFamily = subValue(
    c,
    "maxWin",
    "fontFamily",
    fontFamily,
  );
  const potentialValueFontSize = subValue(c, "maxWin", "fontSize", fontSize);
  const potentialValueFontWeight = subValue(
    c,
    "maxWin",
    "fontWeight",
    c.fontWeight || 700,
  );
  const volatilityValueFontFamily = subValue(
    c,
    "volatility",
    "fontFamily",
    fontFamily,
  );
  const volatilityValueFontSize = subValue(
    c,
    "volatility",
    "fontSize",
    fontSize,
  );
  const volatilityValueFontWeight = subValue(
    c,
    "volatility",
    "fontWeight",
    c.fontWeight || 700,
  );
  const bestWinValueFontFamily = subValue(
    c,
    "personalBest",
    "fontFamily",
    fontFamily,
  );
  const bestWinValueFontSize = subValue(
    c,
    "personalBest",
    "fontSize",
    fontSize,
  );
  const bestWinValueFontWeight = subValue(
    c,
    "personalBest",
    "fontWeight",
    c.fontWeight || 700,
  );
  const labelFontFamily = subValue(c, "label", "fontFamily", fontFamily);
  const labelFontSize = subValue(
    c,
    "label",
    "fontSize",
    Math.max(10, Math.round(Number(fontSize) * 0.88)),
  );
  const labelFontWeight = subValue(
    c,
    "label",
    "fontWeight",
    c.labelFontWeight || 700,
  );
  const rtpValueColor = subValue(c, "rtpValue", "textColor", textColor);
  const potentialValueColor = subValue(c, "maxWin", "textColor", textColor);
  const volatilityValueColor = subValue(
    c,
    "volatility",
    "textColor",
    textColor,
  );
  const bestWinValueColor = subValue(c, "personalBest", "textColor", textColor);
  const paddingX = subValue(c, "statCard", "padding", c.paddingX ?? 10);
  const paddingY = subValue(c, "statCard", "padding", c.paddingY ?? 4);
  const compactPaddingX = Math.max(0, Math.min(Number(paddingX) || 10, 32));
  const compactPaddingY = Math.max(0, Math.min(Number(paddingY) || 4, 18));
  const itemGap = Math.max(
    0,
    Math.min(subValue(c, "statCard", "gap", c.gap ?? 7), 32),
  );
  const shadow = subValue(c, "container", "shadow", undefined);
  const glow = subValue(c, "container", "glow", undefined);
  const backdropBlur = subValue(c, "container", "backdropBlur", 0);
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;
  const showSpinner = c.showSpinner !== false;
  const showProvider = c.showProvider !== false;
  const showRtp = c.showRtp !== false;
  const showPotential = c.showPotential !== false;
  const showVolatility = c.showVolatility !== false;
  const showBestWin = c.showBestWin !== false;
  const bestWinIconColor = subValue(
    c,
    "personalBest",
    "accentColor",
    c.bestWinIconColor || "#22c55e",
  );
  const spinnerColor = subValue(
    c,
    "spinner",
    "accentColor",
    resolveRtpSpinnerColor({ config: c, isMetal, metalPrimaryColor }),
  );
  const previewMode = c.previewMode === true;
  const currency = bhConfig.currency || c.currency || "€";

  /* ── Determine what to display ── */
  const isLive = !!slotName;

  /* ── Demo data for preview / empty state ── */
  const demoSlotName = "SWEET BONANZA";
  const demoProvider = "PRAGMATIC PLAY";
  const demoInfo = {
    rtp: 96.48,
    max_win_multiplier: 21175,
    volatility: "high",
  };
  const demoBestWin = { best_win: 8450, best_multiplier: 845 };

  /* ── When not live, show empty bar with dashes (widget stays visible in OBS) ── */
  const showDemoData = previewMode && !isLive;
  const showEmptyState = !isLive && !previewMode;

  const liveProvider =
    slotInfo?.provider ||
    activeSlot.provider ||
    currentBonus?.slot?.provider ||
    "";
  const displaySlotName = resolveLivePreviewValue({
    isLive,
    showDemoData,
    liveValue: slotName,
    demoValue: demoSlotName,
    emptyValue: "—",
  });
  const displayProvider = resolveLivePreviewValue({
    isLive,
    showDemoData,
    liveValue: liveProvider,
    demoValue: demoProvider,
    emptyValue: "",
  });
  const configuredProviderLogo = subValue(
    c,
    "provider",
    "imageUrl",
    c.providerLogoUrl || c.providerImageUrl || "",
  );
  const displayProviderLogo =
    configuredProviderLogo ||
    (displayProvider ? getProviderImage(displayProvider) : null);
  const providerExplicitWidth = subValue(c, "provider", "width", null);
  const providerExplicitHeight = subValue(c, "provider", "height", null);
  const displayInfo = resolveLivePreviewValue({
    isLive,
    showDemoData,
    liveValue: slotInfo || localSlotInfo,
    demoValue: demoInfo,
    emptyValue: null,
  });
  const currentHuntBestWin = useMemo(
    () =>
      resolveCurrentHuntBestWin({
        activeSlot,
        bonuses: bhConfig.bonuses,
        isLive,
      }),
    [activeSlot, bhConfig.bonuses, isLive],
  );
  const scopedBestWinData =
    bestWinData && recordMatchesSlot(bestWinData, activeSlot)
      ? bestWinData
      : null;
  const displayBestWin = resolveLivePreviewValue({
    isLive,
    showDemoData,
    liveValue: pickBestWinRecord([
      scopedBestWinData,
      configBestWin,
      currentHuntBestWin,
    ]),
    demoValue: demoBestWin,
    emptyValue: null,
  });
  const bestWinEmptyText = isLive ? "No personal best yet" : "-";

  const styleClass = resolveRtpStyleClass({ isVertical, ...styleFlags });

  const rootStyle = buildRtpRootStyle({
    fontFamily,
    fontSize,
    widgetScale: c.widgetScale,
    brightness,
    contrast,
    saturation,
    barBgFrom,
    barBgVia,
    barBgTo,
    metalPrimaryColor,
    metalSecondaryColor,
    borderColor,
    borderWidth,
    borderRadius,
    textColor,
    providerColor,
    slotNameColor,
    labelColor,
    rtpValueColor,
    potentialValueColor,
    volatilityValueColor,
    bestWinValueColor,
    rtpIconColor,
    potentialIconColor,
    volatilityIconColor,
    dividerColor,
    spinnerColor,
    compactPaddingX,
    compactPaddingY,
    providerFontFamily,
    providerFontSize,
    providerFontWeight,
    providerLogoWidth,
    providerLogoHeight,
    providerLogoRadius,
    providerLogoFit,
    slotTitleFontFamily,
    slotTitleFontSize,
    slotTitleFontWeight,
    rtpValueFontFamily,
    rtpValueFontSize,
    rtpValueFontWeight,
    potentialValueFontFamily,
    potentialValueFontSize,
    potentialValueFontWeight,
    volatilityValueFontFamily,
    volatilityValueFontSize,
    volatilityValueFontWeight,
    bestWinValueFontFamily,
    bestWinValueFontSize,
    bestWinValueFontWeight,
    labelFontFamily,
    labelFontSize,
    labelFontWeight,
    itemGap,
    barHeight,
    maxWidth,
    bestWinIconColor,
    shadow,
    glow,
    backdropBlur,
    isNeon,
  });
  const containerStyle = subElementStyle(c, "container");
  const statCardStyle = subElementStyle(c, "statCard");
  const cardSurfaceStyle = {
    ...statCardStyle,
    ...containerStyle,
  };
  const resolvedStatCardStyle = resolveRtpStatCardStyle({
    isStyleSeca,
    isMetal,
    cardSurfaceStyle,
    borderWidth,
    metalPrimaryColor,
    metalSecondaryColor,
    styleSecaValue,
  });
  const rawProviderStyle = subElementStyle(c, "provider");
  const providerStyle = resolveRtpProviderStyle({
    displayProviderLogo,
    rawProviderStyle,
    providerExplicitWidth,
    providerExplicitHeight,
    providerLogoWidth,
    providerLogoHeight,
  });
  const slotTitleStyle = flexSizedStyle(subElementStyle(c, "slotTitle"));
  const rtpValueStyle = flexSizedStyle(subElementStyle(c, "rtpValue"), "flex");
  const maxWinStyle = flexSizedStyle(subElementStyle(c, "maxWin"), "flex");
  const volatilityStyle = flexSizedStyle(
    subElementStyle(c, "volatility"),
    "flex",
  );
  const rawPersonalBestStyle = flexSizedStyle(
    subElementStyle(c, "personalBest"),
    "flex",
  );
  const labelStyle = subElementStyle(c, "label");
  const {
    personalBestStyle,
    bestWinLabelStyle,
    bestWinValueStyle,
    bestWinGroupStyle,
  } = resolveBestWinDisplayStyles({
    isVertical,
    rawPersonalBestStyle,
    labelStyle,
  });
  const dividerStyle = subElementStyle(c, "divider");
  const spinnerStyle = subElementStyle(c, "spinner");

  return (
    <div
      className={`oc-widget-inner rtp-stats-bar${styleClass}`}
      {...partAttrs("container")}
      style={rootStyle}
    >
      <div
        className={resolveRtpInnerClassName({
          isLive,
          previewMode,
          showEmptyState,
        })}
        {...partAttrs("statCard")}
        style={resolvedStatCardStyle}
      >
        <RtpStatsPreviewBadge isLive={isLive} previewMode={previewMode} />
        <RtpStatsLeftSection
          showProvider={showProvider}
          displayProvider={displayProvider}
          displayProviderLogo={displayProviderLogo}
          providerStyle={providerStyle}
          dividerStyle={dividerStyle}
          showSpinner={showSpinner}
          spinnerStyle={spinnerStyle}
          displaySlotName={displaySlotName}
          slotTitleStyle={slotTitleStyle}
          showRtp={showRtp}
          showPotential={showPotential}
          showVolatility={showVolatility}
          displayInfo={displayInfo}
          rtpValueStyle={rtpValueStyle}
          maxWinStyle={maxWinStyle}
          volatilityStyle={volatilityStyle}
          labelStyle={labelStyle}
        />
        <RtpStatsBestWinSection
          showBestWin={showBestWin}
          bestWinGroupStyle={bestWinGroupStyle}
          personalBestStyle={personalBestStyle}
          bestWinValueStyle={bestWinValueStyle}
          bestWinLabelStyle={bestWinLabelStyle}
          displayBestWin={displayBestWin}
          currency={currency}
          bestWinEmptyText={bestWinEmptyText}
        />
      </div>
    </div>
  );
}

export default React.memo(RtpStatsWidget);
