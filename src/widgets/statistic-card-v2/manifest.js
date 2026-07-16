import StatisticCardV2Renderer from './renderer.jsx';
import { statisticCardV2Defaults } from './defaults.js';
import { statisticCardV2Schema } from './schema.js';
import { statisticCardV2MockData } from './mockData.js';
import { statisticCardV2Migrations } from './migrations.js';
import { validateWidgetSettings } from '../shared/settings/settingsResolver.js';

export const statisticCardV2Manifest = Object.freeze({
  id: 'statistic-card-v2',
  name: 'Statistic Card',
  version: 2,
  category: 'statistics',
  description: 'A scoped reference widget for displaying one headline metric with optional icon and progress bar.',
  renderer: StatisticCardV2Renderer,
  previewRenderer: StatisticCardV2Renderer,
  supportsAppearanceStudio: true,
  appearanceEditorVersion: 'studio-v2',
  defaultSettings: statisticCardV2Defaults,
  settingsSchema: statisticCardV2Schema,
  dataSchema: Object.freeze({
    required: ['value'],
    optional: ['header', 'secondaryLabel', 'progressValue', 'trend'],
  }),
  mockData: statisticCardV2MockData,
  validate(settings) {
    return validateWidgetSettings(settings, statisticCardV2Schema);
  },
  responsive: Object.freeze({
    minWidth: 180,
    maxWidth: 900,
    minHeight: 120,
    maxHeight: 600,
    recommendedObsWidth: 360,
    recommendedObsHeight: 190,
    supportsMobilePreview: true,
  }),
  migrations: statisticCardV2Migrations,
  documentation: Object.freeze({
    path: 'DOCs/widget-studio-v2/statistic-card-v2.md',
    purpose: 'Reference implementation for schema-generated appearance controls.',
    emptyState: 'Falls back to default text and zero progress.',
    animation: 'Fade, slide, pulse or none; respects reduced motion.',
  }),
  featureFlags: [],
  deprecated: false,
});

export default statisticCardV2Manifest;
