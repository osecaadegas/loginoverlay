function firstFilledString(values = []) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const trimmed = String(value).trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function formatHuntDate(value = new Date()) {
  if (typeof value === "string") return value.trim();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

export function formatBonusHuntNumber(value) {
  const raw = firstFilledString([value]);
  if (!raw) return "";
  const normalized = raw
    .replace(/^hunt\s*#?\s*/i, "")
    .replace(/^#\s*/, "")
    .trim();
  return `Hunt #${normalized || raw}`;
}

export function buildBonusHuntName(config = {}, options = {}) {
  const fallback =
    options.fallback === undefined ? "Bonus Hunt" : options.fallback;
  const casinoName = firstFilledString([
    config.casinoName,
    config.casino_name,
    config.casino,
  ]);
  const huntNumberLabel = formatBonusHuntNumber(
    firstFilledString([
      config.huntNumber,
      config.hunt_number,
      config.huntNo,
      config.hunt_no,
    ]),
  );
  const configParts = [casinoName, huntNumberLabel].filter(Boolean);

  if (configParts.length > 0) {
    if (options.includeDate) {
      const date = formatHuntDate(options.date);
      if (date) configParts.push(date);
    }
    return configParts.join(" / ");
  }

  return (
    firstFilledString([config.huntName, config.hunt_name, config.name]) ||
    fallback
  );
}

export function buildBonusHuntSaveName(config = {}, options = {}) {
  const date = formatHuntDate(options.date);
  const fallback = options.fallback ?? (date ? `Hunt ${date}` : "Hunt");
  return buildBonusHuntName(config, {
    ...options,
    fallback,
    includeDate: true,
  });
}
