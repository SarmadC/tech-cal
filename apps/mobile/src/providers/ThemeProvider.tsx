import { requireOptionalNativeModule } from "expo-modules-core";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useColorScheme as useColorSchemeCore } from "react-native";

import {
  getThemeTokens,
  type AppThemeTokens,
  type ThemeMode,
  type ThemePreference,
} from "../theme/tokens";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ThemeMode;
  setThemePreference: (preference: ThemePreference) => void;
  tokens: AppThemeTokens;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_PREFERENCE_KEY = "kurecal.mobile.themePreference";
const THEME_PREFERENCES: ThemePreference[] = ["system", "light", "dark"];

type ExpoSystemUiModule = {
  setBackgroundColorAsync?: (color: string) => Promise<void>;
};

let cachedSystemUiModule: ExpoSystemUiModule | null | undefined;

function getSystemUiModule(): ExpoSystemUiModule | null {
  if (cachedSystemUiModule !== undefined) {
    return cachedSystemUiModule;
  }

  if (!requireOptionalNativeModule("ExpoSystemUI")) {
    cachedSystemUiModule = null;
    return cachedSystemUiModule;
  }

  try {
    cachedSystemUiModule = require("expo-system-ui") as ExpoSystemUiModule;
  } catch {
    cachedSystemUiModule = null;
  }

  return cachedSystemUiModule;
}

export function MobileThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorSchemeCore();
  const [preference, setPreference] = useState<ThemePreference>("dark");

  useEffect(() => {
    let mounted = true;

    void SecureStore.getItemAsync(THEME_PREFERENCE_KEY)
      .then((storedPreference) => {
        if (
          mounted &&
          THEME_PREFERENCES.includes(storedPreference as ThemePreference)
        ) {
          setPreference(storedPreference as ThemePreference);
        }
      })
      .catch(() => {
        // Ignore preference read failures and keep following the system theme.
      });

    return () => {
      mounted = false;
    };
  }, []);

  const resolvedTheme: ThemeMode =
    preference === "system"
      ? systemScheme === "light"
        ? "light"
        : "dark"
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
      setThemePreference: (nextPreference: ThemePreference) => {
        setPreference(nextPreference);
        void SecureStore.setItemAsync(
          THEME_PREFERENCE_KEY,
          nextPreference,
        ).catch(() => {
          // Ignore persistence failures; the in-memory theme still updates.
        });
      },
      tokens,
    }),
    [preference, resolvedTheme, tokens],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within MobileThemeProvider");
  }

  return context;
}
