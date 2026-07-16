import { defaultsFromSchema } from '../shared/settings/settingsResolver.js';
import { statisticCardV2Schema } from './schema.js';

export const statisticCardV2Defaults = Object.freeze(defaultsFromSchema(statisticCardV2Schema));

export default statisticCardV2Defaults;
