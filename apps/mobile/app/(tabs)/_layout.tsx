import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../src/context/AuthProvider';

function TabGlyph({ label, focused }: { focused: boolean; label: string }) {
  return (
    <View style={[styles.tabGlyph, focused ? styles.tabGlyphFocused : null]}>
      <Text style={[styles.tabGlyphLabel, focused ? styles.tabGlyphLabelFocused : null]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { hasCompletedOnboarding, loading, session } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color="#7dd3fc" size="large" />
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
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: '#05070c',
        },
        tabBarActiveTintColor: '#e0f2fe',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#08111f',
          borderTopColor: 'rgba(125, 211, 252, 0.12)',
          height: 86,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="D" />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="C" />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="F" />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="M" />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="V" />,
        }}
      />
      <Tabs.Screen
        name="submit-event"
        options={{
          href: null,
          title: 'Submit',
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="S" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="P" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    alignItems: 'center',
    backgroundColor: '#05070c',
    flex: 1,
    justifyContent: 'center',
  },
  tabGlyph: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(148, 163, 184, 0.14)',
    borderRadius: 999,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  tabGlyphFocused: {
    backgroundColor: 'rgba(125, 211, 252, 0.18)',
    borderColor: 'rgba(125, 211, 252, 0.42)',
  },
  tabGlyphLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  tabGlyphLabelFocused: {
    color: '#e0f2fe',
  },
});
