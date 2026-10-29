import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { userFacingError } from '../api/slot-detector.js';

for (const column of ['device_panel_id', 'suggestion_dismissed_at']) {
  const result = userFacingError({ code: 'PGRST204', message: `Could not find the '${column}' column` });
  assert.equal(result.statusCode, 503);
  assert.match(result.message, /repair migration/);
}
const migration = await readFile(new URL('../migrations/20261029121000_repair_slot_detector_suggestions.sql', import.meta.url), 'utf8');
assert.match(migration, /ADD COLUMN IF NOT EXISTS device_panel_id text/i);
assert.match(migration, /ADD COLUMN IF NOT EXISTS suggestion_dismissed_at timestamptz/i);
assert.match(migration, /NOTIFY pgrst, 'reload schema'/i);
console.log('Slot Detector schema repair and actionable errors verified.');
