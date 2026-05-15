import { useCallback, useEffect, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type {
  MobileProfileUpdate,
  NormalizedSubscription,
  ProfileVisibility,
} from "@kurecal/domain";

import { ScreenStateView } from "../../src/components/ScreenStateView";
import { useAuth } from "../../src/context/AuthProvider";
import {
  loadMobileSubscriptionStatus,
  updateMobileProfile,
} from "../../src/lib/mobileApi";
import { useAppTheme } from "../../src/providers/ThemeProvider";
import type { ThemePreference } from "../../src/theme/tokens";

const VISIBILITY_OPTIONS: Array<{
  description: string;
  label: string;
  value: ProfileVisibility;
}> = [
  {
    value: "private",
    label: "Private",
    description: "Only you can see your profile details.",
  },
  {
    value: "connections",
    label: "Connections",
    description: "Approved connections can view your profile.",
  },
  {
    value: "public",
    label: "Public",
    description: "Anyone can view your public profile card.",
  },
];

const THEME_OPTIONS: Array<{
  description: string;
  label: string;
  value: ThemePreference;
}> = [
  {
    value: "system",
    label: "System",
    description: "Match your device appearance.",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Use the darker, Linear-style app surface.",
  },
  {
    value: "light",
    label: "Light",
    description: "Use the brighter app surface.",
  },
];

function hasPaidAccess(subscription: NormalizedSubscription | null): boolean {
  if (!subscription || subscription.tier === "free") {
    return false;
  }

  if (
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due"
  ) {
    return true;
  }

  if (subscription.status === "canceled" && subscription.currentPeriodEnd) {
    return new Date(subscription.currentPeriodEnd).getTime() > Date.now();
  }

  return false;
}

function formatSubscriptionSummary(
  subscription: NormalizedSubscription | null,
): string {
  if (!subscription) {
    return "Checking your subscription access.";
  }

  const tier = subscription.tier === "free" ? "Free" : "KureCal Pro";
  const status =
    subscription.status === "trialing"
      ? "Trialing"
      : subscription.status.replace(/_/g, " ");

  return `${tier} · ${status}`;
}

export default function SettingsScreen() {
  const { preference, resolvedTheme, setThemePreference, tokens } =
    useAppTheme();
  const {
    hasCompletedOnboarding,
    loading,
    profile,
    refreshProfile,
    session,
    signOut,
  } = useAuth();
  const [draft, setDraft] = useState<MobileProfileUpdate>({
    fullName: null,
    timezone: null,
    username: null,
    headline: null,
    profileVisibility: "private",
    showAttendance: false,
  });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] =
    useState<NormalizedSubscription | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(
    null,
  );
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDraft({
      fullName: profile.profile.fullName ?? null,
      timezone: profile.profile.timezone ?? null,
      username: profile.socialProfile.username ?? null,
      headline: profile.socialProfile.headline ?? null,
      profileVisibility: profile.socialProfile.profileVisibility,
      showAttendance: profile.socialProfile.showAttendance,
    });
  }, [profile]);

  const refreshSubscription = useCallback(async () => {
    setSubscriptionLoading(true);

    try {
      const nextSubscription = await loadMobileSubscriptionStatus();
      setSubscription(nextSubscription);
      setSubscriptionError(null);
    } catch (nextError) {
      setSubscriptionError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to refresh your subscription",
      );
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profile) {
      return;
    }

    void refreshSubscription();
  }, [profile, refreshSubscription]);

  const careerSummary = useMemo(() => {
    if (!profile?.careerProfile) {
      return null;
    }

    return [
      profile.careerProfile.currentRole,
      profile.careerProfile.seniority,
      profile.careerProfile.industry,
    ]
      .filter(Boolean)
      .join(" · ");
  }, [profile?.careerProfile]);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);

    try {
      await Promise.all([refreshProfile(), refreshSubscription()]);
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

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      await updateMobileProfile(draft);
      await refreshProfile();
      Alert.alert("Profile saved", "Your mobile profile settings are updated.");
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Unable to save your profile";
      setError(message);
      Alert.alert("Save failed", message);
    } finally {
      setSaving(false);
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
    <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void handleRefresh();
              }}
              tintColor={tokens.colors.accent}
            />
          }
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Profile</Text>
            <Text style={styles.title}>
              {profile.profile.fullName ??
                profile.socialProfile.username ??
                "Your mobile profile"}
            </Text>
            <Text style={styles.subtitle}>
              {profile.socialProfile.headline ??
                "Update your identity, privacy, and career setup for the mobile app."}
            </Text>
            <Text style={styles.meta}>
              {session?.user.email ?? "Unknown email"}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Subscription</Text>
            <Text style={styles.subscriptionLabel}>
              {subscriptionLoading && !subscription
                ? "Checking access…"
                : formatSubscriptionSummary(subscription)}
            </Text>
            <Text style={styles.cardBody}>
              {subscriptionError
                ? subscriptionError
                : hasPaidAccess(subscription)
                  ? "Your mobile upgrade flow is active. Manage renewals, restore access, or review your plan from the native paywall."
                  : "Upgrade to unlock full recommendations, calendar sync, and unlimited saved events inside the Expo app."}
            </Text>
            <Pressable
              onPress={() => router.push("../paywall")}
              style={({ pressed }) => [
                hasPaidAccess(subscription)
                  ? styles.secondaryButton
                  : styles.primaryButton,
                pressed
                  ? hasPaidAccess(subscription)
                    ? styles.secondaryButtonPressed
                    : styles.primaryButtonPressed
                  : null,
              ]}
            >
              <Text
                style={
                  hasPaidAccess(subscription)
                    ? styles.secondaryButtonLabel
                    : styles.primaryButtonLabel
                }
              >
                {hasPaidAccess(subscription)
                  ? "Manage subscription"
                  : "Unlock KureCal Pro"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Appearance</Text>
            <Text style={styles.cardBody}>
              Current theme: {resolvedTheme === "dark" ? "Dark" : "Light"}
            </Text>
            <View style={styles.themeChoiceRow}>
              {THEME_OPTIONS.map((option) => {
                const selected = preference === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setThemePreference(option.value)}
                    style={({ pressed }) => [
                      styles.themeChoice,
                      selected ? styles.themeChoiceSelected : null,
                      pressed ? styles.choiceCardPressed : null,
                    ]}
                  >
                    <Text style={styles.themeChoiceLabel}>{option.label}</Text>
                    <Text style={styles.themeChoiceDescription}>
                      {option.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Identity</Text>
            <TextInput
              onChangeText={(value) =>
                setDraft((current) => ({ ...current, fullName: value || null }))
              }
              placeholder="Full name"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={draft.fullName ?? ""}
            />
            <TextInput
              autoCapitalize="none"
              onChangeText={(value) =>
                setDraft((current) => ({ ...current, username: value || null }))
              }
              placeholder="Username"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={draft.username ?? ""}
            />
            <TextInput
              onChangeText={(value) =>
                setDraft((current) => ({ ...current, headline: value || null }))
              }
              placeholder="Headline"
              placeholderTextColor="#64748b"
              style={[styles.input, styles.multilineInput]}
              multiline
              value={draft.headline ?? ""}
            />
            <TextInput
              autoCapitalize="none"
              onChangeText={(value) =>
                setDraft((current) => ({ ...current, timezone: value || null }))
              }
              placeholder="Timezone"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={draft.timezone ?? ""}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Visibility</Text>
            <View style={styles.choiceStack}>
              {VISIBILITY_OPTIONS.map((option) => {
                const selected = draft.profileVisibility === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        profileVisibility: option.value,
                      }))
                    }
                    style={({ pressed }) => [
                      styles.choiceCard,
                      selected ? styles.choiceCardSelected : null,
                      pressed ? styles.choiceCardPressed : null,
                    ]}
                  >
                    <Text style={styles.choiceTitle}>{option.label}</Text>
                    <Text style={styles.choiceDescription}>
                      {option.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>Show attendance</Text>
                <Text style={styles.switchDescription}>
                  Let connections see when you are attending saved events.
                </Text>
              </View>
              <Switch
                onValueChange={(value) =>
                  setDraft((current) => ({ ...current, showAttendance: value }))
                }
                thumbColor={draft.showAttendance ? "#e0f2fe" : "#e2e8f0"}
                trackColor={{
                  false: "rgba(148, 163, 184, 0.32)",
                  true: "rgba(45, 212, 191, 0.58)",
                }}
                value={draft.showAttendance ?? false}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Career setup</Text>
            <Text style={styles.cardBody}>
              {hasCompletedOnboarding
                ? (careerSummary ?? "Career profile completed.")
                : "Finish onboarding to unlock personalized recommendations."}
            </Text>
            {profile.careerProfile?.primarySkills?.length ? (
              <View style={styles.chipRow}>
                {profile.careerProfile.primarySkills
                  .slice(0, 5)
                  .map((skill) => (
                    <View key={skill} style={styles.chip}>
                      <Text style={styles.chipLabel}>{skill}</Text>
                    </View>
                  ))}
              </View>
            ) : null}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "../onboarding",
                  params: { resume: "1" },
                })
              }
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.secondaryButtonPressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonLabel}>
                {hasCompletedOnboarding
                  ? "Edit career profile"
                  : "Complete onboarding"}
              </Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.inlineError}>{error}</Text> : null}

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => {
                void handleSave();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.primaryButtonPressed : null,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>
                {saving ? "Saving…" : "Save profile"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                void signOut();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.secondaryButtonPressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonLabel}>Sign out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    gap: 8,
  },
  card: {
    backgroundColor: "#121314",
    borderColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 6,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  cardBody: {
    color: "#c6c5d5",
    fontSize: 13,
    lineHeight: 18,
  },
  cardTitle: {
    color: "#e3e2e3",
    fontSize: 14,
    fontWeight: "700",
  },
  chip: {
    backgroundColor: "#1f2021",
    borderColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 2,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipLabel: {
    color: "#e3e2e3",
    fontSize: 12,
    fontWeight: "600",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceCard: {
    backgroundColor: "#1b1c1d",
    borderColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 4,
    borderWidth: 1,
    gap: 4,
    padding: 10,
  },
  choiceCardPressed: {
    opacity: 0.92,
  },
  choiceCardSelected: {
    borderColor: "#5e6ad2",
    backgroundColor: "rgba(94, 106, 210, 0.14)",
  },
  choiceDescription: {
    color: "#908f9e",
    fontSize: 12,
    lineHeight: 16,
  },
  choiceStack: {
    gap: 8,
  },
  choiceTitle: {
    color: "#e3e2e3",
    fontSize: 13,
    fontWeight: "600",
  },
  content: {
    gap: 12,
    padding: 20,
  },
  eyebrow: {
    color: "#908f9e",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.66,
    textTransform: "uppercase",
  },
  gradient: {
    flex: 1,
  },
  hero: {
    gap: 6,
  },
  inlineError: {
    color: "#fca5a5",
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: "#1b1c1d",
    borderColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 4,
    borderWidth: 1,
    color: "#e3e2e3",
    fontSize: 14,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  meta: {
    color: "#908f9e",
    fontSize: 12,
    fontWeight: "500",
  },
  multilineInput: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#5e6ad2",
    borderRadius: 4,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 12,
  },
  primaryButtonLabel: {
    color: "#fdfaff",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  safeArea: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 12,
  },
  secondaryButtonLabel: {
    color: "#c6c5d5",
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryButtonPressed: {
    opacity: 0.82,
  },
  stateWrap: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  subtitle: {
    color: "#c6c5d5",
    fontSize: 13,
    lineHeight: 18,
  },
  subscriptionLabel: {
    color: "#e3e2e3",
    fontSize: 13,
    fontWeight: "600",
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  switchDescription: {
    color: "#908f9e",
    fontSize: 12,
    lineHeight: 16,
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  switchTitle: {
    color: "#e3e2e3",
    fontSize: 13,
    fontWeight: "600",
  },
  themeChoice: {
    backgroundColor: "#1b1c1d",
    borderColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 4,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    minHeight: 76,
    padding: 10,
  },
  themeChoiceDescription: {
    color: "#908f9e",
    fontSize: 12,
    lineHeight: 16,
  },
  themeChoiceLabel: {
    color: "#e3e2e3",
    fontSize: 13,
    fontWeight: "600",
  },
  themeChoiceRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeChoiceSelected: {
    backgroundColor: "rgba(94, 106, 210, 0.14)",
    borderColor: "#5e6ad2",
  },
  title: {
    color: "#e3e2e3",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.24,
    lineHeight: 29,
  },
});
