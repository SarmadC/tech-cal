import { Redirect, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../../src/context/AuthProvider';
import { useAppTheme } from '../../src/providers/ThemeProvider';

const TAB_ICONS = {
  discover: 'sparkles',
  calendar: 'calendar',
  community: 'person.3',
  dashboard: 'chart.bar',
  profile: 'person.crop.circle',
} as const;

function TabIcon({
  color,
  name,
}: {
  color: string;
  name: (typeof TAB_ICONS)[keyof typeof TAB_ICONS];
}) {
  return <SymbolView name={name} size={20} tintColor={color} />;
}

export default function TabsLayout() {
  const { hasCompletedOnboarding, loading, session } = useAuth();
  const { tokens } = useAppTheme();

  if (loading) {
    return (
      <View
        style={[
          styles.loadingState,
          {
            backgroundColor: tokens.colors.shell,
          },
        ]}
      >
        <ActivityIndicator color={tokens.colors.accent} size="large" />
      </View>
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
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: tokens.colors.shell,
        },
        tabBarActiveTintColor: tokens.colors.accent,
        tabBarInactiveTintColor: tokens.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: tokens.colors.tabBar,
          borderTopColor: tokens.colors.tabBarBorder,
          height: 82,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          fontFamily: tokens.typography.sans,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <TabIcon color={color} name={TAB_ICONS.discover} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <TabIcon color={color} name={TAB_ICONS.calendar} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color }) => <TabIcon color={color} name={TAB_ICONS.community} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon color={color} name={TAB_ICONS.dashboard} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon color={color} name={TAB_ICONS.profile} />,
        }}
      />
      <Tabs.Screen
        name="submit-event"
        options={{
          href: null,
          title: 'Submit',
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          href: null,
          title: 'Saved',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
