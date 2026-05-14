import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_GROUP = 'kurecal-mobile-auth';
const WEB_PREFIX = 'kurecal-mobile-auth:';

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

    return SecureStore.getItemAsync(key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
      keychainService: ACCESS_GROUP,
    });
  },
  removeItem: async (key: string) => {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.removeItem(getWebKey(key));
      return;
    }

    return SecureStore.deleteItemAsync(key, {
      keychainService: ACCESS_GROUP,
    });
  },
  setItem: async (key: string, value: string) => {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.setItem(getWebKey(key), value);
      return;
    }

    return SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
      keychainService: ACCESS_GROUP,
    });
  },
};
