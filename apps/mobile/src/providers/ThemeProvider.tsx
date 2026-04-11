import { requireOptionalNativeModule } from 'expo-modules-core';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useColorScheme as useColorSchemeCore } from 'react-native';

import {
  getThemeTokens,
  type AppThemeTokens,
  type ThemeMode,
  type ThemePreference,
} from '../theme/tokens';

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ThemeMode;
  setThemePreference: (preference: ThemePreference) => void;
  tokens: AppThemeTokens;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ExpoSystemUiModule = {
  setBackgroundColorAsync?: (color: string) => Promise<void>;
};

let cachedSystemUiModule: ExpoSystemUiModule | null | undefined;

function getSystemUiModule(): ExpoSystemUiModule | null {
  if (cachedSystemUiModule !== undefined) {
    return cachedSystemUiModule;
  }

  if (!requireOptionalNativeModule('ExpoSystemUI')) {
    cachedSystemUiModule = null;
    return cachedSystemUiModule;
  }

  try {
    cachedSystemUiModule = require('expo-system-ui') as ExpoSystemUiModule;
  } catch {
    cachedSystemUiModule = null;
  }

  return cachedSystemUiModule;
}

export function MobileThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorSchemeCore();
  const [preference, setPreference] = useState<ThemePreference>('system');

  const resolvedTheme: ThemeMode =
    preference === 'system'
      ? systemScheme === 'light'
        ? 'light'
        : 'dark'
      : preference;

  const tokens = useMemo(() => getThemeTokens(resolvedTheme), [resolvedTheme]);

  useEffect(() => {
    const systemUi = getSystemUiModule();
    if (!systemUi?.setBackgroundColorAsync) {
      return;
    }

    void systemUi.setBackgroundColorAsync(tokens.colors.shell).catch(() => {
      // Ignore shell background sync failures and keep rendering the chosen theme.
    });
  }, [tokens.colors.shell]);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setThemePreference: setPreference,
      tokens,
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
