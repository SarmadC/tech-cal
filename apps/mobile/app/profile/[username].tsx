import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MobileFollowStatus, MobilePublicProfile } from '@kurecal/domain';
import { HeaderActionButton } from '@/components/chrome/MobilePage';
import { KureScreen } from '@/components/chrome/KureScreen';
import { ScreenState } from '@/components/chrome/ScreenState';
import { CommunityAvatar } from '@/components/community/CommunityAvatar';
import { CommunityFollowButton } from '@/components/community/CommunityFollowButton';
import { CommunityProfileHeroBlock } from '@/components/community/CommunityProfileHeroBlock';
import { CommunitySection } from '@/components/community/CommunitySection';
import { CommunityUpcomingEventRow } from '@/components/community/CommunityUpcomingEventRow';
import {
  applyFollowStateToStatus,
  formatCommunityCompactCount,
  formatCommunityTabCount,
  formatMutualConnectionsLabel,
  getNetworkingRelationshipLabels,
  getPublicProfileCareerSummary,
} from '@/components/community/presentation';
import { getMobileApiClient } from '@/lib/mobileApi';
import { mobileQueryKeys } from '@/lib/queryKeys';
import { mobileQueryStaleTimes } from '@/lib/queryClient';
import { useAppTheme } from '@/providers/ThemeProvider';

function getRelationshipState(
  relationship: MobileFollowStatus | null | undefined
): {
  isInNetwork: boolean;
  followsViewer: boolean;
  isMutualFollow: boolean;
} {
  const isFollowing = relationship?.isFollowing ?? false;
  const isFollowedBy = relationship?.isFollowedBy ?? false;

  return {
    isInNetwork: isFollowing,
    followsViewer: isFollowedBy,
    isMutualFollow: isFollowing && isFollowedBy,
  };
}

function getProfileHeroBadges(
  profile: MobilePublicProfile,
  relationshipLabels: string[],
): string[] {
  const badges: string[] = [];

  if (relationshipLabels[0]) {
    badges.push(relationshipLabels[0]);
  }

  if (profile.recentAttendingEvents.length > 0) {
    badges.push(
      `${formatCommunityCompactCount(profile.recentAttendingEvents.length)} recent event${profile.recentAttendingEvents.length === 1 ? '' : 's'}`,
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

  if (profile.followerCount > 0) {
    return `${formatCommunityCompactCount(profile.followerCount)} follower${profile.followerCount === 1 ? '' : 's'} on this public profile.`;
  }

  return 'Public networking profile';
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string | string[] }>();
  const resolvedUsername = Array.isArray(username) ? username[0] : username;
  const queryClient = useQueryClient();
  const apiClient = getMobileApiClient();
  const { tokens } = useAppTheme();
  const [relationshipOverride, setRelationshipOverride] = useState<MobileFollowStatus | null | undefined>(undefined);

  const profileQuery = useQuery({
    queryKey: mobileQueryKeys.profile.public(resolvedUsername),
    enabled: Boolean(resolvedUsername),
    staleTime: mobileQueryStaleTimes.live,
    queryFn: async () => {
      const result = await apiClient.getPublicProfile(resolvedUsername!);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Unable to load this profile.');
      }

      return result.data;
    },
  });

  const profile = profileQuery.data;

  useEffect(() => {
    setRelationshipOverride(undefined);
  }, [profile?.id]);

  const followStatusQuery = useQuery({
    queryKey: mobileQueryKeys.profile.followStatus(profile?.id),
    enabled: Boolean(profile?.id && !profile.isViewerOwner),
    staleTime: mobileQueryStaleTimes.live,
    queryFn: async () => {
      const result = await apiClient.getFollowStatus(profile!.id);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Unable to load follow status.');
      }

      return result.data;
    },
  });

  const relationship = relationshipOverride ?? followStatusQuery.data ?? profile?.relationship ?? null;
  const relationshipState = getRelationshipState(relationship);
  const relationshipLabels = getNetworkingRelationshipLabels(relationshipState);
  const headline = getPublicProfileCareerSummary(profile?.careerProfile ?? null, profile?.headline);

  const followMutation = useMutation({
    mutationFn: async ({
      userId,
      username,
      isFollowing,
    }: {
      userId: string;
      username: string;
      isFollowing: boolean;
    }) => {
      const result = isFollowing
        ? await apiClient.unfollowUser(userId)
        : await apiClient.followUser(userId);

      if (!result.success) {
        throw new Error(result.error ?? 'Unable to update follow status.');
      }

      return { userId, username, nextIsFollowing: !isFollowing };
    },
    onSuccess: async ({ userId, username: targetUsername, nextIsFollowing }) => {
      const nextRelationship = applyFollowStateToStatus(relationship, nextIsFollowing);
      setRelationshipOverride(nextRelationship);

      queryClient.setQueryData<MobilePublicProfile | undefined>(
        mobileQueryKeys.profile.public(targetUsername),
        (previous) =>
          previous
            ? {
                ...previous,
                followerCount: Math.max(0, previous.followerCount + (nextIsFollowing ? 1 : -1)),
                relationship: nextRelationship,
              }
            : previous
      );

      queryClient.setQueryData(
        mobileQueryKeys.profile.followStatus(userId),
        nextRelationship
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.community.home() }),
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.profile.public(targetUsername) }),
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.profile.followStatus(userId) }),
      ]);
    },
  });

  async function handleToggleFollow() {
    if (!profile) {
      return;
    }

    try {
      await followMutation.mutateAsync({
        userId: profile.id,
        username: profile.username,
        isFollowing: relationship?.isFollowing ?? false,
      });
    } catch (error) {
      Alert.alert(
        relationship?.isFollowing ? 'Unfollow failed' : 'Follow failed',
        error instanceof Error ? error.message : 'Unable to update follow status.'
      );
    }
  }

  return (
    <KureScreen
      title="Profile"
      subtitle="Public networking context and recent activity."
      action={<HeaderActionButton label="Back" onPress={() => router.back()} />}
    >
      <View style={styles.contentWrap}>
        {profileQuery.isLoading && !profile ? (
          <ScreenState
            mode="loading"
            title="Loading profile"
            description="Pulling profile details, recent events, and follow context."
          />
        ) : null}

        {profileQuery.isError ? (
          <ScreenState
            mode="error"
            title="Profile unavailable"
            description="This public profile could not be loaded right now."
          />
        ) : null}

        {profile ? (
          <>
            <CommunityProfileHeroBlock
              action={!profile.isViewerOwner ? (
                <CommunityFollowButton
                  appearance="default"
                  isFollowing={relationship?.isFollowing ?? false}
                  followsViewer={relationship?.isFollowedBy ?? false}
                  isPending={followMutation.isPending}
                  size="compact"
                  accessibilityLabel={`${relationship?.isFollowing ? 'Unfollow' : 'Follow'} ${profile.fullName || profile.username}`}
                  onPress={handleToggleFollow}
                  showPlusIcon
                />
              ) : null}
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
                ...relationshipState,
              }}
              username={profile.username}
            />

            <ProfileStatsStrip
              items={[
                {
                  label: 'Followers',
                  value: formatCommunityCompactCount(profile.followerCount),
                },
                {
                  label: 'Following',
                  value: formatCommunityCompactCount(profile.followingCount),
                },
                {
                  label: 'Shared',
                  value: formatCommunityCompactCount(profile.mutualConnectionsCount),
                },
              ]}
            />

            {profile.mutualConnections.length > 0 ? (
              <CommunitySection
                title="Mutual context"
                meta={`${formatCommunityTabCount(profile.mutualConnectionsCount)} shared`}
              >
                <View style={styles.sectionInner}>
                  {profile.mutualConnections.map((connection) => (
                    <View
                      key={connection.id}
                      style={[
                        styles.connectionRow,
                        {
                          borderColor: tokens.colors.divider,
                        },
                      ]}
                    >
                      <CommunityAvatar
                        name={connection.fullName}
                        avatarUrl={connection.avatarUrl}
                        size={38}
                      />
                      <View style={styles.connectionCopy}>
                        <Text
                          style={{
                            color: tokens.colors.textPrimary,
                            fontFamily: tokens.typography.sans,
                            fontSize: 14,
                            fontWeight: '700',
                          }}
                        >
                          {connection.fullName || `@${connection.username}`}
                        </Text>
                        {connection.headline ? (
                          <Text
                            numberOfLines={1}
                            style={{
                              color: tokens.colors.textSecondary,
                              fontFamily: tokens.typography.sans,
                              fontSize: 12,
                              fontWeight: '600',
                            }}
                          >
                            {connection.headline}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              </CommunitySection>
            ) : null}

            <CommunitySection
              title="Recent events"
              meta={`${formatCommunityTabCount(profile.recentAttendingEvents.length)} events`}
            >
              <View style={styles.sectionInner}>
                {profile.recentAttendingEvents.length > 0 ? (
                  <View
                    style={[
                      styles.eventList,
                      {
                        backgroundColor: tokens.colors.surfaceStrong,
                        borderColor: tokens.colors.border,
                        borderRadius: tokens.radius.md,
                      },
                    ]}
                  >
                    {profile.recentAttendingEvents.map((event, index) => (
                      <CommunityUpcomingEventRow
                        key={event.id}
                        title={event.title}
                        startTime={event.startTime}
                        meta={event.location || 'Attended event'}
                        onPress={() => router.push(`/event/${event.id}`)}
                        showDivider={index < profile.recentAttendingEvents.length - 1}
                      />
                    ))}
                  </View>
                ) : (
                  <ScreenState
                    mode="empty"
                    title="No public events yet"
                    description="Recent attending events will appear here when attendance is visible."
                    variant="plain"
                  />
                )}
              </View>
            </CommunitySection>
          </>
        ) : null}
      </View>
    </KureScreen>
  );
}

function ProfileStatsStrip({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.statsStrip,
        {
          backgroundColor: tokens.colors.surfaceStrong,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      {items.map((item, index) => (
        <View
          key={item.label}
          style={[
            styles.metricCell,
            index < items.length - 1 && {
              borderRightColor: tokens.colors.divider,
              borderRightWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <Text
            style={{
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.1,
              textTransform: 'uppercase',
            }}
          >
            {item.label}
          </Text>
          <Text
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 18,
              lineHeight: 22,
              fontWeight: '800',
            }}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    gap: 14,
  },
  statsStrip: {
    flexDirection: 'row',
    borderWidth: 1,
    overflow: 'hidden',
  },
  metricCell: {
    flex: 1,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
    justifyContent: 'space-between',
  },
  sectionInner: {
    padding: 16,
    gap: 10,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  connectionCopy: {
    flex: 1,
    gap: 2,
  },
  eventList: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
