import React, { useMemo } from 'react';
import { getByPath, settingsToCssVariables } from '../shared/settings/settingsResolver.js';
import { statisticCardV2Schema } from './schema.js';
import styles from './styles.module.css';

const SHADOWS = Object.freeze({
  none: 'none',
  soft: '0 10px 24px rgba(0, 0, 0, 0.22)',
  medium: '0 18px 42px rgba(0, 0, 0, 0.34)',
  strong: '0 28px 70px rgba(0, 0, 0, 0.48)',
});

const GLOWS = Object.freeze({
  none: '0 0 0 transparent',
  subtle: '0 0 18px color-mix(in srgb, var(--stat-card-border-color) 28%, transparent)',
  medium: '0 0 34px color-mix(in srgb, var(--stat-card-border-color) 42%, transparent)',
  strong: '0 0 58px color-mix(in srgb, var(--stat-card-border-color) 58%, transparent)',
});

export default function StatisticCardV2Renderer({
  settings,
  data = {},
  instanceId = 'default',
  className = '',
}) {
  const cssVars = useMemo(() => {
    const vars = settingsToCssVariables(settings, statisticCardV2Schema);
    vars['--stat-card-shadow'] = SHADOWS[getByPath(settings, 'effects.shadow')] || SHADOWS.medium;
    vars['--stat-card-glow'] = GLOWS[getByPath(settings, 'effects.glow')] || GLOWS.subtle;
    vars['--stat-card-progress-value'] = Number(getByPath(settings, 'progress.value') ?? data.progressValue ?? 0);
    return vars;
  }, [data.progressValue, settings]);

  const header = getByPath(settings, 'content.header') || data.header || '';
  const value = data.value ?? getByPath(settings, 'content.value');
  const secondaryLabel = data.secondaryLabel ?? getByPath(settings, 'content.secondaryLabel');
  const icon = getByPath(settings, 'content.icon');
  const showIcon = getByPath(settings, 'icon.visible') !== false;
  const showProgress = getByPath(settings, 'progress.visible') !== false;
  const animation = getByPath(settings, 'animation.type') || 'none';

  return (
    <article
      className={`${styles.root} ${className}`.trim()}
      style={cssVars}
      data-widget-id="statistic-card-v2"
      data-widget-instance={instanceId}
      data-widget-version="2"
      data-animation={animation}
    >
      <div className={styles.top} data-widget-element="top-row">
        <h2 className={styles.header} data-widget-element="header">{header}</h2>
        {showIcon && <span className={styles.icon} data-widget-element="icon" aria-hidden="true">{icon}</span>}
      </div>
      <div data-widget-element="body">
        <p className={styles.value} data-widget-element="value">{value}</p>
        <p className={styles.label} data-widget-element="secondary-label">{secondaryLabel}</p>
      </div>
      {showProgress && (
        <div className={styles.progress} data-widget-element="progress" aria-hidden="true">
          <span className={styles.progressFill} />
        </div>
      )}
    </article>
  );
}
