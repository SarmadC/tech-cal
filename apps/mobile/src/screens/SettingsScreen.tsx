import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import type {
  MobileCalendarConnectionStatus,
  MobileProfileUpdate,
  NormalizedSubscription,
} from "@kurecal/domain";

import {
  SettingsButton,
  SettingsDivider,
  SettingsGroup,
  SettingsRow,
} from "../components/settings/mobile-settings-ui";
import { ScreenStateView } from "../components/ScreenStateView";
import { useAuth } from "../context/AuthProvider";
import { getMobileApiBaseUrl } from "../lib/env";
import { getDeviceCalendarPermissionStatus } from "../lib/deviceCalendarSync";
import {
  loadMobileGoogleCalendarStatus,
  loadMobileSubscriptionStatus,
  updateMobileProfile,
} from "../lib/mobileApi";
import {
  formatCareerSummary,
  formatSubscriptionSummary,
  hasPaidAccess,
} from "../lib/settingsPresentation";
import {
  openKureCalSubscriptionManagement,
  syncKureCalSubscriptionFromRevenueCat,
} from "../lib/revenuecat";
import { useAppTheme } from "../providers/ThemeProvider";
import { showActionSheet } from "../lib/actionSheet";
import { haptics } from "../lib/haptics";

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


export default function SettingsScreen({
  headerLeft,
}: { headerLeft?: ReactNode } = {}) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { panel } = useLocalSearchParams<{ panel?: string }>();
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
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFocusedField, setProfileFocusedField] = useState<
    "fullName" | "username" | "headline" | "bio" | null
  >(null);
  const [profileDraft, setProfileDraft] = useState<MobileProfileUpdate>({
    bio: null,
    fullName: null,
    headline: null,
    username: null,
  });
  const [googleCalendarStatus, setGoogleCalendarStatus] =
    useState<MobileCalendarConnectionStatus | null>(null);
  const [appleCalendarPermission, setAppleCalendarPermission] =
    useState("unknown");
  const [activePanel, setActivePanel] = useState<"career" | "profile" | null>(() =>
    panel === "career" || panel === "profile" ? panel : null,
  );

  const loadSettingsStatus = useCallback(async () => {
    setSubscriptionLoading(true);

    try {
      const [syncedSubscription, nextGoogleStatus, nextApplePermission] =
        await Promise.all([
          syncKureCalSubscriptionFromRevenueCat().catch(() => null),
          loadMobileGoogleCalendarStatus().catch(() => null),
          getDeviceCalendarPermissionStatus().catch(() => "unknown"),
        ]);
      const nextSubscription =
        syncedSubscription ?? (await loadMobileSubscriptionStatus().catch(() => null));

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

  useEffect(() => {
    if (panel === "career" || panel === "profile") {
      setActivePanel(panel);
    }
  }, [panel]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setProfileDraft({
      bio: profile.socialProfile.bio ?? null,
      fullName: profile.profile.fullName ?? null,
      headline: profile.socialProfile.headline ?? null,
      username: profile.socialProfile.username ?? null,
    });
  }, [profile]);

async function handleRefresh() {
    setRefreshing(true);
    setError(null);

    try {
      await Promise.all([refreshProfile(), loadSettingsStatus()]);
      haptics.success();
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

  async function handleSaveProfile() {
    setProfileSaving(true);

    try {
      await updateMobileProfile(profileDraft);
      await refreshProfile();
      Alert.alert("Profile saved", "Your mobile profile settings are updated.");
    } catch (nextError) {
      Alert.alert(
        "Save failed",
        nextError instanceof Error
          ? nextError.message
          : "Unable to save your profile",
      );
    } finally {
      setProfileSaving(false);
    }
  }

  const careerSummary = formatCareerSummary(profile?.careerProfile);
  const skills = profile?.careerProfile?.primarySkills ?? [];

  function renderProfileFieldLabel({
    helper,
    label,
  }: {
    helper?: string;
    label: string;
  }) {
    return (
      <View style={styles.profileFieldLabelWrap}>
        <Text
          style={[
            styles.profileFieldLabel,
            {
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {label}
        </Text>
        {helper ? (
          <Text
            style={[
              styles.profileFieldHelper,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {helper}
          </Text>
        ) : null}
      </View>
    );
  }

  function renderProfilePanel() {
    const inputStyle = [
      styles.profileInput,
      {
        backgroundColor: tokens.colors.input,
        borderColor: tokens.colors.borderStrong,
        color: tokens.colors.textPrimary,
        fontFamily: tokens.typography.sans,
        fontSize: tokens.typography.body,
        borderRadius: tokens.radius.md,
      },
    ];

    return (
      <>
        <SettingsGroup style={styles.profileFormGroup}>
          <View style={styles.profileField}>
            {renderProfileFieldLabel({ label: "Full name" })}
            <TextInput
              onBlur={() => setProfileFocusedField(null)}
              onChangeText={(value) =>
                setProfileDraft((current) => ({ ...current, fullName: value || null }))
              }
              onFocus={() => setProfileFocusedField("fullName")}
              placeholder="Full name"
              placeholderTextColor={tokens.colors.textTertiary}
              style={[
                inputStyle,
                profileFocusedField === "fullName"
                  ? { borderColor: tokens.colors.accent }
                  : null,
              ]}
              value={profileDraft.fullName ?? ""}
            />
          </View>

          <View style={styles.profileField}>
            {renderProfileFieldLabel({
              helper: "Shown on your public profile URL.",
              label: "Username",
            })}
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onBlur={() => setProfileFocusedField(null)}
              onChangeText={(value) =>
                setProfileDraft((current) => ({ ...current, username: value || null }))
              }
              onFocus={() => setProfileFocusedField("username")}
              placeholder="Username"
              placeholderTextColor={tokens.colors.textTertiary}
              style={[
                inputStyle,
                profileFocusedField === "username"
                  ? { borderColor: tokens.colors.accent }
                  : null,
              ]}
              value={profileDraft.username ?? ""}
            />
          </View>

          <View style={styles.profileField}>
            {renderProfileFieldLabel({
              helper: "Your role, team, or professional label.",
              label: "Role headline",
            })}
            <TextInput
              onBlur={() => setProfileFocusedField(null)}
              onChangeText={(value) =>
                setProfileDraft((current) => ({ ...current, headline: value || null }))
              }
              onFocus={() => setProfileFocusedField("headline")}
              placeholder="Data Analyst at Explore Edmonton"
              placeholderTextColor={tokens.colors.textTertiary}
              style={[
                inputStyle,
                profileFocusedField === "headline"
                  ? { borderColor: tokens.colors.accent }
                  : null,
              ]}
              value={profileDraft.headline ?? ""}
            />
          </View>

          <View style={styles.profileField}>
            {renderProfileFieldLabel({
              helper: "One or two sentences visitors see under your name.",
              label: "About",
            })}
            <TextInput
              maxLength={220}
              multiline
              onBlur={() => setProfileFocusedField(null)}
              onChangeText={(value) =>
                setProfileDraft((current) => ({ ...current, bio: value || null }))
              }
              onFocus={() => setProfileFocusedField("bio")}
              placeholder="Unlocking stories through data. Building bridges in the tech ecosystem."
              placeholderTextColor={tokens.colors.textTertiary}
              style={[
                inputStyle,
                styles.profileBioInput,
                profileFocusedField === "bio"
                  ? { borderColor: tokens.colors.accent }
                  : null,
              ]}
              textAlignVertical="top"
              value={profileDraft.bio ?? ""}
            />
          </View>
        </SettingsGroup>
        <SettingsButton
          disabled={profileSaving}
          label={profileSaving ? "Saving..." : "Save profile"}
          onPress={() => {
            void handleSaveProfile();
          }}
        />
      </>
    );
  }

  function renderCareerPanel() {
    return (
      <>
        <SettingsGroup style={styles.careerGroup}>
          <Text
            style={[
              styles.sectionLabel,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Current inputs
          </Text>
          <Text
            style={[
              styles.careerTitle,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {hasCompletedOnboarding
              ? (careerSummary ?? "Career profile completed.")
              : "Finish onboarding"}
          </Text>
          <Text
            style={[
              styles.careerDescription,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {hasCompletedOnboarding
              ? "These inputs tune your event recommendations, networking prompts, and calendar prioritization."
              : "Complete onboarding to unlock personalized recommendations."}
          </Text>

          {skills.length ? (
            <View style={styles.chipRow}>
              {skills.slice(0, 8).map((skill) => (
                <View
                  key={skill}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: tokens.colors.surfaceStrong,
                      borderColor: tokens.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      {
                        color: tokens.colors.textPrimary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                  >
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </SettingsGroup>
        <SettingsButton
          label={
            hasCompletedOnboarding ? "Edit career profile" : "Complete onboarding"
          }
          onPress={() =>
            router.push({
              pathname: "../onboarding",
              params: { resume: "1" },
            } as never)
          }
        />
      </>
    );
  }

  if (loading && !profile) {
    return (
      <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
        <View style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Loading profile"
              description="Pulling your account settings and onboarding state."
            />
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (!profile) {
    return (
      <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
        <View style={styles.safeArea}>
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
        </View>
      </LinearGradient>
    );
  }

  return (
    <View
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
        {activePanel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to settings"
            hitSlop={12}
            onPress={() => setActivePanel(null)}
            style={({ pressed }) => [
              styles.headerIconButton,
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
        ) : (
          (headerLeft ?? <View style={styles.headerSpacer} />)
        )}
        <Text
          style={[
            styles.headerTitle,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {activePanel === "career"
            ? "Recommendation inputs"
            : activePanel === "profile"
              ? "Profile fields"
              : "Settings"}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom + 32, 48),
          },
        ]}
        refreshControl={
          activePanel
            ? undefined
            : (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void handleRefresh();
                }}
                tintColor={tokens.colors.accent}
              />
            )
        }
        showsVerticalScrollIndicator={false}
      >
        {activePanel === "career" ? (
          renderCareerPanel()
        ) : activePanel === "profile" ? (
          renderProfilePanel()
        ) : (
          <>
        <SettingsGroup>
          <SettingsRow
            icon="person.text.rectangle"
            onPress={() => setActivePanel("profile")}
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
          <SettingsDivider />
          <SettingsRow
            icon="person.crop.circle.badge.xmark"
            onPress={() => router.push("/settings/blocked-users" as never)}
            subtitle="Review and unblock hidden profiles"
            title="Blocked users"
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
            onPress={() => {
              if (hasPaidAccess(subscription)) {
                void openKureCalSubscriptionManagement()
                  .then(() => loadSettingsStatus())
                  .catch((error) => {
                    Alert.alert(
                      "Unable to open subscription center",
                      error instanceof Error ? error.message : "Unknown error",
                    );
                  });
              } else {
                router.push("/paywall" as never);
              }
            }}
            rightLabel={
              subscriptionLoading && !subscription
                ? "Checking"
                : formatSubscriptionSummary(subscription)
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
            title="Integrations"
          />
          <SettingsDivider />
          <SettingsRow
            icon="sparkles"
            onPress={() => setActivePanel("career")}
            rightLabel={hasCompletedOnboarding ? "Ready" : "Set up"}
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
            haptics.warning();
            showActionSheet({
              title: "Log out?",
              message: "You can sign back in at any time.",
              options: [
                {
                  label: "Log Out",
                  destructive: true,
                  onPress: () => {
                    void signOut();
                  },
                },
              ],
            });
          }}
          style={({ pressed }) => [
            styles.logoutButton,
            {
              backgroundColor: "transparent",
              borderColor: tokens.colors.borderStrong,
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
          </>
        )}
      </ScrollView>
    </View>
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
    borderRadius: 6,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  headerSpacer: {
    width: 32,
  },
  headerIconButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  content: {
    gap: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  logoutButton: {
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  inlineError: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  careerGroup: {
    gap: 8,
    padding: 12,
  },
  profileFormGroup: {
    gap: 12,
    padding: 12,
  },
  profileField: {
    gap: 6,
  },
  profileFieldLabelWrap: {
    gap: 2,
  },
  profileFieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  profileFieldHelper: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  profileInput: {
    borderWidth: 1,
    fontWeight: "400",
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  profileBioInput: {
    minHeight: 96,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  careerTitle: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  careerDescription: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4,
  },
  chip: {
    borderRadius: 2,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.992 }],
  },
});
