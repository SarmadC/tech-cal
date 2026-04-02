import { Alert, Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { HeaderActionButton, MobilePage } from '@/components/chrome/MobilePage';
import { InlineNotice } from '@/components/chrome/InlineNotice';
import { ListRow } from '@/components/chrome/ListRow';
import { MobileSegmentedControl } from '@/components/chrome/MobileSegmentedControl';
import { KureButton } from '@/components/chrome/KureButton';
import { SectionCard } from '@/components/chrome/SectionCard';
import { useMobileAuth } from '@/hooks/useMobileAuth';
import { getApiBaseUrl } from '@/lib/env';
import { getMobileApiClient } from '@/lib/mobileApi';
import { mobileQueryKeys } from '@/lib/queryKeys';
import { mobileQueryStaleTimes } from '@/lib/queryClient';
import { useAppTheme } from '@/providers/ThemeProvider';
import type { ThemePreference } from '@/theme/tokens';
import type { MobileSocialProfileVisibility } from '@kurecal/mobile-client';

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const { preference, setThemePreference, tokens } = useAppTheme();
  const { profile, user, signOut } = useMobileAuth();
  const apiClient = getMobileApiClient();
  const params = useLocalSearchParams<{ focus?: string }>();
  const focus = typeof params.focus === 'string' ? params.focus : null;

  const subscriptionQuery = useQuery({
    queryKey: mobileQueryKeys.subscription.status(),
    staleTime: mobileQueryStaleTimes.medium,
    queryFn: async () => {
      const result = await apiClient.getSubscriptionStatus();
      if (!result.success) throw new Error(result.error ?? 'Unable to load subscription');
      return result.data;
    },
  });

  const blockedUsersQuery = useQuery({
    queryKey: mobileQueryKeys.community.blockedUsers(),
    staleTime: mobileQueryStaleTimes.medium,
    queryFn: async () => {
      const result = await apiClient.getBlockedUsers();
      if (!result.success) throw new Error(result.error ?? 'Unable to load blocked users.');
      return result.data ?? [];
    },
  });

  const socialProfileQuery = useQuery({
    queryKey: mobileQueryKeys.profile.social(),
    staleTime: mobileQueryStaleTimes.medium,
    queryFn: async () => {
      const result = await apiClient.getSocialProfile();
      if (!result.success) throw new Error(result.error ?? 'Unable to load networking visibility.');
      return result.data;
    },
  });

  const socialProfileMutation = useMutation({
    mutationFn: async (
      payload: Partial<{
        profileVisibility: MobileSocialProfileVisibility;
        showAttendance: boolean;
      }>
    ) => {
      const result = await apiClient.updateSocialProfile(payload);
      if (!result.success) throw new Error(result.error ?? 'Unable to update networking visibility.');
      return result.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.profile.social() }),
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.community.home() }),
      ]);
    },
    onError: (error: Error) => {
      Alert.alert('Update failed', error.message);
    },
  });

  const socialProfile = socialProfileQuery.data;
  const visibilitySubtitle =
    socialProfile?.showAttendance && socialProfile.profileVisibility === 'public'
      ? "Attendees can find you on events you're attending."
      : socialProfile?.showAttendance
        ? 'Attendance visibility is on, but your profile still needs to be Public.'
        : "Attendees won't see you until this is enabled.";

  return (
    <MobilePage
      eyebrow="Settings"
      title="Account and appearance"
      subtitle="Profile, theme, billing, and support in the same mono mobile system as the app shell."
      action={<HeaderActionButton label="Done" onPress={() => router.back()} />}
      footerInset={40}
    >
      <SectionCard title={profile?.fullName ?? 'KureCal member'} detail={user?.email ?? 'Signed in'}>
        <Text style={[styles.meta, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>Timezone: {profile?.timezone ?? 'Not set'}</Text>
      </SectionCard>

      <SectionCard
        title="Networking visibility"
        detail="Controls whether people can find you around the events you're attending."
        style={focus === 'visibility' ? { borderColor: tokens.colors.accent, borderWidth: 1 } : undefined}
      >
        {focus === 'visibility' ? (
          <InlineNotice
            title="Fix your community visibility"
            description="To appear in attendee lists and Community networking, make your profile Public and turn on attendance visibility."
          />
        ) : null}

        <MobileSegmentedControl<MobileSocialProfileVisibility>
          options={[
            { id: 'private', label: 'Private' },
            { id: 'connections', label: 'Connections' },
            { id: 'public', label: 'Public' },
          ]}
          value={socialProfile?.profileVisibility ?? 'private'}
          onChange={(nextValue) => {
            void socialProfileMutation.mutateAsync({ profileVisibility: nextValue });
          }}
        />

        <ListRow
          title="Show my attendance"
          subtitle={visibilitySubtitle}
          trailing={
            <Switch
              accessibilityLabel="Toggle attendance visibility"
              disabled={socialProfileQuery.isLoading || socialProfileMutation.isPending}
              onValueChange={(value) => {
                void socialProfileMutation.mutateAsync({ showAttendance: value });
              }}
              thumbColor={tokens.mode === 'dark' ? tokens.colors.surface : undefined}
              trackColor={{
                false: tokens.colors.border,
                true: tokens.colors.accent,
              }}
              value={socialProfile?.showAttendance ?? false}
            />
          }
        />
      </SectionCard>

      <SectionCard
        title="Career onboarding"
        detail="Review or resume the native career profile flow that powers recommendation quality across the app."
      >
        <InlineNotice
          title="Resume the recommendation profile"
          description="This stays separate from visual preferences so you can revisit it without changing the rest of your settings."
        />
        <View style={styles.buttonStack}>
          <KureButton onPress={() => router.push('/onboarding?resume=1')}>Open career onboarding</KureButton>
        </View>
      </SectionCard>

      <SectionCard
        title="Appearance"
        detail="Theme preference is persisted on-device and defaults to the system setting."
      >
        <MobileSegmentedControl<ThemePreference>
          options={[
            { id: 'system', label: 'System' },
            { id: 'light', label: 'Light' },
            { id: 'dark', label: 'Dark' },
          ]}
          value={preference}
          onChange={(nextValue) => {
            void setThemePreference(nextValue);
          }}
        />
      </SectionCard>

      <SectionCard title="Subscription" detail="RevenueCat-backed access and upgrade entry points.">
        <Text style={[styles.meta, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}> 
          {subscriptionQuery.data ? `${subscriptionQuery.data.tier} • ${subscriptionQuery.data.provider}` : 'Loading status…'}
        </Text>
        <View style={styles.buttonStack}>
          <KureButton onPress={() => router.push('/paywall')}>Manage subscription</KureButton>
          <KureButton variant="secondary" onPress={() => router.push('/hackathons')}>Hackathons</KureButton>
        </View>
      </SectionCard>

      <SectionCard title="Support" detail="Open the web contact surface or sign out of the native shell.">
        <View style={styles.buttonStack}>
          <KureButton variant="secondary" onPress={() => Linking.openURL(`${getApiBaseUrl()}/contact`)}>
            Contact support
          </KureButton>
          <KureButton variant="danger" onPress={() => void signOut()}>
            Sign out
          </KureButton>
        </View>
      </SectionCard>

      <SectionCard title="Blocked members" detail="Same moderation state as the web product.">
        {blockedUsersQuery.data?.length ? (
          blockedUsersQuery.data.map((blockedUser) => (
            <ListRow
              key={blockedUser.id}
              title={blockedUser.fullName ?? blockedUser.username ?? 'Community member'}
              subtitle={blockedUser.headline ?? undefined}
              trailing={
                <KureButton
                  variant="ghost"
                  onPress={() =>
                    apiClient
                      .unblockUser(blockedUser.id)
                      .then(() =>
                        queryClient.invalidateQueries({
                          queryKey: mobileQueryKeys.community.blockedUsers(),
                        })
                      )
                      .catch((error) => Alert.alert('Unblock failed', error.message))
                  }
                >
                  Unblock
                </KureButton>
              }
            />
          ))
        ) : (
          <InlineNotice
            title="No blocked members"
            description="Your moderation list is clear on this account."
          />
        )}
      </SectionCard>
    </MobilePage>
  );
}

const styles = StyleSheet.create({
  meta: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonStack: {
    gap: 10,
  },
});
