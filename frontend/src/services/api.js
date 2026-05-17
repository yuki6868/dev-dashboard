import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

const CACHE_PREFIX = "dev-dashboard-cache:";
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function cacheKey(url) {
  return `${CACHE_PREFIX}${url}`;
}

export function clearApiCache() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(CACHE_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
}

export async function cachedGet(url, ttlMs = DEFAULT_TTL_MS) {
  const key = cacheKey(url);
  const cached = localStorage.getItem(key);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.savedAt < ttlMs) {
        return { data: parsed.data, fromCache: true };
      }
    } catch {
      localStorage.removeItem(key);
    }
  }

  const res = await api.get(url);
  localStorage.setItem(
    key,
    JSON.stringify({
      savedAt: Date.now(),
      data: res.data,
    })
  );

  return { data: res.data, fromCache: false };
}

export default api;