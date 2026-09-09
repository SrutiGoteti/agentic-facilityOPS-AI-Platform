const cache = {};
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function getCachedData(key) {
  const entry = cache[key];
  if (!entry) return null;
  const isExpired = Date.now() - entry.timestamp > CACHE_DURATION_MS;
  return isExpired ? null : entry.data;
}

export function setCachedData(key, data) {
  cache[key] = { data, timestamp: Date.now() };
}

export function clearCachedData(key) {
  delete cache[key];
}