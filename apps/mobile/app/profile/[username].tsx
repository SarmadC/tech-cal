import type { MobilePublicProfile } from '@kurecal/domain';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenStateView } from '../../src/components/ScreenStateView';
import {
  applyFollowStateToStatus,
  buildAvatarInitials,
  formatCommunityCompactCount,
  formatCommunityEventTime,
  formatMutualConnectionsLabel,
  getPublicProfileCareerSummary,
} from '../../src/components/community/presentation';
import {
  followMobileUser,
  loadMobilePublicProfile,
  unfollowMobileUser,
  updateMobileNetworkingContact,
} from '../../src/lib/mobileApi';

const colors = {
  accent: '#BDC2FF',
  background: '#0D0E0F',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(189, 194, 255, 0.36)',
  danger: '#FFB4AB',
  surface: '#121314',
  surfaceHigh: '#1B1C1D',
  text: '#E3E2E3',
  textMuted: '#C6C5D5',
  textSubtle: '#908F9E',
};

function getInitials(name: string | null, username: string | null): string {
  if (name) {
    return buildAvatarInitials(name);
  }
  return (username?.[0] ?? '?').toUpperCase();
}

export default function PublicProfileScreen() {
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

  const headline = useMemo(
    () => getPublicProfileCareerSummary(profile?.careerProfile ?? null, profile?.headline),
    [profile]
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
          followerCount: Math.max(0, current.followerCount + (!isFollowing ? 1 : -1)),
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

  async function handleNetworkingAction(
    action: 'mark_request_sent' | 'confirm_connection'
  ) {
    if (!profile || profile.isViewerOwner || networkingActionPending) {
      return;
    }

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
        action === 'mark_request_sent'
          ? 'Unable to log request'
          : 'Unable to confirm connection',
        nextError instanceof Error ? nextError.message : 'Please try again.'
      );
    } finally {
      setNetworkingActionPending(null);
    }
  }

  const isConnected = profile?.networkingState?.status === 'connected';
  const isRequested = profile?.networkingState?.status === 'requested';
  const isFollowing = profile?.relationship?.isFollowing ?? false;
  const followsViewer = profile?.relationship?.isFollowedBy ?? false;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }: { pressed: boolean }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backLabel}>← Back</Text>
        </Pressable>
      </View>

      {loading && !profile ? (
        <View style={styles.stateWrap}>
          <ScreenStateView
            mode="loading"
            title="Loading profile"
            description="Pulling profile details, recent events, and follow context."
          />
        </View>
      ) : null}

      {error && !profile ? (
        <View style={styles.stateWrap}>
          <ScreenStateView
            mode="error"
            title="Profile unavailable"
            description={error}
            onRetry={() => { void loadProfile(); }}
          />
        </View>
      ) : null}

      {profile ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>
                  {getInitials(profile.fullName, profile.username)}
                </Text>
              </View>

              <View style={styles.heroMeta}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {profile.fullName || `@${profile.username}`}
                </Text>
                {profile.username ? (
                  <Text style={styles.heroUsername}>@{profile.username}</Text>
                ) : null}
              </View>

              {!profile.isViewerOwner ? (
                <Pressable
                  onPress={() => { void handleToggleFollow(); }}
                  disabled={followPending}
                  style={({ pressed }: { pressed: boolean }) => [
                    styles.followButton,
                    isFollowing && styles.followButtonActive,
                    (pressed || followPending) && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.followButtonLabel,
                      isFollowing && styles.followButtonLabelActive,
                    ]}
                  >
                    {followPending
                      ? '...'
                      : isFollowing
                        ? 'Following'
                        : followsViewer
                          ? 'Follow back'
                          : 'Follow'}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {headline ? (
              <Text style={styles.heroHeadline}>{headline}</Text>
            ) : null}

            {profile.mutualConnectionsCount > 0 ? (
              <Text style={styles.heroContext}>
                {formatMutualConnectionsLabel(profile.mutualConnectionsCount)}
              </Text>
            ) : null}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>
                {formatCommunityCompactCount(profile.followerCount)}
              </Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>
                {formatCommunityCompactCount(profile.followingCount)}
              </Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>
                {formatCommunityCompactCount(profile.mutualConnectionsCount)}
              </Text>
              <Text style={styles.statLabel}>Shared</Text>
            </View>
          </View>

          {/* Networking card */}
          {!profile.isViewerOwner ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEyebrow}>Networking</Text>
                <Text style={styles.sectionTitle}>Track your outreach</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardDescription}>
                  {isConnected
                    ? 'Confirmed as a real connection.'
                    : isRequested
                      ? 'Request logged. Confirm it once the connection is real.'
                      : 'Use this profile to track outreach and confirmed connections.'}
                </Text>

                <View style={styles.actionStack}>
                  {!isConnected ? (
                    <Pressable
                      onPress={() => { void handleNetworkingAction('mark_request_sent'); }}
                      disabled={Boolean(networkingActionPending)}
                      style={({ pressed }: { pressed: boolean }) => [
                        styles.actionButton,
                        isRequested ? styles.actionButtonSecondary : styles.actionButtonPrimary,
                        (pressed || Boolean(networkingActionPending)) && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionButtonLabel,
                          isRequested
                            ? styles.actionButtonLabelSecondary
                            : styles.actionButtonLabelPrimary,
                        ]}
                      >
                        {networkingActionPending === 'request' ? 'Saving...' : 'Mark request sent'}
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    onPress={() => { void handleNetworkingAction('confirm_connection'); }}
                    disabled={Boolean(networkingActionPending) || isConnected}
                    style={({ pressed }: { pressed: boolean }) => [
                      styles.actionButton,
                      isConnected ? styles.actionButtonSecondary : styles.actionButtonPrimary,
                      (pressed || Boolean(networkingActionPending) || isConnected) &&
                        styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionButtonLabel,
                        isConnected
                          ? styles.actionButtonLabelSecondary
                          : styles.actionButtonLabelPrimary,
                      ]}
                    >
                      {networkingActionPending === 'confirm'
                        ? 'Saving...'
                        : isConnected
                          ? 'Connection confirmed'
                          : 'Confirm connection'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          {/* Mutual connections */}
          {profile.mutualConnections.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEyebrow}>Mutual context</Text>
                <Text style={styles.sectionTitle}>
                  {formatCommunityCompactCount(profile.mutualConnectionsCount)} shared
                </Text>
              </View>

              <View style={styles.stack}>
                {profile.mutualConnections.map((connection) => (
                  <View key={connection.id} style={styles.connectionCard}>
                    <View style={styles.connectionAvatar}>
                      <Text style={styles.connectionAvatarText}>
                        {getInitials(connection.fullName, connection.username)}
                      </Text>
                    </View>
                    <View style={styles.connectionMeta}>
                      <Text style={styles.connectionName} numberOfLines={1}>
                        {connection.fullName || `@${connection.username}`}
                      </Text>
                      {connection.headline ? (
                        <Text style={styles.connectionHeadline} numberOfLines={1}>
                          {connection.headline}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Recent events */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Recent events</Text>
              <Text style={styles.sectionTitle}>
                {profile.recentAttendingEvents.length > 0
                  ? `${formatCommunityCompactCount(profile.recentAttendingEvents.length)} visible`
                  : 'Activity'}
              </Text>
            </View>

            {profile.recentAttendingEvents.length > 0 ? (
              <View style={styles.stack}>
                {profile.recentAttendingEvents.map((event) => (
                  <Pressable
                    key={event.id}
                    onPress={() => router.push(`/event/${event.id}`)}
                    style={({ pressed }: { pressed: boolean }) => [styles.eventCard, pressed && styles.cardPressed]}
                  >
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventMeta}>
                      {formatCommunityEventTime(event.startTime)}
                      {event.location ? ` · ${event.location}` : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <ScreenStateView
                mode="empty"
                title="No public events yet"
                description="Recent attending events will appear here when attendance is visible."
              />
            )}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  actionButtonLabelPrimary: {
    color: colors.background,
  },
  actionButtonLabelSecondary: {
    color: colors.textMuted,
  },
  actionButtonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  actionStack: {
    gap: 8,
    marginTop: 10,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarInitials: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backLabel: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  cardPressed: {
    opacity: 0.84,
  },
  connectionAvatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  connectionAvatarText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  connectionCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  connectionHeadline: {
    color: colors.textSubtle,
    fontSize: 12,
    lineHeight: 16,
  },
  connectionMeta: {
    flex: 1,
    gap: 2,
  },
  connectionName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  content: {
    gap: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  eventMeta: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  eventTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  followButton: {
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  followButtonActive: {
    backgroundColor: 'rgba(189, 194, 255, 0.10)',
    borderColor: colors.borderStrong,
  },
  followButtonLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
  followButtonLabelActive: {
    color: colors.accent,
  },
  header: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  hero: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 8,
    paddingBottom: 14,
  },
  heroContext: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  heroHeadline: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  heroMeta: {
    flex: 1,
    gap: 2,
  },
  heroName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 21,
  },
  heroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  heroUsername: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.7,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  section: {
    gap: 8,
  },
  sectionEyebrow: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.66,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  stack: {
    gap: 8,
  },
  statCell: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    paddingVertical: 10,
  },
  statDivider: {
    backgroundColor: colors.border,
    height: '60%',
    width: 1,
  },
  statLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  statsRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
});
