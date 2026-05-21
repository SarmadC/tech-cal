import { useCallback, useEffect, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import type {
  MobileCalendarConnectionStatus,
  NormalizedSubscription,
} from "@kurecal/domain";

import {
  SettingsAvatar,
  SettingsDivider,
  SettingsGroup,
  SettingsRow,
} from "../../src/components/settings/mobile-settings-ui";
import { ScreenStateView } from "../../src/components/ScreenStateView";
import { buildAvatarInitials } from "../../src/components/community/presentation";
import { useAuth } from "../../src/context/AuthProvider";
import { getMobileApiBaseUrl } from "../../src/lib/env";
import { getDeviceCalendarPermissionStatus } from "../../src/lib/deviceCalendarSync";
import {
  loadMobileGoogleCalendarStatus,
  loadMobileSubscriptionStatus,
} from "../../src/lib/mobileApi";
import {
  formatCareerSummary,
  formatSubscriptionSummary,
  hasPaidAccess,
} from "../../src/lib/settingsPresentation";
import { useAppTheme } from "../../src/providers/ThemeProvider";

function getVisibilityLabel(value: string): string {
  if (value === "connections") {
    return "Connections";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getCalendarLabel(
  googleStatus: MobileCalendarConnectionStatus | null,
  appleCalendarPermission: string,
): string {
  if (googleStatus?.connected && googleStatus.isActive) {
    return "Google connected";
  }

  if (appleCalendarPermission === "granted") {
    return "Device enabled";
  }

  return "Not connected";
}

export default function SettingsScreen() {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const {
    hasCompletedOnboarding,
    loading,
    profile,
    refreshProfile,
    session,
    signOut,
  } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] =
    useState<NormalizedSubscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [googleCalendarStatus, setGoogleCalendarStatus] =
    useState<MobileCalendarConnectionStatus | null>(null);
  const [appleCalendarPermission, setAppleCalendarPermission] =
    useState("unknown");

  const loadSettingsStatus = useCallback(async () => {
    setSubscriptionLoading(true);

    try {
      const [nextSubscription, nextGoogleStatus, nextApplePermission] =
        await Promise.all([
          loadMobileSubscriptionStatus().catch(() => null),
          loadMobileGoogleCalendarStatus().catch(() => null),
          getDeviceCalendarPermissionStatus().catch(() => "unknown"),
        ]);

      setSubscription(nextSubscription);
      setGoogleCalendarStatus(nextGoogleStatus);
      setAppleCalendarPermission(nextApplePermission);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile) {
      void loadSettingsStatus();
    }
  }, [loadSettingsStatus, profile]);

  const identity = useMemo(() => {
    const fullName =
      profile?.profile.fullName?.trim() ||
      profile?.socialProfile.username?.trim() ||
      session?.user.email ||
      "Your profile";
    const username = profile?.socialProfile.username?.trim();
    const secondary = username
      ? `@${username}`
      : (session?.user.email ?? "Profile settings");

    return {
      fullName,
      initials: buildAvatarInitials(fullName),
      secondary,
    };
  }, [profile, session?.user.email]);

  const careerSummary = useMemo(
    () => formatCareerSummary(profile?.careerProfile),
    [profile?.careerProfile],
  );

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);

    try {
      await Promise.all([refreshProfile(), loadSettingsStatus()]);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to refresh your profile",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function openWebPath(path: string) {
    try {
      const url = new URL(path, getMobileApiBaseUrl()).toString();
      await Linking.openURL(url);
    } catch (nextError) {
      Alert.alert(
        "Unable to open link",
        nextError instanceof Error ? nextError.message : "Please try again.",
      );
    }
  }

  if (loading && !profile) {
    return (
      <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Loading profile"
              description="Pulling your account settings and onboarding state."
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!profile) {
    return (
      <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="error"
              title="Profile unavailable"
              description={
                error ?? "We could not load your mobile profile state."
              }
              onRetry={() => {
                void handleRefresh();
              }}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[styles.safeArea, { backgroundColor: tokens.colors.shell }]}
    >
      <LinearGradient
        colors={tokens.gradients.page}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: tokens.colors.surfaceStrong,
              borderColor: tokens.colors.border,
            },
            pressed ? styles.pressed : null,
          ]}
        >
          <SymbolView
            name="chevron.left"
            size={17}
            tintColor={tokens.colors.textPrimary}
            type="monochrome"
          />
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          Settings
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom + 116, 140),
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
            tintColor={tokens.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/settings/profile" as never)}
          style={({ pressed }) => [
            styles.profileCard,
            {
              backgroundColor:
                tokens.mode === "dark"
                  ? "rgba(31, 32, 34, 0.96)"
                  : "#FFFFFF",
              borderColor: tokens.colors.border,
            },
            pressed ? styles.pressed : null,
          ]}
        >
          <SettingsAvatar initials={identity.initials} />
          <View style={styles.profileCopy}>
            <Text
              numberOfLines={1}
              style={[
                styles.profileName,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {identity.fullName}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.profileMeta,
                {
                  color: tokens.colors.textTertiary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {identity.secondary}
            </Text>
          </View>
          <SymbolView
            name="chevron.right"
            size={16}
            tintColor={tokens.colors.textTertiary}
            type="monochrome"
          />
        </Pressable>

        <SettingsGroup>
          <SettingsRow
            icon="person.text.rectangle"
            onPress={() => router.push("/settings/profile" as never)}
            subtitle={profile.socialProfile.headline ?? "Full name and username"}
            title="Profile fields"
          />
          <SettingsDivider />
          <SettingsRow
            icon="eye"
            onPress={() => router.push("/settings/privacy" as never)}
            rightLabel={getVisibilityLabel(
              profile.socialProfile.profileVisibility,
            )}
            subtitle={
              profile.socialProfile.showAttendance
                ? "Attendance visible"
                : "Attendance hidden"
            }
            title="Visibility and attendance"
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            icon="moon"
            onPress={() => router.push("/settings/theme" as never)}
            rightLabel="Theme"
            title="Theme and access"
          />
          <SettingsDivider />
          <SettingsRow
            icon="crown"
            onPress={() => router.push("/settings/subscription" as never)}
            rightLabel={
              subscriptionLoading && !subscription
                ? "Checking"
                : formatSubscriptionSummary(subscription)
            }
            subtitle={
              hasPaidAccess(subscription)
                ? "Manage renewals and restore access"
                : "Unlock Pro recommendations and calendar sync"
            }
            title="KureCal Pro"
          />
          <SettingsDivider />
          <SettingsRow
            icon="calendar.badge.plus"
            onPress={() => router.push("/settings/calendar" as never)}
            rightLabel={getCalendarLabel(
              googleCalendarStatus,
              appleCalendarPermission,
            )}
            title="Calendar integrations"
          />
          <SettingsDivider />
          <SettingsRow
            icon="sparkles"
            onPress={() => router.push("/settings/career" as never)}
            rightLabel={hasCompletedOnboarding ? "Ready" : "Set up"}
            subtitle={
              careerSummary ??
              "Recommendation inputs for your career goals and interests"
            }
            title="Recommendation inputs"
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            icon="questionmark.circle"
            onPress={() => {
              void openWebPath("/contact");
            }}
            title="FAQ and support"
          />
          <SettingsDivider />
          <SettingsRow
            icon="doc.text"
            onPress={() => {
              void openWebPath("/legal/terms");
            }}
            title="Terms of service"
          />
          <SettingsDivider />
          <SettingsRow
            icon="lock.shield"
            onPress={() => {
              void openWebPath("/legal/privacy");
            }}
            title="Privacy policy"
          />
        </SettingsGroup>

        {error ? (
          <Text
            style={[
              styles.inlineError,
              {
                color: tokens.colors.danger,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {error}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void signOut();
          }}
          style={({ pressed }) => [
            styles.logoutButton,
            {
              backgroundColor: tokens.colors.textPrimary,
            },
            pressed ? styles.pressed : null,
          ]}
        >
          <SymbolView
            name="rectangle.portrait.and.arrow.right"
            size={18}
            tintColor={tokens.colors.danger}
            type="monochrome"
          />
          <Text
            style={[
              styles.logoutLabel,
              {
                color: tokens.colors.danger,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Log Out
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  stateWrap: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  headerSpacer: {
    width: 42,
  },
  content: {
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  profileCard: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    minHeight: 92,
    padding: 18,
  },
  profileCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
  },
  profileMeta: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  logoutButton: {
    alignItems: "center",
    borderRadius: 28,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 20,
  },
  logoutLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  inlineError: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.992 }],
  },
});
