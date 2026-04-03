import { useEffect, useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MobileProfileUpdate, ProfileVisibility } from '@kurecal/domain';

import { ScreenStateView } from '../../src/components/ScreenStateView';
import { useAuth } from '../../src/context/AuthProvider';
import { updateMobileProfile } from '../../src/lib/mobileApi';

const VISIBILITY_OPTIONS: Array<{
  description: string;
  label: string;
  value: ProfileVisibility;
}> = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can see your profile details.',
  },
  {
    value: 'connections',
    label: 'Connections',
    description: 'Approved connections can view your profile.',
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can view your public profile card.',
  },
];

export default function SettingsScreen() {
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
    profileVisibility: 'private',
    showAttendance: false,
  });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      .join(' · ');
  }, [profile?.careerProfile]);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);

    try {
      await refreshProfile();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to refresh your profile'
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
      Alert.alert('Profile saved', 'Your mobile profile settings are updated.');
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : 'Unable to save your profile';
      setError(message);
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !profile) {
    return (
      <LinearGradient colors={['#08111f', '#05070c', '#030406']} style={styles.gradient}>
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
      <LinearGradient colors={['#08111f', '#05070c', '#030406']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="error"
              title="Profile unavailable"
              description={error ?? 'We could not load your mobile profile state.'}
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
    <LinearGradient colors={['#08111f', '#05070c', '#030406']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void handleRefresh();
              }}
              tintColor="#7dd3fc"
            />
          }
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Profile</Text>
            <Text style={styles.title}>
              {profile.profile.fullName ?? profile.socialProfile.username ?? 'Your mobile profile'}
            </Text>
            <Text style={styles.subtitle}>
              {profile.socialProfile.headline ??
                'Update your identity, privacy, and career setup for the mobile app.'}
            </Text>
            <Text style={styles.meta}>{session?.user.email ?? 'Unknown email'}</Text>
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
              value={draft.fullName ?? ''}
            />
            <TextInput
              autoCapitalize="none"
              onChangeText={(value) =>
                setDraft((current) => ({ ...current, username: value || null }))
              }
              placeholder="Username"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={draft.username ?? ''}
            />
            <TextInput
              onChangeText={(value) =>
                setDraft((current) => ({ ...current, headline: value || null }))
              }
              placeholder="Headline"
              placeholderTextColor="#64748b"
              style={[styles.input, styles.multilineInput]}
              multiline
              value={draft.headline ?? ''}
            />
            <TextInput
              autoCapitalize="none"
              onChangeText={(value) =>
                setDraft((current) => ({ ...current, timezone: value || null }))
              }
              placeholder="Timezone"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={draft.timezone ?? ''}
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
                    <Text style={styles.choiceDescription}>{option.description}</Text>
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
                thumbColor={draft.showAttendance ? '#e0f2fe' : '#e2e8f0'}
                trackColor={{
                  false: 'rgba(148, 163, 184, 0.32)',
                  true: 'rgba(45, 212, 191, 0.58)',
                }}
                value={draft.showAttendance ?? false}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Career setup</Text>
            <Text style={styles.cardBody}>
              {hasCompletedOnboarding
                ? careerSummary ?? 'Career profile completed.'
                : 'Finish onboarding to unlock personalized recommendations.'}
            </Text>
            {profile.careerProfile?.primarySkills?.length ? (
              <View style={styles.chipRow}>
                {profile.careerProfile.primarySkills.slice(0, 5).map((skill) => (
                  <View key={skill} style={styles.chip}>
                    <Text style={styles.chipLabel}>{skill}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '../onboarding',
                  params: { resume: '1' },
                })
              }
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.secondaryButtonPressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonLabel}>
                {hasCompletedOnboarding ? 'Edit career profile' : 'Complete onboarding'}
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
                {saving ? 'Saving…' : 'Save profile'}
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
    gap: 12,
  },
  card: {
    backgroundColor: 'rgba(8, 15, 24, 0.88)',
    borderColor: 'rgba(125, 211, 252, 0.14)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 22,
  },
  cardBody: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
  },
  chip: {
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    borderColor: 'rgba(45, 212, 191, 0.18)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipLabel: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  choiceCardPressed: {
    opacity: 0.92,
  },
  choiceCardSelected: {
    borderColor: 'rgba(45, 212, 191, 0.36)',
    backgroundColor: 'rgba(19, 78, 74, 0.44)',
  },
  choiceDescription: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  choiceStack: {
    gap: 10,
  },
  choiceTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    gap: 18,
    padding: 24,
  },
  eyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  gradient: {
    flex: 1,
  },
  hero: {
    gap: 12,
  },
  inlineError: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.74)',
    borderColor: 'rgba(148, 163, 184, 0.16)',
    borderRadius: 16,
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  meta: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  multilineInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#7dd3fc',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 20,
  },
  primaryButtonLabel: {
    color: '#082f49',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  safeArea: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.24)',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 20,
  },
  secondaryButtonLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonPressed: {
    opacity: 0.82,
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  switchDescription: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  switchTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.9,
    lineHeight: 36,
  },
});
