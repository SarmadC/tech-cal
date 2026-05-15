import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStartupOverlay } from '../src/components/brand/AppStartupOverlay';
import { AuthProvider } from '../src/context/AuthProvider';
import { MobileThemeProvider, useAppTheme } from '../src/providers/ThemeProvider';

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Keep app boot resilient if splash control is unavailable.
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans: require('../assets/fonts/DMSans-Variable.ttf'),
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    requestAnimationFrame(() => {
      void SplashScreen.hideAsync().catch(() => {
        // Ignore hide failures and continue rendering the in-app loader.
      });
    });
  }, [fontsLoaded]);

  return (
    <SafeAreaProvider>
      <MobileThemeProvider>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </MobileThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigation() {
  const { resolvedTheme, tokens } = useAppTheme();

  return (
    <>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
          contentStyle: {
            backgroundColor: tokens.colors.shell,
          },
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="paywall"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
      </Stack>
      <AppStartupOverlay />
    </>
  );
}
