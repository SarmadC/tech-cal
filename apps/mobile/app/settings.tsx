import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
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

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const { preference, setThemePreference, tokens } = useAppTheme();
  const { profile, user, signOut } = useMobileAuth();
  const apiClient = getMobileApiClient();

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
