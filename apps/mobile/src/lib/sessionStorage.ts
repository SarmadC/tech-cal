import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_GROUP = 'kurecal-mobile-auth';
const WEB_PREFIX = 'kurecal-mobile-auth:';
const nativeFallbackStorage = new Map<string, string>();
const USER_SCOPED_KEYS = [
  'kurecal_push_device_id',
  'mobile_calendar_oauth_return_url',
  'mobile_device_calendar_event_mappings',
  'mobile_pending_networking_follow_up_event_id',
] as const;

function getWebStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return window.localStorage ?? null;
}

function getWebKey(key: string): string {
  return `${WEB_PREFIX}${key}`;
}

export const sessionStorage = {
  getItem: async (key: string) => {
    const webStorage = getWebStorage();
    if (webStorage) {
      return webStorage.getItem(getWebKey(key));
    }

    try {
      return await SecureStore.getItemAsync(key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
        keychainService: ACCESS_GROUP,
      });
    } catch {
      // Unsigned simulator builds cannot access the iOS Keychain. Keep the
      // auth adapter usable in that environment without rejecting Supabase's
      // automatic refresh cycle.
      return nativeFallbackStorage.get(key) ?? null;
    }
  },
  removeItem: async (key: string) => {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.removeItem(getWebKey(key));
      return;
    }

    try {
      await SecureStore.deleteItemAsync(key, {
        keychainService: ACCESS_GROUP,
      });
    } catch {
      // See the native read fallback above.
    }
    nativeFallbackStorage.delete(key);
  },
  setItem: async (key: string, value: string) => {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.setItem(getWebKey(key), value);
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
        keychainService: ACCESS_GROUP,
      });
      nativeFallbackStorage.delete(key);
    } catch {
      // Unsigned simulator builds have no usable Keychain entitlement.
      nativeFallbackStorage.set(key, value);
    }
  },
};

export async function clearUserScopedSessionStorage(): Promise<void> {
  await Promise.all(USER_SCOPED_KEYS.map((key) => sessionStorage.removeItem(key)));
}
