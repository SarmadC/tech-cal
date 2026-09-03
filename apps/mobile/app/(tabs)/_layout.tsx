import { Redirect, usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect } from "react";
import { DynamicColorIOS, Platform, type ColorValue } from "react-native";

import { useTabBarVisibility } from "../../src/context/TabBarVisibilityContext";
import { BrandLoadingScreen } from "../../src/components/brand/BrandLoadingScreen";
import { useAuth } from "../../src/context/AuthProvider";
import { useUnreadNotifications } from "../../src/hooks/useUnreadNotifications";
import { setLastTab } from "../../src/lib/lastTab";
import { useAppTheme } from "../../src/providers/ThemeProvider";
import { getThemeTokens } from "../../src/theme/tokens";

const TAB_NAMES = new Set([
  "discover",
  "calendar",
  "community",
  "dashboard",
  "notifications",
]);

// The textPrimary pair from the theme tokens, resolved once at module scope so
// the native tab bar tint tracks system appearance without re-rendering the
// navigator on theme changes.
const lightTint = getThemeTokens("light").colors.textPrimary;
const darkTint = getThemeTokens("dark").colors.textPrimary;
const tabTintColor: ColorValue =
  Platform.OS === "ios"
    ? DynamicColorIOS({ light: lightTint, dark: darkTint })
    : lightTint;

export default function TabsLayout() {
  const { hasCompletedOnboarding, loading, needsUsername, session } = useAuth();
  const { tokens } = useAppTheme();
  const { count: unreadCount } = useUnreadNotifications();
  const pathname = usePathname();
  const { visible, setVisible } = useTabBarVisibility();

  // Record the active tab so app/index.tsx can restore it on next launch.
  useEffect(() => {
    const name = pathname.split("/")[1];
    if (name && TAB_NAMES.has(name)) {
      void setLastTab(`/(tabs)/${name}`);
    }
  }, [pathname]);

  if (loading) {
    return (
      <BrandLoadingScreen
        backgroundColor={tokens.colors.shell}
        color={tokens.colors.textPrimary}
      />
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (needsUsername || !hasCompletedOnboarding) {
    return <Redirect href="../onboarding" />;
  }

  return (
    <NativeTabs
      tintColor={tabTintColor}
      hidden={!visible}
      screenListeners={{ focus: () => setVisible(true) }}
    >
      <NativeTabs.Trigger name="discover" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Icon
          sf={{ default: "safari", selected: "safari.fill" }}
          md="explore"
        />
        <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(community)" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.2", selected: "person.2.fill" }}
          md="group"
        />
        <NativeTabs.Trigger.Label>Community</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dashboard" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Icon sf="chart.bar.xaxis" md="bar_chart" />
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Icon
          sf={{ default: "bell", selected: "bell.fill" }}
          md="notifications"
        />
        <NativeTabs.Trigger.Label>Notifications</NativeTabs.Trigger.Label>
        {unreadCount > 0 ? (
          <NativeTabs.Trigger.Badge>
            {unreadCount > 99 ? "99+" : String(unreadCount)}
          </NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
