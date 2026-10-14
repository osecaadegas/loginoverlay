const PLACEHOLDER_IMAGES = new Set([
  '/placeholder.webp',
  '/placeholder.png',
  'https://i.imgur.com/8E3ucNx.png',
]);

const abortError = () => {
  const error = new Error('Image link scan cancelled');
  error.name = 'AbortError';
  return error;
};

export const getSlotImageHealthKey = source => String(source || '').trim();

export function getImmediateSlotImageIssue(source) {
  const normalized = getSlotImageHealthKey(source);
  if (!normalized) return 'Missing image URL';
  if (PLACEHOLDER_IMAGES.has(normalized)) return 'Placeholder image';

  try {
    const baseUrl = globalThis.location?.href || 'https://streamerscenter.invalid/';
    const url = new URL(normalized, baseUrl);
    if (!['http:', 'https:', 'data:', 'blob:'].includes(url.protocol)) return 'Invalid image URL';
  } catch {
    return 'Invalid image URL';
  }

  return '';
}

export function probeSlotImage(source, { ImageCtor = globalThis.Image, signal, timeoutMs = 10000 } = {}) {
  const normalized = getSlotImageHealthKey(source);
  const immediateIssue = getImmediateSlotImageIssue(normalized);
  if (immediateIssue) return Promise.resolve({ broken: true, reason: immediateIssue });
  if (signal?.aborted) return Promise.reject(abortError());
  if (typeof ImageCtor !== 'function') return Promise.resolve({ broken: true, reason: 'Image check unavailable' });

  return new Promise((resolve, reject) => {
    const image = new ImageCtor();
    let settled = false;
    let timer;

    const cleanup = () => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener('abort', onAbort);
    };
    const finish = result => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      image.src = '';
      reject(abortError());
    };

    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0
      ? { broken: false, reason: '' }
      : { broken: true, reason: 'Image has no dimensions' });
    image.onerror = () => finish({ broken: true, reason: 'Image failed to load' });
    signal?.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => finish({ broken: true, reason: 'Image load timed out' }), timeoutMs);
    image.decoding = 'async';
    image.src = normalized;
  });
}

export async function findBrokenSlotImages(slots, {
  cache = new Map(),
  concurrency = 16,
  onProgress,
  probe = probeSlotImage,
  signal,
} = {}) {
  const records = Array.isArray(slots) ? slots : [];
  const results = new Array(records.length);
  let cursor = 0;
  let checked = 0;
  let broken = 0;

  const worker = async () => {
    while (true) {
      if (signal?.aborted) throw abortError();
      const index = cursor++;
      if (index >= records.length) return;
      const slot = records[index];
      const key = getSlotImageHealthKey(slot?.image);
      let cachedHealth = cache.get(key);
      if (!cachedHealth) {
        cachedHealth = Promise.resolve(probe(slot?.image, { signal }));
        cache.set(key, cachedHealth);
      }
      let health;
      try {
        health = await cachedHealth;
        cache.set(key, health);
      } catch (error) {
        if (cache.get(key) === cachedHealth) cache.delete(key);
        throw error;
      }
      results[index] = { ...slot, imageLinkIssue: health.broken ? health.reason : '' };
      checked += 1;
      if (health.broken) broken += 1;
      onProgress?.({ checked, total: records.length, broken });
    }
  };

  const workerCount = Math.min(Math.max(1, concurrency), Math.max(1, records.length));
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results.filter(result => result.imageLinkIssue);
}
