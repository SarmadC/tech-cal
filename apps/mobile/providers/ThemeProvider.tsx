import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import * as SystemUI from 'expo-system-ui';
import { Platform, useColorScheme as useColorSchemeCore } from 'react-native';
import { getNativeStoredItem, setNativeStoredItem } from '@/lib/nativeStorage';
import { getThemeTokens, type AppThemeTokens, type ThemeMode, type ThemePreference } from '@/theme/tokens';

const STORAGE_KEY = 'mobile-theme-preference';

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ThemeMode;
  tokens: AppThemeTokens;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

async function readStoredThemePreference(): Promise<ThemePreference | null> {
  try {
    if (Platform.OS === 'web') {
      const storedValue = typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY);
      return isThemePreference(storedValue) ? storedValue : null;
    }

    const storedValue = await getNativeStoredItem(STORAGE_KEY);
    return isThemePreference(storedValue) ? storedValue : null;
  } catch {
    return null;
  }
}

async function writeStoredThemePreference(preference: ThemePreference) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, preference);
      }
      return;
    }

    await setNativeStoredItem(STORAGE_KEY, preference);
  } catch {
    // Ignore persistence failures and keep the in-memory preference.
  }
}

export function MobileThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorSchemeCore();
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    void readStoredThemePreference().then((value) => {
      if (isThemePreference(value)) {
        setPreference(value);
      }
    });
  }, []);

  const resolvedTheme: ThemeMode =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const tokens = useMemo(() => getThemeTokens(resolvedTheme), [resolvedTheme]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      void SystemUI.setBackgroundColorAsync(tokens.colors.shell);
    }
  }, [tokens.colors.shell]);

  async function setThemePreference(nextPreference: ThemePreference) {
    setPreference(nextPreference);
    await writeStoredThemePreference(nextPreference);
  }

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      tokens,
      setThemePreference,
    }),
    [preference, resolvedTheme, tokens]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within MobileThemeProvider');
  }

  return context;
}
