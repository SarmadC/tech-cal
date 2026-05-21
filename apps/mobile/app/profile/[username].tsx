import type { MobilePublicProfile } from '@kurecal/domain';
import type { ReactNode } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HeaderActionButton, MobilePage } from '../../src/components/chrome/MobilePage';
import { ScreenState } from '../../src/components/chrome/ScreenState';
import { CommunityAvatar } from '../../src/components/community/CommunityAvatar';
import { CommunityProfileHeroBlock } from '../../src/components/community/CommunityProfileHeroBlock';
import {
  formatCommunityTabCount,
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
  loadMobilePublicProfile,
  updateMobileNetworkingContact,
} from '../../src/lib/mobileApi';

const NETWORKING_GOAL_LABELS: Record<string, string> = {
  'find-mentors': 'Find mentors',
  'find-mentees': 'Mentor others',
  'find-peers': 'Connect with peers',
  'find-collaborators': 'Find collaborators',
  'find-customers': 'Business development',
  'find-employers': 'Job opportunities',
  'find-employees': 'Hiring',
  'industry-insights': 'Industry insights',
  'thought-leadership': 'Establish expertise',
};

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatNetworkingGoal(goal: string): string {
  return NETWORKING_GOAL_LABELS[goal] ?? titleCase(goal);
}

function uniqueProfileItems(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    const key = trimmed.toLocaleLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  });
  return result;
}

function getProfileHeroBadges(
  profile: MobilePublicProfile,
  relationshipLabels: string[]
): string[] {
  const badges: string[] = [];

  if (relationshipLabels[0]) {
    badges.push(relationshipLabels[0]);
  } else if (profile.mutualConnectionsCount > 0) {
    badges.push(formatMutualConnectionsLabel(profile.mutualConnectionsCount));
  } else {
    badges.push('Public profile');
  }

  return badges.slice(0, 2);
}

function getProfileHeroSummary(profile: MobilePublicProfile): string | null {
  if (profile.mutualConnectionsCount > 0) {
    return formatMutualConnectionsLabel(profile.mutualConnectionsCount);
  }
  return null;
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

function getConversationStarters(profile: MobilePublicProfile): string[] {
  const career = profile.careerProfile;
  return uniqueProfileItems([
    ...(career?.primarySkills ?? []),
    ...(career?.interests ?? []),
    ...(career?.skillsToLearn ?? []).map((skill) => `Learning ${skill}`),
  ]).slice(0, 6);
}

function getLookingForItems(profile: MobilePublicProfile): string[] {
  const career = profile.careerProfile;
  return uniqueProfileItems([
    ...(career?.networkingGoals ?? []).map(formatNetworkingGoal),
    ...(career?.preferredEventTypes ?? []).map(
      (eventType) => `${titleCase(eventType)} events`
    ),
  ]).slice(0, 4);
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string | string[] }>();
  const resolvedUsername = Array.isArray(username) ? username[0] : username;
  return <PublicProfileView username={resolvedUsername} />;
}

export function PublicProfileView({ username }: { username: string | undefined }) {
  const { tokens } = useAppTheme();
  const resolvedUsername = username;
  const requestSequenceRef = useRef(0);

  const [profile, setProfile] = useState<MobilePublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const conversationStarters = useMemo(
    () => (profile ? getConversationStarters(profile) : []),
    [profile]
  );
  const lookingForItems = useMemo(
    () => (profile ? getLookingForItems(profile) : []),
    [profile]
  );

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
    <MobilePage headerHidden title="Profile">
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
            hideCover
            action={
              profile.isViewerOwner ? (
                <HeaderActionButton
                  label="Edit"
                  onPress={() => router.push('/settings/profile')}
                />
              ) : (
                <HeaderActionButton label="Back" onPress={() => router.back()} />
              )
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
            <SectionCard>
              <ProfileNetworkingCTA
                status={profile.networkingState?.status ?? 'none'}
                pendingAction={networkingActionPending}
                onMarkRequest={() => { void handleNetworkingAction('mark_request_sent'); }}
                onConfirm={() => { void handleNetworkingAction('confirm_connection'); }}
              />
            </SectionCard>
          ) : null}

          {profile.isViewerOwner && getStrengthItems(profile).some((i) => i.state === 'open') ? (
            <SectionCard>
              <ProfileStrengthMeter
                items={getStrengthItems(profile)}
                onEdit={() => router.push('/settings/profile')}
              />
            </SectionCard>
          ) : null}

          <ProfileSection title="Talk about">
            <ChipCloud
              emptyText={
                profile.isViewerOwner
                  ? 'Add skills and interests so visitors know what to ask about.'
                  : 'No conversation starters are public yet.'
              }
              items={conversationStarters}
            />
          </ProfileSection>

          <ProfileSection title="Looking for">
            <ChipCloud
              emptyText={
                profile.isViewerOwner
                  ? 'Add networking goals from Edit profile to make your intent clear.'
                  : 'Networking intent is not public yet.'
              }
              items={lookingForItems}
            />
          </ProfileSection>

          {profile.mutualConnections.length > 0 ? (
            <ProfileSection
              title="Mutual context"
              detail={`${formatCommunityTabCount(profile.mutualConnectionsCount)} shared`}
            >
              <View style={styles.connectionList}>
                {profile.mutualConnections.map((connection) => (
                  <View
                    key={connection.id}
                    style={[styles.connectionRow, { borderColor: tokens.colors.divider }]}
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
            </ProfileSection>
          ) : null}

          <SectionCard padded>
            <ProfileActivityTimeline
              events={profile.recentAttendingEvents}
              onEventPress={(eventId) => router.push(`/event/${eventId}`)}
            />
          </SectionCard>
        </ScrollView>
      ) : null}
    </MobilePage>
  );
}

function SectionCard({
  children,
  padded,
}: {
  children: ReactNode;
  padded?: boolean;
}) {
  const { tokens } = useAppTheme();
  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
          paddingVertical: padded ? 12 : 0,
        },
      ]}
    >
      {children}
    </View>
  );
}

function ProfileSection({
  children,
  title,
  detail,
}: {
  children: ReactNode;
  title: string;
  detail?: string;
}) {
  const { tokens } = useAppTheme();
  return (
    <SectionCard padded>
      <View style={styles.sectionHeader}>
        <Text
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 17,
            fontWeight: '800',
            lineHeight: 22,
          }}
        >
          {title}
        </Text>
        {detail ? (
          <Text
            style={{
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.mono,
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
            }}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      {children}
    </SectionCard>
  );
}

function ChipCloud({ emptyText, items }: { emptyText: string; items: string[] }) {
  const { tokens } = useAppTheme();

  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text
          style={{
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
            fontSize: 13,
            fontWeight: '500',
            lineHeight: 18,
          }}
        >
          {emptyText}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.chipCloud}>
      {items.map((item) => (
        <View
          key={item}
          style={[
            styles.profileChip,
            {
              backgroundColor: tokens.colors.surfaceStrong,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.xs,
            },
          ]}
        >
          <Text
            style={{
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
              fontSize: 12,
              fontWeight: '700',
              lineHeight: 16,
            }}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chipCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
  },
  connectionCopy: {
    flex: 1,
    gap: 2,
  },
  connectionList: {
    paddingHorizontal: 12,
  },
  connectionRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 9,
  },
  content: {
    gap: 12,
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyState: {
    paddingHorizontal: 12,
  },
  profileChip: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  sectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
});
