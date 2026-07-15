const buckets = new Map();

function prune(now) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(key, { limit, windowMs }, now = Date.now()) {
  prune(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }
  bucket.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}

export function assertRateLimit(key, config) {
  const result = checkRateLimit(key, config);
  if (!result.allowed) {
    const err = new Error('Rate limit exceeded');
    err.statusCode = 429;
    err.retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    throw err;
  }
  return result;
}
