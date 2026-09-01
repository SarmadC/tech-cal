import { FontAwesome } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../src/providers/ThemeProvider';
import {
  loadMobileNotificationPreferences,
  updateMobileNotificationPreferences,
} from '../../src/lib/mobileApi';
import type {
  MobileNotificationPreferences,
  MobileNotificationPreferencesUpdate,
} from '@kurecal/domain';
import {
  getPushPermissionState,
  openNotificationSettings,
  registerForPushNotificationsAsync,
  type PushPermissionState,
} from '../../src/lib/pushNotifications';

const ROWS: ReadonlyArray<{
  key: keyof MobileNotificationPreferences;
  title: string;
  subtitle: string;
}> = [
  {
    key: 'postReply',
    title: 'Post replies',
    subtitle: 'When someone replies to a post you wrote',
  },
  {
    key: 'commentReply',
    title: 'Comment replies',
    subtitle: 'When someone replies to one of your comments',
  },
  {
    key: 'mention',
    title: 'Mentions',
    subtitle: 'When someone @mentions you in a post or comment',
  },
];

export default function NotificationPreferencesScreen() {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [prefs, setPrefs] = useState<MobileNotificationPreferences | null>(null);
  const [mode, setMode] = useState<'loading' | 'ready' | 'error'>('loading');
  const [systemPermission, setSystemPermission] =
    useState<PushPermissionState>('unavailable');

  useEffect(() => {
    let cancelled = false;
    loadMobileNotificationPreferences()
      .then((data) => {
        if (!cancelled) {
          setPrefs(data);
          setMode('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setMode('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshSystemPermission = useCallback(async () => {
    setSystemPermission(await getPushPermissionState());
  }, []);

  useEffect(() => {
    void refreshSystemPermission();
  }, [refreshSystemPermission]);

  const toggle = useCallback(
    async (key: keyof MobileNotificationPreferences, nextValue: boolean) => {
      if (!prefs) return;
      const previous = prefs;
      const optimistic = { ...prefs, [key]: nextValue };
      setPrefs(optimistic);
      try {
        const patch: MobileNotificationPreferencesUpdate = { [key]: nextValue };
        const result = await updateMobileNotificationPreferences(patch);
        setPrefs(result);
      } catch {
        setPrefs(previous);
      }
    },
    [prefs]
  );

  return (
    <View style={[styles.screen, { backgroundColor: tokens.colors.shell }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: tokens.colors.header,
            borderBottomColor: tokens.colors.headerBorder,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <FontAwesome
            name="chevron-left"
            size={16}
            color={tokens.colors.textPrimary}
          />
        </Pressable>
        <Text style={[styles.title, { color: tokens.colors.textPrimary }]}>
          Notification preferences
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {mode === 'loading' || !prefs ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.accent} />
        </View>
      ) : mode === 'error' ? (
        <View style={styles.center}>
          <Text style={{ color: tokens.colors.textSecondary }}>
            Couldn’t load preferences.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
          <View
            style={[
              styles.permissionCard,
              {
                backgroundColor: tokens.colors.surface,
                borderColor: tokens.colors.border,
              },
            ]}
          >
            <View style={styles.permissionCopy}>
              <Text style={[styles.rowTitle, { color: tokens.colors.textPrimary }]}>
                System notifications
              </Text>
              <Text style={[styles.rowSubtitle, { color: tokens.colors.textTertiary }]}>
                {systemPermission === 'authorized'
                  ? 'Enabled on this device'
                  : systemPermission === 'provisional'
                    ? 'Delivered quietly on this device'
                    : systemPermission === 'denied'
                      ? 'Disabled in iOS Settings'
                      : 'Choose when KureCal can notify you'}
              </Text>
            </View>
            {systemPermission === 'denied' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void openNotificationSettings()}
                style={styles.permissionAction}
              >
                <Text style={[styles.permissionActionLabel, { color: tokens.colors.accent }]}>Open Settings</Text>
              </Pressable>
            ) : systemPermission === 'not-determined' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void registerForPushNotificationsAsync({ requestPermission: true })
                    .then(refreshSystemPermission);
                }}
                style={styles.permissionAction}
              >
                <Text style={[styles.permissionActionLabel, { color: tokens.colors.accent }]}>Enable</Text>
              </Pressable>
            ) : null}
          </View>
          {ROWS.map((row) => (
            <View
              key={row.key}
              style={[
                styles.row,
                { borderBottomColor: tokens.colors.divider },
              ]}
            >
              <View style={{ flex: 1, gap: 4, paddingRight: 16 }}>
                <Text
                  style={[styles.rowTitle, { color: tokens.colors.textPrimary }]}
                >
                  {row.title}
                </Text>
                <Text
                  style={[
                    styles.rowSubtitle,
                    { color: tokens.colors.textTertiary },
                  ]}
                >
                  {row.subtitle}
                </Text>
              </View>
              <Switch
                value={prefs[row.key]}
                onValueChange={(value) => void toggle(row.key, value)}
                trackColor={{
                  false: tokens.colors.surfaceStrong,
                  true: tokens.colors.accent,
                }}
                thumbColor={
                  prefs[row.key] ? tokens.colors.textInverse : tokens.colors.textPrimary
                }
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'DMSans',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: {
    fontFamily: 'DMSans',
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontFamily: 'DMSans',
    fontSize: 13,
    lineHeight: 17,
  },
  permissionCard: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    marginHorizontal: 20,
    minHeight: 64,
    padding: 12,
  },
  permissionCopy: { flex: 1, gap: 4, paddingRight: 12 },
  permissionAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 8,
  },
  permissionActionLabel: {
    fontFamily: 'DMSans',
    fontSize: 13,
    fontWeight: '700',
  },
});
