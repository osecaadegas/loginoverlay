import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const testPath = fileURLToPath(new URL('./test_gpu_renderer_api.js', import.meta.url));
const require = createRequire(import.meta.url);
const source = readFileSync(testPath, 'utf8');
new Function('require', '__dirname', '__filename', source)(require, dirname(testPath), testPath);
