import { Redirect, Tabs } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { SymbolView } from "expo-symbols";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLoadingScreen } from "../../src/components/brand/BrandLoadingScreen";
import {
  TabBarVisibilityProvider,
  useTabBarVisibility,
} from "../../src/components/chrome/TabBarVisibilityProvider";
import { useAuth } from "../../src/context/AuthProvider";
import { useUnreadNotifications } from "../../src/hooks/useUnreadNotifications";
import { useAppTheme } from "../../src/providers/ThemeProvider";
import type { AppThemeTokens } from "../../src/theme/tokens";

const TAB_ICONS = {
  discover: "safari",
  calendar: "calendar",
  community: "person.2",
  dashboard: "chart.bar.xaxis",
  notifications: "bell",
} as const;

const TAB_ACTIVE_ICONS = {
  discover: "safari.fill",
  calendar: "calendar",
  community: "person.2.fill",
  dashboard: "chart.bar.xaxis",
  notifications: "bell.fill",
} as const;

type TabName = keyof typeof TAB_ICONS;

function buildTabOptions(title: string) {
  return {
    title,
  };
}

function isVisibleTab(tabName: string): tabName is TabName {
  return tabName in TAB_ICONS;
}

function AppTabBar({
  animatedValue,
  state,
  descriptors,
  navigation,
  tokens,
}: BottomTabBarProps & {
  animatedValue: Animated.Value;
  tokens: AppThemeTokens;
}) {
  const insets = useSafeAreaInsets();
  const { count: unreadCount } = useUnreadNotifications();
  const bottomInset = Math.max(insets.bottom, 8);
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [72 + bottomInset, 0],
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.tabBarFrame,
        {
          opacity: animatedValue,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={[
          styles.tabBarRail,
          {
            backgroundColor:
              tokens.mode === "dark"
                ? "rgba(13, 14, 15, 0.94)"
                : "rgba(255, 255, 255, 0.94)",
            paddingBottom: bottomInset,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          if (!isVisibleTab(route.name)) {
            return null;
          }

          const descriptor = descriptors[route.key];
          const options = descriptor.options;
          const focused = state.index === index;
          const title =
            options.tabBarLabel !== undefined &&
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title ?? route.name;
          const iconColor = focused
            ? tokens.colors.textPrimary
            : tokens.colors.textTertiary;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? title}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : undefined}
              onLongPress={onLongPress}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tabButton,
                {
                  backgroundColor: pressed
                    ? "rgba(255, 255, 255, 0.06)"
                    : "transparent",
                  opacity: focused ? 1 : 0.48,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
              ]}
            >
              {focused ? <View style={styles.activeIconGlow} /> : null}
              <SymbolView
                name={
                  focused ? TAB_ACTIVE_ICONS[route.name] : TAB_ICONS[route.name]
                }
                size={focused ? 26 : 25}
                tintColor={iconColor}
                type="monochrome"
                weight={focused ? "medium" : "regular"}
              />
              {route.name === "notifications" && unreadCount > 0 ? (
                <View
                  style={[
                    styles.tabBadge,
                    {
                      backgroundColor: tokens.colors.accent,
                      borderColor: tokens.colors.shell,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      { color: tokens.colors.textInverse },
                    ]}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

function TabsNavigator() {
  const { hasCompletedOnboarding, loading, session } = useAuth();
  const { tokens } = useAppTheme();
  const { animatedValue, showTabBar, resetScrollTracking } =
    useTabBarVisibility();

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

  if (!hasCompletedOnboarding) {
    return <Redirect href="../onboarding" />;
  }

  return (
    <Tabs
      initialRouteName="discover"
      screenListeners={{
        state: () => {
          resetScrollTracking();
          showTabBar();
        },
      }}
      tabBar={(props) => (
        <AppTabBar {...props} animatedValue={animatedValue} tokens={tokens} />
      )}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: tokens.colors.shell,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={buildTabOptions("Discover")}
      />
      <Tabs.Screen
        name="calendar"
        options={buildTabOptions("Calendar")}
      />
      <Tabs.Screen
        name="community"
        options={buildTabOptions("Community")}
      />
      <Tabs.Screen
        name="dashboard"
        options={buildTabOptions("Dashboard")}
      />
      <Tabs.Screen
        name="notifications"
        options={buildTabOptions("Notifications")}
      />
      <Tabs.Screen
        name="submit-event"
        options={{
          href: null,
          title: "Submit",
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          href: null,
          title: "Saved",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: "Settings",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarFrame: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabBarRail: {
    minHeight: 62,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.11)",
    paddingHorizontal: 18,
    paddingTop: 9,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  activeIconGlow: {
    position: "absolute",
    width: 36,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.055)",
  },
  tabBadge: {
    position: "absolute",
    top: 2,
    right: "50%",
    marginRight: -22,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "DMSans",
  },
});

export default function TabsLayout() {
  return (
    <TabBarVisibilityProvider>
      <TabsNavigator />
    </TabBarVisibilityProvider>
  );
}
