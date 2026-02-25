import React, { useMemo, useState, useEffect } from 'react';

/* ─── Embedded KNOWN_SLOTS database (same as api/fetch-slot-info.js) ─── */
const KNOWN_SLOTS = {
  'sweet bonanza': { provider: 'Pragmatic Play', rtp: 96.48, volatility: 'high', max_win_multiplier: 21175 },
  'gates of olympus': { provider: 'Pragmatic Play', rtp: 96.50, volatility: 'high', max_win_multiplier: 5000 },
  'wanted dead or a wild': { provider: 'Hacksaw Gaming', rtp: 96.38, volatility: 'very_high', max_win_multiplier: 12500 },
  'dog house megaways': { provider: 'Pragmatic Play', rtp: 96.55, volatility: 'high', max_win_multiplier: 12305 },
  'big bass bonanza': { provider: 'Pragmatic Play', rtp: 96.71, volatility: 'high', max_win_multiplier: 2100 },
  'sugar rush': { provider: 'Pragmatic Play', rtp: 96.50, volatility: 'high', max_win_multiplier: 5000 },
  'starlight princess': { provider: 'Pragmatic Play', rtp: 96.50, volatility: 'high', max_win_multiplier: 5000 },
  'mental': { provider: 'Nolimit City', rtp: 96.08, volatility: 'very_high', max_win_multiplier: 66666 },
  'san quentin': { provider: 'Nolimit City', rtp: 96.03, volatility: 'very_high', max_win_multiplier: 150000 },
  'fire in the hole': { provider: 'Nolimit City', rtp: 96.06, volatility: 'very_high', max_win_multiplier: 60000 },
  'tombstone rip': { provider: 'Nolimit City', rtp: 96.08, volatility: 'very_high', max_win_multiplier: 300000 },
  'razor shark': { provider: 'Push Gaming', rtp: 96.70, volatility: 'high', max_win_multiplier: 50000 },
  'book of dead': { provider: "Play'n GO", rtp: 96.21, volatility: 'high', max_win_multiplier: 5000 },
  'reactoonz': { provider: "Play'n GO", rtp: 96.51, volatility: 'high', max_win_multiplier: 4570 },
  'fruit party': { provider: 'Pragmatic Play', rtp: 96.47, volatility: 'high', max_win_multiplier: 5000 },
  'wild west gold': { provider: 'Pragmatic Play', rtp: 96.51, volatility: 'high', max_win_multiplier: 10000 },
  'dead or alive 2': { provider: 'NetEnt', rtp: 96.80, volatility: 'very_high', max_win_multiplier: 111111 },
  "gonzo's quest": { provider: 'NetEnt', rtp: 95.97, volatility: 'medium', max_win_multiplier: 2500 },
  'chaos crew': { provider: 'Hacksaw Gaming', rtp: 96.35, volatility: 'very_high', max_win_multiplier: 10000 },
  'money train 3': { provider: 'Relax Gaming', rtp: 96.00, volatility: 'very_high', max_win_multiplier: 100000 },
};

/* ─── Fuzzy slot lookup ─── */
function findSlotInfo(name) {
  if (!name) return null;
  const normalized = name.toLowerCase().trim();

  // Exact match
  if (KNOWN_SLOTS[normalized]) return KNOWN_SLOTS[normalized];

  // Partial match
  for (const [key, data] of Object.entries(KNOWN_SLOTS)) {
    if (normalized.includes(key) || key.includes(normalized)) return data;
  }
  return null;
}

/* ─── API fallback ─── */
async function fetchSlotInfoAPI(name) {
  try {
    const res = await fetch('/api/fetch-slot-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/* ─── Volatility formatting ─── */
function fmtVolatility(v) {
  if (!v) return '—';
  return v.replace(/_/g, ' ').toUpperCase();
}

/* ─── Format max win multiplier ─── */
function fmtMultiplier(m) {
  if (!m) return '—';
  return `x${Number(m).toLocaleString()}`;
}

/* ─── Main widget ─── */
export default function RtpStatsWidget({ config, theme, allWidgets }) {
  const c = config || {};
  const [apiData, setApiData] = useState(null);
  const [lastSlotName, setLastSlotName] = useState('');

  /* ── Find bonus hunt widget ── */
  const bhWidget = useMemo(() => {
    return (allWidgets || []).find(w =>
      w.widget_type === 'bonus_hunt' && w.config
    );
  }, [allWidgets]);

  const bhConfig = bhWidget?.config || {};
  const bonusOpening = bhConfig.bonusOpening === true;
  const bonuses = bhConfig.bonuses || [];

  /* ── Current bonus (first unopened) ── */
  const currentBonus = useMemo(() => bonuses.find(b => !b.opened), [bonuses]);
  const slotName = currentBonus?.slotName || '';

  /* ── Slot info (local DB first, API fallback) ── */
  const localInfo = useMemo(() => findSlotInfo(slotName), [slotName]);

  useEffect(() => {
    if (!slotName || slotName === lastSlotName) return;
    if (localInfo) {
      setApiData(null);
      setLastSlotName(slotName);
      return;
    }
    // Fallback to API
    setLastSlotName(slotName);
    fetchSlotInfoAPI(slotName).then(data => {
      if (data) setApiData(data);
    });
  }, [slotName, localInfo, lastSlotName]);

  const slotInfo = localInfo || apiData;

  /* ── Style config ── */
  const barBgFrom = c.barBgFrom || '#111827';
  const barBgVia = c.barBgVia || '#1e3a5f';
  const barBgTo = c.barBgTo || '#111827';
  const borderColor = c.borderColor || '#1d4ed8';
  const borderWidth = c.borderWidth ?? 1;
  const borderRadius = c.borderRadius ?? 8;
  const textColor = c.textColor || '#ffffff';
  const providerColor = c.providerColor || '#ffffff';
  const slotNameColor = c.slotNameColor || '#ffffff';
  const labelColor = c.labelColor || '#94a3b8';
  const rtpIconColor = c.rtpIconColor || '#60a5fa';
  const potentialIconColor = c.potentialIconColor || '#facc15';
  const volatilityIconColor = c.volatilityIconColor || '#3b82f6';
  const dividerColor = c.dividerColor || '#3b82f6';
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const fontSize = c.fontSize ?? 14;
  const providerFontSize = c.providerFontSize ?? 16;
  const paddingX = c.paddingX ?? 16;
  const paddingY = c.paddingY ?? 8;
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;
  const showSpinner = c.showSpinner !== false;
  const showProvider = c.showProvider !== false;
  const showRtp = c.showRtp !== false;
  const showPotential = c.showPotential !== false;
  const showVolatility = c.showVolatility !== false;
  const spinnerColor = c.spinnerColor || '#60a5fa';

  /* ── Hide if bonus opening is not active ── */
  if (!bonusOpening) return null;

  /* ── Hide if no current bonus ── */
  if (!currentBonus) return null;

  const provider = slotInfo?.provider || currentBonus?.slot?.provider || '';

  const rootStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    filter: (brightness !== 100 || contrast !== 100 || saturation !== 100)
      ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
      : undefined,
    '--rtp-bg-from': barBgFrom,
    '--rtp-bg-via': barBgVia,
    '--rtp-bg-to': barBgTo,
    '--rtp-border-color': borderColor,
    '--rtp-border-width': `${borderWidth}px`,
    '--rtp-border-radius': `${borderRadius}px`,
    '--rtp-text': textColor,
    '--rtp-provider': providerColor,
    '--rtp-slot-name': slotNameColor,
    '--rtp-label': labelColor,
    '--rtp-icon-rtp': rtpIconColor,
    '--rtp-icon-potential': potentialIconColor,
    '--rtp-icon-volatility': volatilityIconColor,
    '--rtp-divider': dividerColor,
    '--rtp-spinner': spinnerColor,
    '--rtp-px': `${paddingX}px`,
    '--rtp-py': `${paddingY}px`,
    '--rtp-provider-size': `${providerFontSize}px`,
  };

  return (
    <div className="oc-widget-inner rtp-stats-bar" style={rootStyle}>
      <div className="rtp-stats-inner">

        {/* ═══ Left Section — Provider + Slot Name ═══ */}
        <div className="rtp-stats-left">
          {showProvider && provider && (
            <>
              <span className="rtp-stats-provider">{provider.toUpperCase()}</span>
              <div className="rtp-stats-divider" />
            </>
          )}
          <div className="rtp-stats-slot">
            {showSpinner && (
              <svg className="rtp-stats-spinner" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z" opacity="0.25" />
                <path d="M22 12A10 10 0 0 1 12 22v-2a8 8 0 0 0 8-8z" />
              </svg>
            )}
            <span className="rtp-stats-slot-name">{slotName.toUpperCase()}</span>
          </div>
        </div>

        {/* ═══ Right Section — RTP / Potential / Volatility ═══ */}
        <div className="rtp-stats-right">
          {showRtp && (
            <div className="rtp-stats-item rtp-stats-item--rtp">
              <span className="rtp-stats-icon">⚡</span>
              <span className="rtp-stats-value">
                <span className="rtp-stats-label">RTP </span>
                {slotInfo?.rtp ? `${slotInfo.rtp}%` : '—'}
              </span>
            </div>
          )}

          {showPotential && (
            <div className="rtp-stats-item rtp-stats-item--potential">
              <span className="rtp-stats-icon">⚡</span>
              <span className="rtp-stats-value">
                <span className="rtp-stats-label">POTENTIAL </span>
                {fmtMultiplier(slotInfo?.max_win_multiplier)}
              </span>
            </div>
          )}

          {showVolatility && (
            <div className="rtp-stats-item rtp-stats-item--volatility">
              <span className="rtp-stats-icon">⚡</span>
              <span className="rtp-stats-value">
                <span className="rtp-stats-label">VOLATILITY </span>
                {fmtVolatility(slotInfo?.volatility)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
