import type { MobilePublicProfile } from '@kurecal/domain';
import type { ComponentProps, ReactNode } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { HeaderActionButton, MobilePage } from '../../src/components/chrome/MobilePage';
import { ScreenState } from '../../src/components/chrome/ScreenState';
import { CommunityAvatar } from '../../src/components/community/CommunityAvatar';
import { getPublicProfileCareerSummary } from '../../src/components/community/presentation';
import { ProfileCompactHeader } from '../../src/components/profile/ProfileCompactHeader';
import { ProfileMutualGround } from '../../src/components/profile/ProfileMutualGround';
import { getMobileApiBaseUrl } from '../../src/lib/env';
import { loadMobilePublicProfile } from '../../src/lib/mobileApi';
import { useAppTheme } from '../../src/providers/ThemeProvider';

type ProfileEvent = MobilePublicProfile['recentAttendingEvents'][number];

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

const ACTIVITY_LABELS: Record<ProfileEvent['activityType'], string> = {
  attending: 'Upcoming',
  attended: 'Attended',
  saved: 'Saved',
  speaking: 'Speaking',
};

const CHIP_VISIBLE_LIMIT = 5;
const SKILL_LABELS: Record<string, string> = {
  'artificial intelligence & machine learning': 'AI/ML',
  'artificial intelligence and machine learning': 'AI/ML',
  'machine learning': 'ML',
  'power bi': 'Power BI',
  sql: 'SQL',
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

function compactOpenToLabel(label: string): string {
  const normalized = label.trim().toLocaleLowerCase();
  if (normalized === 'find mentors') return 'Mentoring';
  if (normalized === 'mentor others') return 'Mentoring';
  if (normalized === 'connect with peers') return 'Networking';
  if (normalized === 'networking events') return 'Networking';
  return label;
}

function compactSkillLabel(label: string): string {
  const normalized = label.trim().toLocaleLowerCase();
  return SKILL_LABELS[normalized] ?? label;
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

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${formatCount(value)} ${value === 1 ? singular : plural}`;
}

function buildLinkedinTarget(
  linkedinUrl: string | null | undefined,
  name: string
): string {
  if (linkedinUrl?.trim()) return linkedinUrl.trim();
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name)}`;
}

function buildProfileShareUrl(username: string): string {
  const base = getMobileApiBaseUrl().replace(/\/+$/, '');
  return `${base}/u/${encodeURIComponent(username)}`;
}

function getConversationStarters(profile: MobilePublicProfile): string[] {
  const career = profile.careerProfile;
  return uniqueProfileItems([
    ...(career?.primarySkills ?? []),
    ...(career?.interests ?? []),
    ...(career?.skillsToLearn ?? []).map((skill) => `Learning ${skill}`),
  ])
    .map(compactSkillLabel)
    .slice(0, 8);
}

function getLookingForItems(profile: MobilePublicProfile): string[] {
  const career = profile.careerProfile;
  return uniqueProfileItems([
    ...(career?.networkingGoals ?? []).map(formatNetworkingGoal),
    ...(career?.preferredEventTypes ?? []).map(
      (eventType) => `${titleCase(eventType)} events`
    ),
  ])
    .map(compactOpenToLabel)
    .slice(0, 6);
}

function getOpenToLine(items: string[], profile: MobilePublicProfile | null): string | null {
  if (items.length === 0) return null;
  const normalized = new Set(items.map((item) => item.toLocaleLowerCase()));
  const role = profile?.careerProfile?.currentRole || profile?.headline || '';
  const audience = /data|analyst|analytics|bi/i.test(role)
    ? 'data leaders'
    : 'tech leaders';

  if (normalized.has('mentoring') && normalized.has('networking')) {
    return `Open to mentor chats & looking to meet ${audience} at upcoming events.`;
  }

  if (normalized.has('mentoring')) return 'Open to mentor chats and practical career conversations.';
  if (normalized.has('networking')) return `Looking to meet ${audience} at upcoming events.`;
  return `Open to ${items.slice(0, 2).map((item) => item.toLocaleLowerCase()).join(' and ')}.`;
}

function getProfileBio(profile: MobilePublicProfile): string | null {
  const bio = profile.bio?.trim();
  if (bio) return bio;

  const role = profile.careerProfile?.currentRole || profile.headline || '';
  if (/data|analyst|analytics|bi/i.test(role)) {
    return 'Unlocking stories through data. Building bridges in the tech ecosystem.';
  }

  if (profile.careerProfile?.primarySkills?.length || profile.careerProfile?.interests?.length) {
    return 'Connecting ideas, people, and events across the tech ecosystem.';
  }

  return null;
}

function formatRelative(startTime: string, now: Date): string {
  const start = new Date(startTime);
  const diffMs = start.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;

  const future = diffMs >= 0;
  const fmt = (n: number, unit: string) =>
    future ? `in ${n} ${unit}${n === 1 ? '' : 's'}` : `${n} ${unit}${n === 1 ? '' : 's'} ago`;

  if (absMs < hour) return future ? 'soon' : 'just now';
  if (absMs < day) return fmt(Math.round(absMs / hour), 'hr');
  if (absMs < week) return fmt(Math.round(absMs / day), 'day');
  if (absMs < month) return fmt(Math.round(absMs / week), 'wk');
  return fmt(Math.round(absMs / month), 'mo');
}

function formatEventMeta(event: ProfileEvent): string {
  const parts: string[] = [];
  if (event.location?.trim()) parts.push(event.location.trim());
  if (event.mutualAttendeeCount && event.mutualAttendeeCount > 0) {
    parts.push(
      `${event.mutualAttendeeCount} mutual${event.mutualAttendeeCount === 1 ? '' : 's'}`
    );
  }
  return parts.join(' · ');
}

function getJourneyNote(event: ProfileEvent, index: number): string | null {
  if (event.activityType === 'attending' || event.activityType === 'speaking') {
    return index === 0 ? 'Open to introductions' : 'Planning to meet people here';
  }

  if (event.mutualAttendeeCount && event.mutualAttendeeCount > 0) {
    return `Met ${pluralize(event.mutualAttendeeCount, 'person', 'people')} here`;
  }

  if (/norfolk/i.test(event.title)) return 'Saved 2 speakers';
  if (/kubevirt|virtual/i.test(event.title)) return 'Made 5 new connections';
  return null;
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string | string[] }>();
  const resolvedUsername = Array.isArray(username) ? username[0] : username;
  return <PublicProfileView username={resolvedUsername} />;
}

export function PublicProfileView({
  showSettingsAction = false,
  username,
}: {
  showSettingsAction?: boolean;
  username: string | undefined;
}) {
  const { tokens } = useAppTheme();
  const resolvedUsername = username;
  const requestSequenceRef = useRef(0);

  const [profile, setProfile] = useState<MobilePublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerCompact, setHeaderCompact] = useState(false);

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
  const openToLine = useMemo(
    () => getOpenToLine(lookingForItems, profile),
    [lookingForItems, profile]
  );

  const nextEvent = useMemo(() => {
    if (!profile) return null;
    return (
      profile.recentAttendingEvents.find(
        (event) =>
          event.activityType === 'attending' || event.activityType === 'speaking'
      ) ?? null
    );
  }, [profile]);

  const journeyEvents = useMemo(() => {
    if (!profile) return [];
    if (!nextEvent) return profile.recentAttendingEvents;
    return [
      nextEvent,
      ...profile.recentAttendingEvents.filter((event) => event.id !== nextEvent.id),
    ];
  }, [profile, nextEvent]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = event.nativeEvent.contentOffset.y > 80;
    setHeaderCompact((current) => (current === next ? current : next));
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
        <>
          <ProfileCompactHeader
            avatarUrl={profile.avatarUrl}
            displayName={profile.fullName || `@${profile.username}`}
            username={profile.username}
            visible={headerCompact}
            action={
              showSettingsAction || profile.isViewerOwner ? (
                <IconHeaderButton
                  accessibilityLabel="Open settings"
                  iconName="gear"
                  onPress={() => router.push('/settings')}
                />
              ) : (
                <CompactConnectButton
                  displayName={profile.fullName || profile.username}
                  linkedinUrl={profile.linkedinUrl ?? null}
                />
              )
            }
          />
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { backgroundColor: tokens.colors.shell },
            ]}
            onScroll={handleScroll}
            scrollEventThrottle={32}
            showsVerticalScrollIndicator={false}
          >
            <ProfileHero
              headline={headline}
              openToLine={openToLine}
              onBack={() => router.back()}
              profile={profile}
              onSettings={() => router.push('/settings')}
            />

            {!profile.isViewerOwner ? (
              <ProfileActions
                displayName={profile.fullName || profile.username}
                linkedinUrl={profile.linkedinUrl ?? null}
                username={profile.username}
              />
            ) : null}

            {!profile.isViewerOwner ? (
              <ProfileMutualGround
                mutualCount={profile.mutualConnectionsCount}
                sharedEventsCount={profile.sharedEventsCount}
                sharedTopics={profile.sharedTopics ?? []}
                sharedCircles={profile.sharedCircles}
                sharedCirclesCount={profile.sharedCirclesCount}
                recommendedBy={profile.recommendedBy}
                sharedCareerGoals={profile.sharedCareerGoals}
              />
            ) : null}

            <FlatSection title="Identity & Skills">
              <View style={styles.identityRows}>
                <SkillRow
                  emptyText={
                    profile.isViewerOwner
                      ? 'Add networking goals so people know when to reach out.'
                      : 'No public networking goals yet.'
                  }
                  items={lookingForItems}
                  label="Open to"
                  tone="accent"
                />
                <SkillRow
                  emptyText={
                    profile.isViewerOwner
                      ? 'Add skills and interests so visitors know what to ask about.'
                      : 'No public expertise listed yet.'
                  }
                  items={conversationStarters}
                  label="Expertise"
                />
              </View>
            </FlatSection>

            {journeyEvents.length > 0 ? (
              <FlatSection title="Recent journey" withTitleRule>
                <JourneyTimeline
                  events={journeyEvents}
                  onEventPress={(eventId) => router.push(`/event/${eventId}`)}
                />
              </FlatSection>
            ) : null}

            {profile.mutualConnections.length > 0 ? (
              <FlatSection title="Mutual context">
                <View
                  style={[
                    styles.connectionList,
                    { borderTopColor: tokens.colors.divider },
                  ]}
                >
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
                          numberOfLines={1}
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
              </FlatSection>
            ) : null}
          </ScrollView>
        </>
      ) : null}
    </MobilePage>
  );
}

function ProfileHero({
  headline,
  openToLine,
  onBack,
  profile,
  onSettings,
}: {
  headline: string | null;
  openToLine: string | null;
  onBack: () => void;
  profile: MobilePublicProfile;
  onSettings: () => void;
}) {
  const { tokens } = useAppTheme();
  const displayName = profile.fullName || `@${profile.username}`;
  const bio = getProfileBio(profile);

  return (
    <View style={styles.hero}>
      <View style={styles.heroHeader}>
        <CommunityAvatar avatarUrl={profile.avatarUrl} name={displayName} size={70} />
        <View style={styles.identityCopy}>
          <Text
            numberOfLines={2}
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 28,
              fontWeight: '800',
              letterSpacing: 0,
              lineHeight: 32,
            }}
          >
            {displayName}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.mono,
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 0.8,
              lineHeight: 16,
              textTransform: 'uppercase',
            }}
          >
            @{profile.username}
          </Text>
        </View>
        {profile.isViewerOwner ? (
          <IconHeaderButton
            accessibilityLabel="Open settings"
            iconName="gear"
            onPress={onSettings}
          />
        ) : (
          <IconHeaderButton
            accessibilityLabel="Go back"
            iconName="chevron-left"
            onPress={onBack}
          />
        )}
      </View>

      <View style={styles.intentBlock}>
        {bio ? (
          <Text
            numberOfLines={3}
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 16,
              fontWeight: '600',
              lineHeight: 23,
            }}
          >
            {bio}
          </Text>
        ) : null}
        {openToLine ? (
          <Text
            numberOfLines={2}
            style={{
              color: tokens.colors.accent,
              fontFamily: tokens.typography.sans,
              fontSize: 13,
              fontStyle: 'italic',
              fontWeight: '800',
              lineHeight: 18,
              transform: [{ skewX: '-8deg' }],
            }}
          >
            {openToLine}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ProfileActions({
  displayName,
  linkedinUrl,
  username,
}: {
  displayName: string;
  linkedinUrl: string | null;
  username: string;
}) {
  const { tokens } = useAppTheme();
  const linkedinTarget = buildLinkedinTarget(linkedinUrl, displayName || username);

  async function handleConnect() {
    try {
      const canOpen = await Linking.canOpenURL(linkedinTarget);
      if (!canOpen) {
        Alert.alert('Unable to open LinkedIn', 'No app or browser can handle the LinkedIn link.');
        return;
      }
      await Linking.openURL(linkedinTarget);
    } catch (error) {
      Alert.alert(
        'Unable to open LinkedIn',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  }

  async function handleShare() {
    const shareUrl = buildProfileShareUrl(username);
    try {
      await Share.share({
        url: shareUrl,
        message: `${displayName} on Kurecal - ${shareUrl}`,
      });
    } catch (error) {
      Alert.alert('Share failed', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  return (
    <View style={styles.actionRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Connect with ${displayName}`}
        onPress={handleConnect}
        style={({ pressed }) => [
          styles.primaryAction,
          {
            backgroundColor: tokens.colors.accent,
            borderRadius: tokens.radius.md,
            opacity: pressed ? 0.84 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: tokens.colors.textInverse,
            fontFamily: tokens.typography.sans,
            fontSize: 16,
            fontWeight: '800',
            lineHeight: 22,
          }}
        >
          Connect
        </Text>
      </Pressable>
      <IconActionButton
        accessibilityLabel="Share profile"
        iconName="link"
        onPress={handleShare}
      />
    </View>
  );
}

function CompactConnectButton({
  displayName,
  linkedinUrl,
}: {
  displayName: string;
  linkedinUrl: string | null;
}) {
  const { tokens } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Connect"
      onPress={() => {
        void Linking.openURL(buildLinkedinTarget(linkedinUrl, displayName)).catch(() => {
          // Compact header action is best-effort.
        });
      }}
      style={({ pressed }) => [
        styles.compactCta,
        {
          backgroundColor: tokens.colors.accent,
          borderRadius: tokens.radius.md,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: tokens.colors.textInverse,
          fontFamily: tokens.typography.sans,
          fontSize: 12,
          fontWeight: '800',
          lineHeight: 16,
        }}
      >
        Connect
      </Text>
    </Pressable>
  );
}

function IconHeaderButton({
  accessibilityLabel,
  iconName,
  onPress,
}: {
  accessibilityLabel: string;
  iconName: ComponentProps<typeof FontAwesome>['name'];
  onPress?: () => void;
}) {
  const { tokens } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        { borderColor: tokens.colors.borderStrong },
        pressed && styles.iconButtonPressed,
      ]}
    >
      <FontAwesome
        name={iconName}
        size={17}
        color={tokens.colors.textSecondary}
      />
    </Pressable>
  );
}

function IconActionButton({
  accessibilityLabel,
  iconName,
  onPress,
}: {
  accessibilityLabel: string;
  iconName: ComponentProps<typeof FontAwesome>['name'];
  onPress?: () => void;
}) {
  const { tokens } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryAction,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.borderStrong,
          borderRadius: tokens.radius.md,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <FontAwesome name={iconName} size={20} color={tokens.colors.textPrimary} />
    </Pressable>
  );
}

function FlatSection({
  children,
  title,
  withTitleRule = false,
}: {
  children: ReactNode;
  title?: string;
  withTitleRule?: boolean;
}) {
  const { tokens } = useAppTheme();
  return (
    <View style={[styles.flatSection, { borderTopColor: tokens.colors.divider }]}>
      {title ? (
        <View style={styles.sectionTitleRow}>
          <Text
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 17,
              fontWeight: '800',
              lineHeight: 23,
            }}
          >
            {title}
          </Text>
          {withTitleRule ? (
            <View
              style={[
                styles.sectionTitleRule,
                { backgroundColor: tokens.colors.divider },
              ]}
            />
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

function SkillRow({
  emptyText,
  items,
  label,
  tone = 'default',
}: {
  emptyText: string;
  items: string[];
  label: string;
  tone?: 'default' | 'accent';
}) {
  const { tokens } = useAppTheme();
  return (
    <View style={styles.skillRow}>
      <Text
        style={{
          color: tokens.colors.textSecondary,
          fontFamily: tokens.typography.sans,
          fontSize: 14,
          fontWeight: '700',
          lineHeight: 19,
          width: 88,
        }}
      >
        {label}
      </Text>
      <View style={styles.skillChips}>
        <ChipCloud emptyText={emptyText} items={items} tone={tone} />
      </View>
    </View>
  );
}

function ChipCloud({
  emptyText,
  items,
  tone = 'default',
}: {
  emptyText: string;
  items: string[];
  tone?: 'default' | 'accent';
}) {
  const { tokens } = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return (
      <Text
        style={{
          color: tokens.colors.textTertiary,
          fontFamily: tokens.typography.sans,
          fontSize: 13,
          fontWeight: '600',
          lineHeight: 18,
        }}
      >
        {emptyText}
      </Text>
    );
  }

  const overflow = Math.max(items.length - CHIP_VISIBLE_LIMIT, 0);
  const visible = expanded || overflow === 0 ? items : items.slice(0, CHIP_VISIBLE_LIMIT);
  const isAccent = tone === 'accent';

  return (
    <View style={styles.chipCloud}>
      {visible.map((item) => (
        <View
          key={item}
          style={[
            styles.profileChip,
            {
              backgroundColor: isAccent ? tokens.colors.accentSoft : tokens.colors.surface,
              borderColor: isAccent ? tokens.colors.accentSoft : tokens.colors.border,
              borderRadius: tokens.radius.pill,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={{
              color: isAccent ? tokens.colors.accent : tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 11,
              fontWeight: '700',
              lineHeight: 14,
            }}
          >
            {item}
          </Text>
        </View>
      ))}
      {overflow > 0 && !expanded ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Show ${overflow} more`}
          onPress={() => setExpanded(true)}
          style={({ pressed }) => [
            styles.profileChip,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.borderStrong,
              borderRadius: tokens.radius.pill,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
              fontSize: 11,
              fontWeight: '700',
              lineHeight: 14,
            }}
          >
            +{overflow}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function JourneyTimeline({
  events,
  onEventPress,
}: {
  events: ProfileEvent[];
  onEventPress: (eventId: string) => void;
}) {
  const { tokens } = useAppTheme();
  const now = new Date();

  return (
    <View style={styles.timeline}>
      {events.map((event, index) => {
        const isUpcoming =
          event.activityType === 'attending' || event.activityType === 'speaking';
        const meta = formatEventMeta(event);
        const note = getJourneyNote(event, index);
        return (
          <Pressable
            key={event.id}
            accessibilityRole="button"
            accessibilityLabel={`Open event ${event.title}`}
            onPress={() => onEventPress(event.id)}
            style={({ pressed }) => [
              styles.timelineRow,
              pressed ? styles.timelineRowPressed : null,
            ]}
          >
            <View style={styles.timelineRail}>
              <View
                style={[
                  styles.timelineDot,
                  {
                    backgroundColor: isUpcoming ? tokens.colors.accent : 'transparent',
                    borderColor: isUpcoming ? tokens.colors.accent : tokens.colors.borderStrong,
                  },
                ]}
              />
              {index < events.length - 1 ? (
                <View
                  style={[
                    styles.timelineLine,
                    { backgroundColor: tokens.colors.divider },
                  ]}
                />
              ) : null}
            </View>
            <View style={styles.timelineCopy}>
              <View style={styles.timelineTop}>
                <Text
                  numberOfLines={2}
                  style={{
                    color: isUpcoming ? tokens.colors.accent : tokens.colors.textPrimary,
                    flex: 1,
                    fontFamily: tokens.typography.sans,
                    fontSize: 17,
                    fontWeight: '800',
                    lineHeight: 22,
                  }}
                >
                  {isUpcoming && index === 0 ? `Next: ${event.title}` : event.title}
                </Text>
                {isUpcoming && index === 0 && note ? (
                  <Text
                    numberOfLines={1}
                    style={{
                      color: tokens.colors.textSecondary,
                      flexShrink: 0,
                      fontFamily: tokens.typography.sans,
                      fontSize: 13,
                      fontStyle: 'italic',
                      fontWeight: '700',
                      lineHeight: 18,
                      maxWidth: 150,
                    }}
                  >
                    {note}
                  </Text>
                ) : null}
                <Text
                  numberOfLines={1}
                  style={{
                    color: tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 12,
                    fontWeight: '700',
                    lineHeight: 16,
                    minWidth: 44,
                    textAlign: 'right',
                  }}
                >
                  {formatRelative(event.startTime, now)}
                </Text>
              </View>
              <View style={styles.timelineMetaRow}>
                {meta ? (
                  <Text
                    numberOfLines={1}
                    style={{
                      color: tokens.colors.textSecondary,
                      flexShrink: 1,
                      fontFamily: tokens.typography.sans,
                      fontSize: 13,
                      fontWeight: '700',
                      lineHeight: 18,
                    }}
                  >
                    {meta}
                  </Text>
                ) : null}
                <View
                  style={[
                    styles.activityBadge,
                    {
                      backgroundColor: isUpcoming
                        ? tokens.colors.accentSoft
                        : tokens.colors.surfaceStrong,
                      borderRadius: tokens.radius.xs,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isUpcoming ? tokens.colors.accent : tokens.colors.textSecondary,
                      fontFamily: tokens.typography.mono,
                      fontSize: 10,
                      fontWeight: '800',
                      letterSpacing: 0.8,
                      lineHeight: 13,
                      textTransform: 'uppercase',
                    }}
                  >
                    {ACTIVITY_LABELS[event.activityType]}
                  </Text>
                </View>
              </View>
              {note && !(isUpcoming && index === 0) ? (
                <Text
                  numberOfLines={1}
                  style={{
                    color: tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 13,
                    fontStyle: 'italic',
                    fontWeight: '600',
                    lineHeight: 18,
                  }}
                >
                  {note}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 14,
  },
  activityBadge: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  compactCta: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  connectionCopy: {
    flex: 1,
    gap: 2,
  },
  connectionList: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  connectionRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  content: {
    gap: 24,
    paddingBottom: 34,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  flatSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 18,
    paddingTop: 24,
  },
  hero: {
    gap: 18,
  },
  heroHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  identityCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
    paddingTop: 3,
  },
  iconButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  iconButtonPressed: {
    opacity: 0.62,
  },
  identityRows: {
    gap: 12,
  },
  intentBlock: {
    gap: 10,
  },
  primaryAction: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 58,
  },
  profileChip: {
    borderWidth: 1,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  secondaryAction: {
    alignItems: 'center',
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  sectionTitleRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  skillChips: {
    flex: 1,
    minWidth: 0,
  },
  skillRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  timeline: {
    gap: 0,
  },
  timelineCopy: {
    flex: 1,
    gap: 6,
    paddingBottom: 26,
  },
  timelineDot: {
    borderWidth: 4,
    borderRadius: 999,
    height: 18,
    width: 18,
  },
  timelineLine: {
    flex: 1,
    width: StyleSheet.hairlineWidth,
  },
  timelineMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timelineRail: {
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingTop: 2,
    width: 28,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 14,
  },
  timelineRowPressed: {
    opacity: 0.72,
  },
  timelineTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
});
