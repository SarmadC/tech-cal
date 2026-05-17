import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStartupOverlay } from '../src/components/brand/AppStartupOverlay';
import { AuthProvider } from '../src/context/AuthProvider';
import { MobileThemeProvider, useAppTheme } from '../src/providers/ThemeProvider';
import { setupNotificationHandler } from '../src/lib/pushNotifications';

setupNotificationHandler();

// Module-level guard so the cold-start notification is only consumed once per
// app process — useRef would reset if the root layout remounts.
let coldStartNotificationHandled = false;

function routeForNotificationData(
  data: Record<string, unknown> | undefined | null
): string | null {
  if (!data || typeof data !== 'object') return null;
  const type = typeof data.type === 'string' ? data.type : null;
  if (!type) return null;

  // Deep-link to screens that exist on this branch base. Nested thread / post
  // detail screens land on the parent surface for now; refine when those
  // routes ship.
  if (type === 'thread_reply') {
    const eventId = typeof data.eventId === 'string' ? data.eventId : null;
    if (eventId) {
      return `/event/${encodeURIComponent(eventId)}`;
    }
  }

  if (type === 'community_post_reply') {
    const slug = typeof data.slug === 'string' ? data.slug : null;
    if (slug) {
      return `/community/${encodeURIComponent(slug)}`;
    }
  }

  return null;
}

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
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        const path = routeForNotificationData(
          response?.notification.request.content.data as Record<string, unknown>
        );
        if (path) {
          router.push(path as never);
        }
      });
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const path = routeForNotificationData(
          response.notification.request.content.data as Record<string, unknown>
        );
        if (path) {
          router.push(path as never);
        }
      }
    );

    return () => subscription.remove();
  }, []);

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
