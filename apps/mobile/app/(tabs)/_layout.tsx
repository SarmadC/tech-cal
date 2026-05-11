import { Redirect, Tabs } from "expo-router";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import { SymbolView } from "expo-symbols";
import { Animated, Text, View } from "react-native";

import { BrandLoadingScreen } from "../../src/components/brand/BrandLoadingScreen";
import {
  TabBarVisibilityProvider,
  useTabBarVisibility,
} from "../../src/components/chrome/TabBarVisibilityProvider";
import { useAuth } from "../../src/context/AuthProvider";
import { useAppTheme } from "../../src/providers/ThemeProvider";
import type { AppThemeTokens } from "../../src/theme/tokens";

const TAB_ICONS = {
  discover: "safari",
  calendar: "calendar",
  community: "person.2",
  dashboard: "chart.bar.xaxis",
  profile: "person.crop.circle",
} as const;

type TabName = keyof typeof TAB_ICONS;

function TabIcon({
  color,
  focused,
  tab,
  tokens,
}: {
  color: string;
  focused: boolean;
  tab: TabName;
  tokens: AppThemeTokens;
}) {
  return (
    <View
      style={{
        minWidth: 28,
        height: 22,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: tokens.radius.md,
        borderBottomColor: focused ? tokens.colors.accent : "transparent",
        borderBottomWidth: 1,
      }}
    >
      <SymbolView
        name={TAB_ICONS[tab]}
        size={focused ? 18 : 17}
        tintColor={focused ? tokens.colors.textSecondary : color}
        type="monochrome"
        weight={focused ? "medium" : "regular"}
      />
    </View>
  );
}

function TabLabel({
  color,
  focused,
  title,
  tokens,
}: {
  color: string;
  focused: boolean;
  title: string;
  tokens: AppThemeTokens;
}) {
  return (
    <Text
      style={{
        marginTop: 0,
        fontFamily: tokens.typography.sans,
        fontSize: 8.5,
        lineHeight: 10,
        letterSpacing: 0.2,
        fontWeight: focused ? "500" : "500",
        color: focused ? tokens.colors.textSecondary : color,
        opacity: focused ? 0.88 : 0.9,
      }}
    >
      {title}
    </Text>
  );
}

function buildTabOptions(tab: TabName, title: string, tokens: AppThemeTokens) {
  return {
    title,
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
      <TabIcon color={color} focused={focused} tab={tab} tokens={tokens} />
    ),
    tabBarLabel: ({ color, focused }: { color: string; focused: boolean }) => (
      <TabLabel color={color} focused={focused} title={title} tokens={tokens} />
    ),
  };
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

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [88, 0],
  });

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
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ translateY }],
            opacity: animatedValue,
          }}
        >
          <BottomTabBar {...props} />
        </Animated.View>
      )}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: tokens.colors.shell,
        },
        tabBarActiveTintColor: tokens.colors.textPrimary,
        tabBarInactiveTintColor: tokens.colors.textTertiary,
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: tokens.colors.tabBar,
          borderTopColor: tokens.colors.tabBarBorder,
          height: 70,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: -6,
        },
        tabBarLabelStyle: {
          fontFamily: tokens.typography.sans,
          fontSize: 8.5,
          fontWeight: "500",
        },
        tabBarItemStyle: {
          paddingTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={buildTabOptions("discover", "Discover", tokens)}
      />
      <Tabs.Screen
        name="calendar"
        options={buildTabOptions("calendar", "Calendar", tokens)}
      />
      <Tabs.Screen
        name="community"
        options={buildTabOptions("community", "Community", tokens)}
      />
      <Tabs.Screen
        name="dashboard"
        options={buildTabOptions("dashboard", "Dashboard", tokens)}
      />
      <Tabs.Screen
        name="profile"
        options={buildTabOptions("profile", "Profile", tokens)}
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

export default function TabsLayout() {
  return (
    <TabBarVisibilityProvider>
      <TabsNavigator />
    </TabBarVisibilityProvider>
  );
}
