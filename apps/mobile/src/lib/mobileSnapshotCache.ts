import AsyncStorage from 'expo-sqlite/kv-store';

const CACHE_PREFIX = 'kurecal:snapshot:v1:';
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type CachedSnapshot<T> = {
  cachedAt: string;
  value: T;
};

function cacheKey(scope: string, key: string) {
  return `${CACHE_PREFIX}${scope}:${key}`;
}

export async function readMobileSnapshot<T>(
  scope: string,
  key: string,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
): Promise<CachedSnapshot<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(scope, key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedSnapshot<T>;
    const cachedAt = new Date(parsed.cachedAt).getTime();
    if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > maxAgeMs) {
      await AsyncStorage.removeItem(cacheKey(scope, key));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function writeMobileSnapshot<T>(
  scope: string,
  key: string,
  value: T,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      cacheKey(scope, key),
      JSON.stringify({ cachedAt: new Date().toISOString(), value }),
    );
  } catch {
    // Snapshot caching is best-effort and must never block live content.
  }
}

export async function clearMobileSnapshotCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const snapshotKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    await Promise.all(snapshotKeys.map((key) => AsyncStorage.removeItem(key)));
  } catch {
    // Sign-out must remain resilient if local cache cleanup fails.
  }
}
