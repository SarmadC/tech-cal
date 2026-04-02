import * as SecureStore from 'expo-secure-store';

const ACCESS_GROUP = 'kurecal-mobile-auth';

export const sessionStorage = {
  getItem: async (key: string) => SecureStore.getItemAsync(key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
    keychainService: ACCESS_GROUP,
  }),
  removeItem: async (key: string) => SecureStore.deleteItemAsync(key, {
    keychainService: ACCESS_GROUP,
  }),
  setItem: async (key: string, value: string) => SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
    keychainService: ACCESS_GROUP,
  }),
};
