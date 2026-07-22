export function createTimeoutError(label, timeoutMs) {
  const seconds = Math.round(timeoutMs / 1000);
  const error = new Error(`${label} timed out after ${seconds}s`);
  error.name = 'TimeoutError';
  return error;
}

export async function withTimeout(promise, timeoutMs, label = 'Operation') {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(createTimeoutError(label, timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWithTimeout(input, init = {}, { timeoutMs = 8000, label = 'Request' } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: init.signal || controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') throw createTimeoutError(label, timeoutMs);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}