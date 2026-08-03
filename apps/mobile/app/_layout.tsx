import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../src/context/AuthProvider';
import { SubscriptionProvider } from '../src/context/SubscriptionContext';
import { TabBarVisibilityProvider } from '../src/context/TabBarVisibilityContext';
import { MobileThemeProvider, useAppTheme } from '../src/providers/ThemeProvider';
import {
  addNotificationResponseListener,
  getLastNotificationData,
  setupNotificationHandler,
} from '../src/lib/pushNotifications';
import { routeForNotificationData } from '../src/lib/notificationRouting';

setupNotificationHandler();

// Module-level guard so the cold-start notification is only consumed once per
// app process — useRef would reset if the root layout remounts.
let coldStartNotificationHandled = false;

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
          <AuthProvider>
            <SubscriptionProvider>
              <TabBarVisibilityProvider>
                <RootNavigation />
              </TabBarVisibilityProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </MobileThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
