import { useFonts } from 'expo-font';
import { Stack, router, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../src/context/AuthProvider';
import { SubscriptionProvider } from '../src/context/SubscriptionContext';
import { TabBarVisibilityProvider } from '../src/context/TabBarVisibilityContext';
import { NetworkStatusProvider } from '../src/context/NetworkStatusContext';
import { MobileThemeProvider, useAppTheme } from '../src/providers/ThemeProvider';
import {
  addNotificationResponseListener,
  getLastNotificationData,
  setupNotificationHandler,
} from '../src/lib/pushNotifications';
import { routeForNotificationData } from '../src/lib/notificationRouting';
import { initializeMobileMonitoring, Sentry } from '../src/lib/monitoring';

setupNotificationHandler();
initializeMobileMonitoring();

// Module-level guard so the cold-start notification is only consumed once per
// app process — useRef would reset if the root layout remounts.
let coldStartNotificationHandled = false;

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Keep app boot resilient if splash control is unavailable.
});

function RootLayout() {
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

  useEffect(() => {
    // getLastNotificationResponseAsync keeps returning the cold-start
    // notification for the whole app lifetime, which would re-route on every
    // remount (font reload, background→foreground). Handle it at most once.
    if (!coldStartNotificationHandled) {
      coldStartNotificationHandled = true;
      void getLastNotificationData().then((data) => {
        const path = routeForNotificationData(data);
        if (path) {
          router.push(path as never);
        }
      });
    }

    const subscription = addNotificationResponseListener((data) => {
      const path = routeForNotificationData(data);
      if (path) {
        router.push(path as never);
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MobileThemeProvider>
          <NetworkStatusProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <TabBarVisibilityProvider>
                  <RootNavigation />
                </TabBarVisibilityProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </NetworkStatusProvider>
        </MobileThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { surface: 'mobile-root-boundary' } });
  }, [error]);

  return (
    <View accessibilityRole="alert" style={errorStyles.screen}>
      <Text style={errorStyles.title}>KureCal hit a problem</Text>
      <Text style={errorStyles.message}>
        Your account and saved events are safe. Try reopening this screen.
      </Text>
      <Pressable
        accessibilityHint="Reloads the current screen"
        accessibilityRole="button"
        onPress={retry}
        style={({ pressed }) => [
          errorStyles.button,
          pressed ? errorStyles.buttonPressed : null,
        ]}
      >
        <Text style={errorStyles.buttonLabel}>Try again</Text>
      </Pressable>
    </View>
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
    </>
  );
}

const errorStyles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#5b5bd6',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 48,
    paddingHorizontal: 22,
  },
  buttonLabel: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  buttonPressed: { opacity: 0.72 },
  message: {
    color: '#5f5f6d',
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 360,
    textAlign: 'center',
  },
  screen: {
    alignItems: 'center',
    backgroundColor: '#f8f8fb',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  title: {
    color: '#18181b',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
});
