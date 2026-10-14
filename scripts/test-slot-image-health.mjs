import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  findBrokenSlotImages,
  getImmediateSlotImageIssue,
  probeSlotImage,
} from '../src/utils/slotImageHealth.js';

class TestImage {
  set src(value) {
    this._src = value;
    queueMicrotask(() => {
      if (value.includes('working')) {
        this.naturalWidth = 320;
        this.naturalHeight = 480;
        this.onload?.();
      } else {
        this.onerror?.(new Error('failed'));
      }
    });
  }

  get src() {
    return this._src;
  }
}

assert.equal(getImmediateSlotImageIssue(''), 'Missing image URL');
assert.equal(getImmediateSlotImageIssue('/placeholder.webp'), 'Placeholder image');
assert.equal(getImmediateSlotImageIssue('javascript:alert(1)'), 'Invalid image URL');
assert.equal(getImmediateSlotImageIssue('https://images.example/working.webp'), '');

assert.deepEqual(
  await probeSlotImage('https://images.example/working.webp', { ImageCtor: TestImage }),
  { broken: false, reason: '' },
);
assert.deepEqual(
  await probeSlotImage('https://images.example/broken.webp', { ImageCtor: TestImage }),
  { broken: true, reason: 'Image failed to load' },
);

let probes = 0;
const cache = new Map();
const progress = [];
const slots = [
  { id: '1', name: 'Working', image: 'https://images.example/working.webp' },
  { id: '2', name: 'Broken A', image: 'https://images.example/broken.webp' },
  { id: '3', name: 'Broken duplicate', image: 'https://images.example/broken.webp' },
  { id: '4', name: 'Missing', image: '' },
];
const broken = await findBrokenSlotImages(slots, {
  cache,
  concurrency: 1,
  probe: async source => {
    probes += 1;
    return probeSlotImage(source, { ImageCtor: TestImage });
  },
  onProgress: value => progress.push(value),
});

assert.deepEqual(broken.map(slot => slot.name), ['Broken A', 'Broken duplicate', 'Missing']);
assert.equal(broken[0].imageLinkIssue, 'Image failed to load');
assert.equal(broken[2].imageLinkIssue, 'Missing image URL');
assert.equal(probes, 3, 'Duplicate URLs should use the shared scan cache');
assert.deepEqual(progress.at(-1), { checked: 4, total: 4, broken: 3 });

const component = readFileSync(new URL('../src/components/SlotManager/SlotManagerV2.jsx', import.meta.url), 'utf8');
assert.match(component, /IMAGE_SCAN_BATCH_SIZE = 1000/);
assert.match(component, /for \(let from = 0; ; from \+= IMAGE_SCAN_BATCH_SIZE\)/);
assert.match(component, /Checking every matching slot image/);
assert.match(component, /No broken image links/);
assert.match(component, /refreshVisibleSlots\(\)/);

console.log('Slot image link audit passed: validation, browser load failures, placeholders, duplicate caching, progress, full-catalog batching and repair refresh wiring.');
