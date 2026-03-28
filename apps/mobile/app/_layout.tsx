import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import 'react-native-reanimated';

import { AppProviders } from '@/providers/AppProviders';
import { useAppTheme } from '@/providers/ThemeProvider';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans: require('../assets/fonts/DMSans-Variable.ttf'),
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppProviders>
      <RootNavigation />
    </AppProviders>
  );
}

function RootNavigation() {
  const { resolvedTheme, tokens } = useAppTheme();

  const navigationTheme = useMemo(
    () => ({
      ...(resolvedTheme === 'dark' ? DarkTheme : DefaultTheme),
      colors: {
        ...(resolvedTheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
        background: tokens.colors.shell,
        card: tokens.colors.surface,
        text: tokens.colors.textPrimary,
        border: tokens.colors.border,
        primary: tokens.colors.accent,
        notification: tokens.colors.accent,
      },
    }),
    [resolvedTheme, tokens]
  );

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.colors.shell } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="auth/reset-password" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        <Stack.Screen name="hackathons" />
      </Stack>
    </NavigationThemeProvider>
  );
}
