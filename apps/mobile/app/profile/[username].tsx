import type { MobilePublicProfile } from '@kurecal/domain';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { HeaderActionButton, MobilePage } from '../../src/components/chrome/MobilePage';
import { ScreenState } from '../../src/components/chrome/ScreenState';
import { CommunityAvatar } from '../../src/components/community/CommunityAvatar';
import { CommunityFollowButton } from '../../src/components/community/CommunityFollowButton';
import { CommunityProfileHeroBlock } from '../../src/components/community/CommunityProfileHeroBlock';
import { CommunitySection } from '../../src/components/community/CommunitySection';
import { CommunityUpcomingEventRow } from '../../src/components/community/CommunityUpcomingEventRow';
import {
  applyFollowStateToStatus,
  formatCommunityCompactCount,
  formatCommunityTabCount,
  formatMutualConnectionsLabel,
  getNetworkingRelationshipLabels,
  getPublicProfileCareerSummary,
} from '../../src/components/community/presentation';
import { useAppTheme } from '../../src/providers/ThemeProvider';
import { followMobileUser, loadMobilePublicProfile, unfollowMobileUser } from '../../src/lib/mobileApi';

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

  if (profile.followerCount > 0) {
    return `${formatCommunityCompactCount(profile.followerCount)} follower${profile.followerCount === 1 ? '' : 's'} on this public profile.`;
  }

  return 'Public networking profile';
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

  const loadProfile = useCallback(async () => {
    const trimmed = resolvedUsername?.trim();
    if (!trimmed) {
      setError('Username is required.');
      setLoading(false);
      setProfile(null);
      return;
    }

    const requestId = ++requestSequenceRef.current;
    setLoading(true);

    try {
      const nextProfile = await loadMobilePublicProfile(trimmed);
      if (requestId !== requestSequenceRef.current) {
        return;
      }

      setProfile(nextProfile);
      setError(null);
    } catch (nextError) {
      if (requestId !== requestSequenceRef.current) {
        return;
      }

      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load this public profile.'
      );
    } finally {
      if (requestId === requestSequenceRef.current) {
        setLoading(false);
      }
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
    if (!profile || profile.isViewerOwner) {
      return;
    }

    const isFollowing = profile.relationship?.isFollowing ?? false;
    setFollowPending(true);

    try {
      if (isFollowing) {
        await unfollowMobileUser(profile.id);
      } else {
        await followMobileUser(profile.id);
      }

      setProfile((current) => {
        if (!current) {
          return current;
        }

        const nextRelationship = applyFollowStateToStatus(
          current.relationship,
          !isFollowing
        );

        return {
          ...current,
          followerCount: Math.max(
            0,
            current.followerCount + (!isFollowing ? 1 : -1)
          ),
          relationship: nextRelationship,
        };
      });
    } catch (nextError) {
      Alert.alert(
        isFollowing ? 'Unfollow failed' : 'Follow failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to update follow status.'
      );
    } finally {
      setFollowPending(false);
    }
  }

  return (
    <MobilePage
      action={<HeaderActionButton label="Back" onPress={() => router.back()} />}
      subtitle="Public networking context and recent activity."
      title="Profile"
    >
      <View style={styles.contentWrap}>
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
              <HeaderActionButton
                label="Retry"
                onPress={() => {
                  void loadProfile();
                }}
              />
            }
          />
        ) : null}

        {profile ? (
          <>
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
                        avatarUrl={connection.avatarUrl}
                        name={connection.fullName}
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
                        meta={event.location || 'Attended event'}
                        startTime={event.startTime}
                        title={event.title}
                        showDivider={index < profile.recentAttendingEvents.length - 1}
                        onPress={() => router.push(`/event/${event.id}`)}
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
    </MobilePage>
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
  connectionCopy: {
    flex: 1,
    gap: 2,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contentWrap: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    gap: 14,
  },
  eventList: {
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
  statsStrip: {
    flexDirection: 'row',
    borderWidth: 1,
    overflow: 'hidden',
  },
});
