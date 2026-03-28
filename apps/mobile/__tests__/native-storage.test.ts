import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('nativeStorage', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('falls back to file storage when SecureStore is unavailable on iOS', async () => {
    const secureStore = require('expo-secure-store') as typeof import('expo-secure-store');
    const fileSystem = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    jest.mocked(secureStore.getItemAsync).mockRejectedValueOnce(
      new Error("Calling the 'getValueWithKeyAsync' function has failed\n→ Caused by: A required entitlement isn't present.")
    );
    jest.mocked(secureStore.setItemAsync).mockRejectedValueOnce(
      new Error("Calling the 'setValueWithKeyAsync' function has failed\n→ Caused by: A required entitlement isn't present.")
    );
    jest.mocked(fileSystem.getInfoAsync).mockResolvedValue({ exists: false, isDirectory: false } as never);

    const storage = require('../lib/nativeStorage') as typeof import('../lib/nativeStorage');

    await expect(storage.getNativeStoredItem('token')).resolves.toBeNull();
    await storage.setNativeStoredItem('token', 'abc123');
    await expect(storage.getNativeStoredItem('token')).resolves.toBe('abc123');

    expect(fileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      'file:///mock-documents/kurecal-local-storage.json',
      JSON.stringify({ token: 'abc123' })
    );
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

    consoleWarnSpy.mockRestore();
  });
});
