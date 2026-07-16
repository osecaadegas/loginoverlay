import {
  validateEditorReadyWidgetRegistry,
} from '../src/components/OverlayCenter/widgets/editorReadyWidgetRegistry.js';

const result = validateEditorReadyWidgetRegistry();

if (!result.valid) {
  console.error('widget contract validation failed');
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('widget contract validation passed');
