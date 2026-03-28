import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { KureScreen } from '@/components/chrome/KureScreen';
import { useMobileAuth } from '@/hooks/useMobileAuth';
import { useAppTheme } from '@/providers/ThemeProvider';

const TAB_ICONS = {
  discover: 'sparkles',
  calendar: 'calendar',
  community: 'person.3',
  dashboard: 'chart.bar',
  saved: 'bookmark',
  profile: 'person.crop.circle',
} as const;

export default function TabsLayout() {
  const { session, profile, isLoading, isHydratingProfile } = useMobileAuth();
  const { tokens } = useAppTheme();

  if (isLoading || isHydratingProfile) {
    return (
      <KureScreen
        title="Restoring your account"
        subtitle="Syncing your profile before opening the signed-in tabs."
      >
        <ActivityIndicator color={tokens.colors.accent} size="large" />
      </KureScreen>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)" />;
  }

  if (!profile) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      initialRouteName="discover"
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: tokens.colors.shell },
        tabBarActiveTintColor: tokens.colors.accent,
        tabBarInactiveTintColor: tokens.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: tokens.colors.tabBar,
          borderTopColor: tokens.colors.tabBarBorder,
          height: 82,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          fontFamily: tokens.typography.sans,
        },
        tabBarIcon: ({ color }) => (
          <SymbolView
            name={TAB_ICONS[route.name as keyof typeof TAB_ICONS]}
            tintColor={color}
            size={20}
          />
        ),
      })}
    >
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="community" options={{ title: 'Community' }} />
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="saved" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
