const LEGACY_MINIMUM_PARTICIPANTS_COPY = "min 30 participants";

export function normalizeGiveawaySubtitle(value) {
  const subtitle = String(value || "").trim();
  const comparable = subtitle
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return comparable === LEGACY_MINIMUM_PARTICIPANTS_COPY ? "" : subtitle;
}
