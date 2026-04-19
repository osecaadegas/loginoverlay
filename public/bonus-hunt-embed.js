/**
 * BonusHuntEmbed — Drop-in widget for external streamer websites.
 * 
 * Usage:
 *   <div id="bonus-hunt-widget"></div>
 *   <script src="https://YOUR_DOMAIN/bonus-hunt-embed.js"></script>
 *   <script>
 *     BonusHuntEmbed.init({
 *       apiKey: 'YOUR_API_KEY',
 *       target: '#bonus-hunt-widget',
 *       theme: 'dark',
 *       autoRefresh: true,
 *       refreshInterval: 5000,
 *       showBonusList: true,
 *     });
 *   </script>
 */
(function () {
  'use strict';

  const API_BASE = (function () {
    const scripts = document.querySelectorAll('script[src*="bonus-hunt-embed"]');
    if (scripts.length > 0) {
      const src = scripts[scripts.length - 1].src;
      return new URL(src).origin;
    }
    return '';
  })();

  const STYLES = {
    dark: {
      bg: '#0f172a',
      card: '#1e293b',
      border: '#334155',
      text: '#e5e7eb',
      textMuted: '#9ca3af',
      accent: '#8b5cf6',
      green: '#10b981',
      red: '#ef4444',
      yellow: '#f59e0b',
    },
    light: {
      bg: '#f8fafc',
      card: '#ffffff',
      border: '#e2e8f0',
      text: '#1e293b',
      textMuted: '#64748b',
      accent: '#7c3aed',
      green: '#059669',
      red: '#dc2626',
      yellow: '#d97706',
    },
  };

  function formatNum(n) {
    if (n == null) return '-';
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function BonusHuntEmbed() {
    this._interval = null;
    this._target = null;
    this._opts = {};
  }

  BonusHuntEmbed.prototype.init = function (opts) {
    this._opts = Object.assign({
      apiKey: '',
      target: '#bonus-hunt-widget',
      theme: 'dark',
      autoRefresh: true,
      refreshInterval: 5000,
      showBonusList: true,
      showHeader: true,
      compact: false,
    }, opts);

    if (!this._opts.apiKey) {
      console.error('[BonusHuntEmbed] Missing apiKey');
      return;
    }

    this._target = typeof this._opts.target === 'string'
      ? document.querySelector(this._opts.target)
      : this._opts.target;

    if (!this._target) {
      console.error('[BonusHuntEmbed] Target element not found:', this._opts.target);
      return;
    }

    this.refresh();
    if (this._opts.autoRefresh) {
      this._interval = setInterval(() => this.refresh(), Math.max(this._opts.refreshInterval, 3000));
    }
  };

  BonusHuntEmbed.prototype.destroy = function () {
    if (this._interval) clearInterval(this._interval);
    if (this._target) this._target.innerHTML = '';
  };

  BonusHuntEmbed.prototype.refresh = async function () {
    try {
      const url = API_BASE + '/api/streamer-data?action=bonus_hunt&key=' + encodeURIComponent(this._opts.apiKey);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('API error: ' + resp.status);
      const data = await resp.json();
      this.render(data);
    } catch (err) {
      console.error('[BonusHuntEmbed] Fetch error:', err);
      if (this._target && !this._target.hasChildNodes()) {
        this._target.innerHTML = '<div style="padding:1rem;color:#ef4444;">Failed to load bonus hunt data.</div>';
      }
    }
  };

  BonusHuntEmbed.prototype.render = function (data) {
    const t = STYLES[this._opts.theme] || STYLES.dark;
    const s = data.stats || {};
    const compact = this._opts.compact;

    if (!data.active && data.phase === 'idle') {
      this._target.innerHTML = '<div style="padding:1rem;text-align:center;color:' + t.textMuted + ';font-family:sans-serif;">No active bonus hunt right now.</div>';
      return;
    }

    const phaseLabels = { building: '🔨 Building', opening: '🎰 Opening', completed: '✅ Completed', idle: '💤 Idle' };
    const phaseColors = { building: t.yellow, opening: t.accent, completed: t.green, idle: t.textMuted };

    let html = '<div style="font-family:sans-serif;background:' + t.bg + ';border-radius:12px;border:1px solid ' + t.border + ';overflow:hidden;">';

    // Header
    if (this._opts.showHeader) {
      html += '<div style="padding:0.75rem 1rem;background:' + t.card + ';border-bottom:1px solid ' + t.border + ';display:flex;justify-content:space-between;align-items:center;">';
      html += '<div style="font-weight:700;color:' + t.text + ';font-size:' + (compact ? '0.9rem' : '1.1rem') + ';">' + (data.hunt_name || 'Bonus Hunt') + '</div>';
      html += '<div style="padding:0.15rem 0.6rem;border-radius:20px;font-size:0.75rem;font-weight:600;background:' + phaseColors[data.phase] + '22;color:' + phaseColors[data.phase] + ';">' + (phaseLabels[data.phase] || data.phase) + '</div>';
      html += '</div>';
    }

    // Stats grid
    html += '<div style="display:grid;grid-template-columns:repeat(' + (compact ? '2' : '4') + ',1fr);gap:1px;background:' + t.border + ';">';
    const stats = [
      { label: 'Bonuses', value: s.opened + '/' + s.total_bonuses, color: t.text },
      { label: 'Total Bet', value: (data.currency || '€') + formatNum(s.total_bet), color: t.text },
      { label: 'Total Win', value: (data.currency || '€') + formatNum(s.total_win), color: s.total_win > s.total_bet ? t.green : t.text },
      { label: 'Profit', value: (data.currency || '€') + formatNum(s.profit), color: s.profit >= 0 ? t.green : t.red },
    ];
    if (!compact) {
      stats.push(
        { label: 'Start', value: (data.currency || '€') + formatNum(data.start_amount), color: t.textMuted },
        { label: 'Avg Multi', value: s.avg_multi + 'x', color: t.accent },
        { label: 'Remaining', value: String(s.remaining), color: t.yellow },
        { label: 'Progress', value: (s.total_bonuses > 0 ? Math.round((s.opened / s.total_bonuses) * 100) : 0) + '%', color: t.accent },
      );
    }
    stats.forEach(function (st) {
      html += '<div style="background:' + t.bg + ';padding:' + (compact ? '0.4rem 0.5rem' : '0.6rem 0.75rem') + ';text-align:center;">';
      html += '<div style="font-size:0.65rem;color:' + t.textMuted + ';text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">' + st.label + '</div>';
      html += '<div style="font-weight:700;color:' + st.color + ';font-size:' + (compact ? '0.85rem' : '1rem') + ';">' + st.value + '</div>';
      html += '</div>';
    });
    html += '</div>';

    // Progress bar
    if (s.total_bonuses > 0) {
      const pct = Math.round((s.opened / s.total_bonuses) * 100);
      html += '<div style="padding:0.5rem 1rem;">';
      html += '<div style="background:' + t.card + ';border-radius:6px;height:8px;overflow:hidden;">';
      html += '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,' + t.accent + ',' + t.green + ');border-radius:6px;transition:width 0.5s ease;"></div>';
      html += '</div></div>';
    }

    // Bonus list
    if (this._opts.showBonusList && data.bonuses && data.bonuses.length > 0) {
      html += '<div style="max-height:300px;overflow-y:auto;border-top:1px solid ' + t.border + ';">';
      data.bonuses.forEach(function (b, i) {
        const isOpened = b.result != null;
        const multiColor = b.multi && b.multi >= 2 ? t.green : b.multi && b.multi < 1 ? t.red : t.text;
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.75rem;border-bottom:1px solid ' + t.border + ';background:' + (isOpened ? t.bg : t.card) + ';">';
        html += '<div style="display:flex;align-items:center;gap:0.5rem;">';
        html += '<span style="color:' + t.textMuted + ';font-size:0.7rem;width:20px;">#' + (i + 1) + '</span>';
        if (b.image) html += '<img src="' + b.image + '" style="width:24px;height:24px;border-radius:4px;object-fit:cover;" />';
        html += '<span style="color:' + t.text + ';font-size:0.85rem;">' + (b.slot || 'Unknown') + '</span>';
        if (b.is_super) html += '<span style="font-size:0.65rem;background:' + t.yellow + '33;color:' + t.yellow + ';padding:0 4px;border-radius:3px;">SUPER</span>';
        html += '</div>';
        html += '<div style="display:flex;align-items:center;gap:0.75rem;font-size:0.85rem;">';
        html += '<span style="color:' + t.textMuted + ';">' + (data.currency || '€') + formatNum(b.bet) + '</span>';
        if (isOpened) {
          html += '<span style="color:' + t.text + ';font-weight:600;">' + (data.currency || '€') + formatNum(b.result) + '</span>';
          html += '<span style="color:' + multiColor + ';font-weight:600;min-width:45px;text-align:right;">' + (b.multi || 0) + 'x</span>';
        } else {
          html += '<span style="color:' + t.textMuted + ';font-style:italic;">pending</span>';
        }
        html += '</div></div>';
      });
      html += '</div>';
    }

    html += '</div>';
    this._target.innerHTML = html;
  };

  // Export
  window.BonusHuntEmbed = new BonusHuntEmbed();
})();
