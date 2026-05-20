import type { MobilePublicProfile } from '@kurecal/domain';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { HeaderActionButton, MobilePage } from '../../src/components/chrome/MobilePage';
import { ScreenState } from '../../src/components/chrome/ScreenState';
import { CommunityFollowButton } from '../../src/components/community/CommunityFollowButton';
import { CommunityProfileHeroBlock } from '../../src/components/community/CommunityProfileHeroBlock';
import {
  applyFollowStateToStatus,
  formatCommunityCompactCount,
  formatMutualConnectionsLabel,
  getNetworkingRelationshipLabels,
  getPublicProfileCareerSummary,
} from '../../src/components/community/presentation';
import { ProfileActivityTimeline } from '../../src/components/profile/ProfileActivityTimeline';
import { ProfileNetworkingCTA } from '../../src/components/profile/ProfileNetworkingCTA';
import type { ProfileStrengthItem } from '../../src/components/profile/ProfileStrengthMeter';
import { ProfileStrengthMeter } from '../../src/components/profile/ProfileStrengthMeter';
import { useAppTheme } from '../../src/providers/ThemeProvider';
import {
  followMobileUser,
  loadMobilePublicProfile,
  unfollowMobileUser,
  updateMobileNetworkingContact,
} from '../../src/lib/mobileApi';

function getProfileHeroBadges(
  profile: MobilePublicProfile,
  relationshipLabels: string[]
): string[] {
  const badges: string[] = [];

  if (relationshipLabels[0]) {
    badges.push(relationshipLabels[0]);
  }

  if (profile.recentAttendingEvents.length > 0) {
    badges.push(
      `${formatCommunityCompactCount(profile.recentAttendingEvents.length)} recent event${profile.recentAttendingEvents.length === 1 ? '' : 's'}`
    );
  } else if (profile.mutualConnectionsCount > 0) {
    badges.push(formatMutualConnectionsLabel(profile.mutualConnectionsCount));
  } else {
    badges.push('Public profile');
  }

  return badges.slice(0, 2);
}

function getProfileHeroSummary(profile: MobilePublicProfile): string {
  const detailParts = [
    profile.careerProfile?.industry?.trim() || null,
    profile.mutualConnectionsCount > 0
      ? formatMutualConnectionsLabel(profile.mutualConnectionsCount)
      : null,
  ].filter(Boolean);

  if (detailParts.length > 0) {
    return detailParts.join(' · ');
  }

  if (profile.recentAttendingEvents.length > 0) {
    return `${formatCommunityCompactCount(profile.recentAttendingEvents.length)} recent event${profile.recentAttendingEvents.length === 1 ? '' : 's'} visible on profile.`;
  }

  return 'Public networking profile';
}

function getStrengthItems(profile: MobilePublicProfile): ProfileStrengthItem[] {
  return [
    { label: 'Photo', state: profile.avatarUrl ? 'done' : 'open' },
    { label: 'Name', state: profile.fullName ? 'done' : 'open' },
    { label: 'Headline', state: profile.headline ? 'done' : 'open' },
    { label: 'Role', state: profile.careerProfile?.currentRole ? 'done' : 'open' },
    { label: 'Industry', state: profile.careerProfile?.industry ? 'done' : 'open' },
  ];
}

export default function PublicProfileScreen() {
  const { tokens } = useAppTheme();
  const { username } = useLocalSearchParams<{ username: string | string[] }>();
  const resolvedUsername = Array.isArray(username) ? username[0] : username;
  const requestSequenceRef = useRef(0);

  const [profile, setProfile] = useState<MobilePublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followPending, setFollowPending] = useState(false);
  const [networkingActionPending, setNetworkingActionPending] = useState<
    'request' | 'confirm' | null
  >(null);

  const loadProfile = useCallback(async () => {
    const trimmed = resolvedUsername?.trim();
    if (!trimmed) {
      setError('Username is required.');
      setLoading(false);
      return;
    }

    const requestId = ++requestSequenceRef.current;
    setLoading(true);

    try {
      const nextProfile = await loadMobilePublicProfile(trimmed);
      if (requestId !== requestSequenceRef.current) return;
      setProfile(nextProfile);
      setError(null);
    } catch (nextError) {
      if (requestId !== requestSequenceRef.current) return;
      setError(
        nextError instanceof Error ? nextError.message : 'Unable to load this public profile.'
      );
    } finally {
      if (requestId === requestSequenceRef.current) setLoading(false);
    }
  }, [resolvedUsername]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const relationshipLabels = useMemo(
    () =>
      profile
        ? getNetworkingRelationshipLabels({
            isInNetwork: profile.relationship?.isFollowing ?? false,
            followsViewer: profile.relationship?.isFollowedBy ?? false,
            isMutualFollow:
              (profile.relationship?.isFollowing ?? false) &&
              (profile.relationship?.isFollowedBy ?? false),
          })
        : [],
    [profile]
  );

  const headline = getPublicProfileCareerSummary(
    profile?.careerProfile ?? null,
    profile?.headline
  );

  async function handleToggleFollow() {
    if (!profile || profile.isViewerOwner) return;
    const isFollowing = profile.relationship?.isFollowing ?? false;
    setFollowPending(true);
    try {
      if (isFollowing) {
        await unfollowMobileUser(profile.id);
      } else {
        await followMobileUser(profile.id);
      }
      setProfile((current) => {
        if (!current) return current;
        return {
          ...current,
          followerCount: Math.max(0, current.followerCount + (!isFollowing ? 1 : -1)),
          relationship: applyFollowStateToStatus(current.relationship, !isFollowing),
        };
      });
    } catch (nextError) {
      Alert.alert(
        isFollowing ? 'Unfollow failed' : 'Follow failed',
        nextError instanceof Error ? nextError.message : 'Unable to update follow status.'
      );
    } finally {
      setFollowPending(false);
    }
  }

  async function handleNetworkingAction(action: 'mark_request_sent' | 'confirm_connection') {
    if (!profile || profile.isViewerOwner || networkingActionPending) return;
    setNetworkingActionPending(action === 'mark_request_sent' ? 'request' : 'confirm');
    try {
      const result = await updateMobileNetworkingContact({
        target: { kind: 'profile', id: profile.id },
        action,
      });
      setProfile((current) =>
        current ? { ...current, networkingState: result.networkingState } : current
      );
    } catch (nextError) {
      Alert.alert(
        action === 'mark_request_sent' ? 'Unable to log request' : 'Unable to confirm connection',
        nextError instanceof Error ? nextError.message : 'Please try again.'
      );
    } finally {
      setNetworkingActionPending(null);
    }
  }

  return (
    <MobilePage
      action={<HeaderActionButton label="Back" onPress={() => router.back()} />}
      subtitle="Public networking context and recent activity."
      title="Profile"
    >
      {loading && !profile ? (
        <ScreenState
          mode="loading"
          title="Loading profile"
          description="Pulling profile details, recent events, and follow context."
        />
      ) : null}

      {error && !profile ? (
        <ScreenState
          mode="error"
          title="Profile unavailable"
          description={error}
          action={
            <HeaderActionButton label="Retry" onPress={() => { void loadProfile(); }} />
          }
        />
      ) : null}

      {profile ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { backgroundColor: tokens.colors.shell },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <CommunityProfileHeroBlock
            action={
              !profile.isViewerOwner ? (
                <CommunityFollowButton
                  appearance="default"
                  followsViewer={profile.relationship?.isFollowedBy ?? false}
                  isFollowing={profile.relationship?.isFollowing ?? false}
                  isPending={followPending}
                  size="compact"
                  accessibilityLabel={`${profile.relationship?.isFollowing ? 'Unfollow' : 'Follow'} ${profile.fullName || profile.username}`}
                  onPress={handleToggleFollow}
                  showPlusIcon
                />
              ) : null
            }
            avatarUrl={profile.avatarUrl}
            badges={getProfileHeroBadges(profile, relationshipLabels)}
            displayName={profile.fullName || `@${profile.username}`}
            headline={headline}
            size="profile"
            summary={getProfileHeroSummary(profile)}
            toneInput={{
              currentRole: profile.careerProfile?.currentRole,
              industry: profile.careerProfile?.industry,
              seed: profile.username,
              isInNetwork: profile.relationship?.isFollowing ?? false,
              followsViewer: profile.relationship?.isFollowedBy ?? false,
              isMutualFollow:
                (profile.relationship?.isFollowing ?? false) &&
                (profile.relationship?.isFollowedBy ?? false),
            }}
            username={profile.username}
          />

          {!profile.isViewerOwner ? (
            <View
              style={[
                styles.section,
                {
                  backgroundColor: tokens.colors.surface,
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.md,
                },
              ]}
            >
              <ProfileNetworkingCTA
                status={profile.networkingState?.status ?? 'none'}
                pendingAction={networkingActionPending}
                onMarkRequest={() => { void handleNetworkingAction('mark_request_sent'); }}
                onConfirm={() => { void handleNetworkingAction('confirm_connection'); }}
              />
            </View>
          ) : null}

          {profile.isViewerOwner ? (
            <View
              style={[
                styles.section,
                {
                  backgroundColor: tokens.colors.surface,
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.md,
                  overflow: 'hidden',
                },
              ]}
            >
              <ProfileStrengthMeter
                items={getStrengthItems(profile)}
                onEdit={() => router.push('/settings/profile')}
              />
            </View>
          ) : null}

          <View
            style={[
              styles.section,
              {
                backgroundColor: tokens.colors.surface,
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.md,
                paddingVertical: 12,
              },
            ]}
          >
            <ProfileActivityTimeline
              events={profile.recentAttendingEvents}
              onEventPress={(eventId) => router.push(`/event/${eventId}`)}
            />
          </View>
        </ScrollView>
      ) : null}
    </MobilePage>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
