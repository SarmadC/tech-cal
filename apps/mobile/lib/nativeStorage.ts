import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

const FALLBACK_STORAGE_FILENAME = 'kurecal-local-storage.json';
const FALLBACK_STORAGE_URI = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}${FALLBACK_STORAGE_FILENAME}`
  : null;

let secureStoreFallbackEnabled = false;
let hasLoggedFallback = false;
let fallbackCache: Record<string, string> | null = null;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? '');
}

function shouldUseFallback(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes('required entitlement') ||
    message.includes('keychain') ||
    message.includes('not available on iOS')
  );
}

function enableFallback(error: unknown) {
  secureStoreFallbackEnabled = true;

  if (hasLoggedFallback) {
    return;
  }

  hasLoggedFallback = true;
  console.warn('SecureStore unavailable, falling back to file-backed native storage.', error);
}

async function readFallbackStore() {
  if (fallbackCache) {
    return fallbackCache;
  }

  if (!FALLBACK_STORAGE_URI) {
    fallbackCache = {};
    return fallbackCache;
  }

  try {
    const info = await FileSystem.getInfoAsync(FALLBACK_STORAGE_URI);
    if (!info.exists) {
      fallbackCache = {};
      return fallbackCache;
    }

    const rawValue = await FileSystem.readAsStringAsync(FALLBACK_STORAGE_URI);
    const parsedValue = JSON.parse(rawValue) as Record<string, unknown>;

    fallbackCache = Object.entries(parsedValue).reduce<Record<string, string>>((accumulator, entry) => {
      const [key, value] = entry;
      if (typeof value === 'string') {
        accumulator[key] = value;
      }
      return accumulator;
    }, {});
  } catch {
    fallbackCache = {};
  }

  return fallbackCache;
}

async function writeFallbackStore(nextStore: Record<string, string>) {
  fallbackCache = nextStore;

  if (!FALLBACK_STORAGE_URI) {
    return;
  }

  try {
    await FileSystem.writeAsStringAsync(FALLBACK_STORAGE_URI, JSON.stringify(nextStore));
  } catch {
    // Ignore fallback persistence failures and keep the in-memory cache.
  }
}

export async function getNativeStoredItem(key: string) {
  if (!secureStoreFallbackEnabled) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      if (!shouldUseFallback(error)) {
        throw error;
      }

      enableFallback(error);
    }
  }

  const fallbackStore = await readFallbackStore();
  return fallbackStore[key] ?? null;
}

export async function setNativeStoredItem(key: string, value: string) {
  if (!secureStoreFallbackEnabled) {
    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch (error) {
      if (!shouldUseFallback(error)) {
        throw error;
      }

      enableFallback(error);
    }
  }

  const fallbackStore = await readFallbackStore();
  await writeFallbackStore({
    ...fallbackStore,
    [key]: value,
  });
}

export async function removeNativeStoredItem(key: string) {
  if (!secureStoreFallbackEnabled) {
    try {
      await SecureStore.deleteItemAsync(key);
      return;
    } catch (error) {
      if (!shouldUseFallback(error)) {
        throw error;
      }

      enableFallback(error);
    }
  }

  const fallbackStore = await readFallbackStore();

  if (!(key in fallbackStore)) {
    return;
  }

  const { [key]: _, ...nextStore } = fallbackStore;
  await writeFallbackStore(nextStore);
}
