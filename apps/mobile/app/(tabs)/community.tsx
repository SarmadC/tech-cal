import { FontAwesome } from '@expo/vector-icons';
import type {
  MobileCommunityNetworkingEvent,
  MobileCommunityNetworkingFollowUpCard,
  MobileCommunityHome,
  MobileCommunityNetworkingPersonCard,
  MobileCommunityNetworkingSharedEvent,
  MobileCommunityNetworkingSpeakerMatch,
} from '@kurecal/domain';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MobilePage } from '../../src/components/chrome/MobilePage';
import { ScreenState } from '../../src/components/chrome/ScreenState';
import { KureButton } from '../../src/components/chrome/KureButton';
import { CommunityNetworkingEventCard } from '../../src/components/community/CommunityNetworkingEventCard';
import { CommunityNetworkingPersonCard } from '../../src/components/community/CommunityNetworkingPersonCard';
import { CommunityNetworkingSpeakerCard } from '../../src/components/community/CommunityNetworkingSpeakerCard';
import { formatCommunityTabCount } from '../../src/components/community/presentation';
import { useAppTheme } from '../../src/providers/ThemeProvider';
import {
  followMobileUser,
  loadMobileCommunityHome,
  unfollowMobileUser,
} from '../../src/lib/mobileApi';

type LoadMode = 'initial' | 'refresh';
type NetworkLens = 'for_you' | 'follows_you' | 'attending' | 'mutuals';
type CommunitySpeakerPreview = NonNullable<
  MobileCommunityNetworkingEvent['speakerPreview']
>[number];

interface CommunitySpeakerSurface {
  speaker: CommunitySpeakerPreview;
  event:
    | MobileCommunityNetworkingEvent
    | MobileCommunityNetworkingSpeakerMatch['event'];
  matchReason?: string | null;
  isPastEvent: boolean;
}

const NETWORK_LENSES: Array<{ id: NetworkLens; label: string }> = [
  { id: 'for_you', label: 'For You' },
  { id: 'follows_you', label: 'Follows You' },
  { id: 'attending', label: 'Attending' },
  { id: 'mutuals', label: 'Mutuals' },
];

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function getPrimaryEvent(
  person:
    | MobileCommunityNetworkingPersonCard
    | MobileCommunityNetworkingFollowUpCard
): MobileCommunityNetworkingSharedEvent | null {
  return person.strongestSharedEvent ?? person.sharedEvents[0] ?? null;
}

function matchesPersonSearch(
  person:
    | MobileCommunityNetworkingPersonCard
    | MobileCommunityNetworkingFollowUpCard,
  query: string
): boolean {
  if (!query) {
    return true;
  }

  const event = getPrimaryEvent(person);
  const haystack = [
    person.fullName,
    person.username,
    person.headline,
    person.currentRole,
    person.industry,
    person.location,
    person.whyNow,
    event?.title,
    event?.location,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function matchesMeetLens(
  person: MobileCommunityNetworkingPersonCard,
  lens: NetworkLens
): boolean {
  switch (lens) {
    case 'follows_you':
      return person.followsViewer || person.isMutualFollow;
    case 'attending':
      return person.sharedEvents.some((event) => event.viewerContext === 'attending');
    case 'mutuals':
      return person.isMutualFollow;
    default:
      return true;
  }
}

function matchesEventSearch(
  event: MobileCommunityNetworkingEvent,
  query: string
): boolean {
  if (!query) {
    return true;
  }

  const haystack = [event.title, event.location, event.primaryReason, event.whyNow]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function matchesEventLens(
  event: MobileCommunityNetworkingEvent,
  lens: NetworkLens
): boolean {
  switch (lens) {
    case 'follows_you':
      return event.networkAttendingCount > 0 || event.relationshipAttendeeCount > 0;
    case 'attending':
      return event.viewerContext === 'attending';
    case 'mutuals':
      return event.relationshipAttendeeCount > 0;
    default:
      return true;
  }
}

function matchesSpeakerSearch(
  item: CommunitySpeakerSurface,
  query: string
): boolean {
  if (!query) {
    return true;
  }

  const haystack = [
    item.speaker.name,
    item.speaker.title,
    item.speaker.company,
    item.event.title,
    item.event.location,
    item.matchReason,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function buildSpeakerSurfaces(
  events: MobileCommunityNetworkingEvent[]
): CommunitySpeakerSurface[] {
  const surfaces = new Map<string, CommunitySpeakerSurface>();

  for (const event of events) {
    for (const speaker of event.speakerPreview ?? []) {
      const key = speaker.id || `${speaker.name}:${event.id}`;
      if (!surfaces.has(key)) {
        surfaces.set(key, {
          speaker,
          event,
          matchReason: null,
          isPastEvent: false,
        });
      }
    }
  }

  return Array.from(surfaces.values());
}

function buildSpeakerMatchSurfaces(
  matches: MobileCommunityHome['speakerMatches'] = []
): CommunitySpeakerSurface[] {
  return matches.map((match) => ({
    speaker: match.speaker,
    event: match.event,
    matchReason: match.matchReason,
    isPastEvent: match.isPastEvent,
  }));
}

function getVisibilityMessage(home: MobileCommunityHome): string | null {
  const attendingCount = home.upcomingMoments.filter(
    (event) => event.viewerContext === 'attending'
  ).length;

  if (!home.summary.attendanceVisibilityEnabled && attendingCount > 0) {
    return 'Enable visibility so attendees can find you.';
  }

  return null;
}

function getCommunityLoadErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) {
      return message;
    }
  }

  return 'The event networking view could not be loaded right now.';
}

export default function CommunityScreen() {
  const { tokens } = useAppTheme();
  const requestSequenceRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const homeRef = useRef<MobileCommunityHome | null>(null);

  const [home, setHome] = useState<MobileCommunityHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeLens, setActiveLens] = useState<NetworkLens>('for_you');
  const deferredSearch = useDeferredValue(searchText);
  const normalizedSearch = normalizeSearch(deferredSearch);

  const loadCommunity = useCallback(
    async (mode: LoadMode = 'initial') => {
      const requestId = ++requestSequenceRef.current;
      const existingHome = homeRef.current;

      if (mode !== 'refresh' && !existingHome) {
        setLoading(true);
      }

      try {
        const nextHome = await loadMobileCommunityHome();
        if (requestId !== requestSequenceRef.current) {
          return;
        }

        setHome(nextHome);
        homeRef.current = nextHome;
        setError(null);
        setInlineError(null);
      } catch (nextError) {
        if (requestId !== requestSequenceRef.current) {
          return;
        }

        const message = getCommunityLoadErrorMessage(nextError);
        if (mode === 'refresh' || existingHome) {
          setInlineError(message);
        } else {
          setError(message);
        }
      } finally {
        if (requestId === requestSequenceRef.current && mode !== 'refresh') {
          setLoading(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        void loadCommunity('initial');
      } else {
        void loadCommunity('refresh');
      }
    }, [loadCommunity])
  );

  const recommendedSpeakerSurfaces = useMemo(() => {
    if (!home) {
      return [];
    }

    return buildSpeakerMatchSurfaces(home.speakerMatches);
  }, [home]);

  const upcomingSpeakerSurfaces = useMemo(() => {
    if (!home) {
      return [];
    }

    return buildSpeakerSurfaces(
      home.upcomingMoments.filter((event) => matchesEventLens(event, activeLens))
    );
  }, [activeLens, home]);

  const filteredRecommendedSpeakers = useMemo(
    () =>
      recommendedSpeakerSurfaces.filter((item) =>
        matchesSpeakerSearch(item, normalizedSearch)
      ),
    [normalizedSearch, recommendedSpeakerSurfaces]
  );

  const filteredUpcomingSpeakers = useMemo(
    () =>
      upcomingSpeakerSurfaces.filter((item) =>
        matchesSpeakerSearch(item, normalizedSearch)
      ),
    [normalizedSearch, upcomingSpeakerSurfaces]
  );

  const filteredFollowUps = useMemo(() => {
    if (!home) {
      return [];
    }

    return home.followUpNow.filter((person) =>
      matchesPersonSearch(person, normalizedSearch)
    );
  }, [home, normalizedSearch]);

  const filteredPeopleToMeet = useMemo(() => {
    if (!home) {
      return [];
    }

    return home.peopleToMeet.filter(
      (person) =>
        matchesMeetLens(person, activeLens) &&
        matchesPersonSearch(person, normalizedSearch)
    );
  }, [activeLens, home, normalizedSearch]);

  const filteredEvents = useMemo(() => {
    if (!home) {
      return [];
    }

    return home.upcomingMoments.filter(
      (event) =>
        matchesEventLens(event, activeLens) &&
        matchesEventSearch(event, normalizedSearch)
    );
  }, [activeLens, home, normalizedSearch]);

  const hasRecommendedSpeakerSurfaces = recommendedSpeakerSurfaces.length > 0;
  const hasUpcomingSpeakerSurfaces = upcomingSpeakerSurfaces.length > 0;
  const hasAnySpeakerSurfaces =
    hasRecommendedSpeakerSurfaces || hasUpcomingSpeakerSurfaces;

  const visibilityMessage = home ? getVisibilityMessage(home) : null;
  const attendingEvents = filteredEvents.filter(
    (event) => event.viewerContext === 'attending'
  );
  const savedEvents = filteredEvents.filter((event) => event.viewerContext === 'saved');

  async function handleToggleFollow(
    userId: string,
    username: string,
    isFollowing: boolean
  ) {
    setPendingUserId(userId);

    try {
      if (isFollowing) {
        await unfollowMobileUser(userId);
      } else {
        await followMobileUser(userId);
      }

      await loadCommunity('refresh');
    } catch (nextError) {
      Alert.alert(
        isFollowing ? 'Disconnect failed' : 'Connect failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to update connection status.'
      );
    } finally {
      setPendingUserId((current) => (current === userId ? null : current));
    }
  }

  const handleOpenSpeakerExternalLink = useCallback(
    async (_surface: CommunitySpeakerSurface, _label: string, url: string) => {
      try {
        await Linking.openURL(url);
      } catch (nextError) {
        Alert.alert(
          'Unable to open link',
          nextError instanceof Error ? nextError.message : 'Please try again.'
        );
      }
    },
    []
  );

  const handleOpenSpeaker = useCallback((item: CommunitySpeakerSurface) => {
    router.push({
      pathname: '/speaker/[id]',
      params: {
        id: item.speaker.id,
        ...(item.isPastEvent ? { eventId: item.event.id } : {}),
        ...(item.isPastEvent ? { eventTitle: item.event.title } : {}),
      },
    });
  }, []);

  return (
    <MobilePage
      headerHidden
      showAccentGlow={false}
      title="Network"
    >
      <View style={styles.contentWrap}>
        {loading && !home ? (
          <ScreenState
            mode="loading"
            title="Loading network"
            description="Pulling the people and events around your current calendar."
          />
        ) : null}

        {error && !home ? (
          <ScreenState
            mode="error"
            title="Network unavailable"
            description={error}
            action={
              <KureButton
                disabled={loading}
                onPress={() => {
                  void loadCommunity('initial');
                }}
              >
                {loading ? 'Retrying...' : 'Try again'}
              </KureButton>
            }
          />
        ) : null}

        {home ? (
          <>
            <NetworkToolbar
              value={searchText}
              onChangeText={setSearchText}
              onOpenSettings={() => router.push('/settings?focus=visibility')}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.lensRow}
            >
              {NETWORK_LENSES.map((lens) => (
                <LensChip
                  key={lens.id}
                  active={activeLens === lens.id}
                  label={lens.label}
                  onPress={() => setActiveLens(lens.id)}
                />
              ))}
            </ScrollView>

            {inlineError ? (
              <View
                style={[
                  styles.inlineError,
                  {
                    backgroundColor: tokens.colors.surfaceMuted,
                    borderColor: tokens.colors.border,
                    borderRadius: tokens.radius.md,
                  },
                ]}
              >
                <FontAwesome
                  name="warning"
                  size={13}
                  color={tokens.colors.warning}
                />
                <Text
                  style={{
                    color: tokens.colors.textSecondary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 13,
                    lineHeight: 18,
                    fontWeight: '600',
                  }}
                >
                  {inlineError}
                </Text>
              </View>
            ) : null}

            <SectionHeader
              icon="calendar-check-o"
              title="Events you're attending"
              meta={
                attendingEvents.length > 0
                  ? `${formatCommunityTabCount(attendingEvents.length)} upcoming`
                  : undefined
              }
            />
            {attendingEvents.length > 0 ? (
              <View style={styles.eventStack}>
                {attendingEvents.map((event, index) => (
                  <CommunityNetworkingEventCard
                    key={event.id}
                    event={event}
                    featured={index === 0}
                    onOpenEvent={() => router.push(`/event/${event.id}`)}
                  />
                ))}
              </View>
            ) : home.summary.trackedUpcomingCount > 0 ? (
              <InlineSectionNote
                title={
                  normalizedSearch.length > 0 || activeLens !== 'for_you'
                    ? 'No attending events in this view'
                    : 'No attending events yet'
                }
              />
            ) : (
              <InlineSectionNote title="No attending events yet" />
            )}

            {visibilityMessage ? (
              <VisibilityNotice
                message={visibilityMessage}
                onOpenSettings={() => router.push('/settings?focus=visibility')}
              />
            ) : null}

            <SectionHeader
              icon="calendar-o"
              title="Saved events worth going to"
              meta={
                savedEvents.length > 0
                  ? `${formatCommunityTabCount(savedEvents.length)} saved events`
                  : undefined
              }
            />
            {savedEvents.length > 0 ? (
              <View style={styles.eventStack}>
                {savedEvents.map((event, index) => (
                  <CommunityNetworkingEventCard
                    key={event.id}
                    event={event}
                    featured={attendingEvents.length === 0 && index === 0}
                    onOpenEvent={() => router.push(`/event/${event.id}`)}
                  />
                ))}
              </View>
            ) : home.summary.trackedUpcomingCount > 0 ? (
              <InlineSectionNote
                title={
                  normalizedSearch.length > 0 || activeLens !== 'for_you'
                    ? 'No saved events in this view'
                    : 'No saved events yet'
                }
              />
            ) : (
              <SectionEmptyState
                icon="calendar-o"
                title={
                  normalizedSearch.length > 0 || activeLens !== 'for_you'
                    ? 'No events in this view'
                    : 'No saved events yet'
                }
                primaryAction={{
                  label: 'Explore events',
                  onPress: () => router.push('/discover'),
                }}
              />
            )}

            {hasRecommendedSpeakerSurfaces ? (
              <>
                <SectionHeader
                  icon="microphone"
                  title="Recommended speakers"
                  meta={
                    filteredRecommendedSpeakers.length > 0
                      ? `${formatCommunityTabCount(filteredRecommendedSpeakers.length)} speakers`
                      : undefined
                  }
                />
                {filteredRecommendedSpeakers.length > 0 ? (
                  <View style={styles.stack}>
                    {filteredRecommendedSpeakers.map((item) => (
                      <CommunityNetworkingSpeakerCard
                        key={`${item.speaker.id ?? item.speaker.name}:${item.event.id}:recommended`}
                        speaker={item.speaker}
                        onOpenExternalLink={(label, url) => {
                          void handleOpenSpeakerExternalLink(item, label, url);
                        }}
                        onOpenSpeaker={() => handleOpenSpeaker(item)}
                      />
                    ))}
                  </View>
                ) : (
                  <InlineSectionNote title="No recommended speakers in this view" />
                )}
              </>
            ) : null}

            {hasUpcomingSpeakerSurfaces ? (
              <>
                <SectionHeader
                  icon="microphone"
                  title="Speakers on upcoming events"
                  meta={
                    filteredUpcomingSpeakers.length > 0
                      ? `${formatCommunityTabCount(filteredUpcomingSpeakers.length)} speakers`
                      : undefined
                  }
                />
                {filteredUpcomingSpeakers.length > 0 ? (
                  <View style={styles.stack}>
                    {filteredUpcomingSpeakers.map((item) => (
                      <CommunityNetworkingSpeakerCard
                        key={`${item.speaker.id ?? item.speaker.name}:${item.event.id}:upcoming`}
                        speaker={item.speaker}
                        onOpenExternalLink={(label, url) => {
                          void handleOpenSpeakerExternalLink(item, label, url);
                        }}
                        onOpenSpeaker={() => handleOpenSpeaker(item)}
                      />
                    ))}
                  </View>
                ) : (
                  <InlineSectionNote title="No upcoming-event speakers in this view" />
                )}
              </>
            ) : null}

            <SectionHeader
              icon="users"
              title="People you can meet"
              meta={
                filteredPeopleToMeet.length > 0
                  ? `${formatCommunityTabCount(filteredPeopleToMeet.length)} people`
                  : undefined
              }
            />
            {filteredPeopleToMeet.length > 0 ? (
              <View style={styles.stack}>
                {filteredPeopleToMeet.map((person) => (
                  <CommunityNetworkingPersonCard
                    key={person.id}
                    person={person}
                    mode="meet"
                    isFollowing={person.isInNetwork}
                    isPending={pendingUserId === person.id}
                    onToggleFollow={() =>
                      handleToggleFollow(person.id, person.username, person.isInNetwork)
                    }
                    onOpenProfile={() => router.push(`/profile/${person.username}`)}
                    onOpenEvent={(eventId) => router.push(`/event/${eventId}`)}
                  />
                ))}
              </View>
            ) : hasAnySpeakerSurfaces ? (
              <InlineSectionNote
                title={
                  normalizedSearch.length > 0 || activeLens !== 'for_you'
                    ? 'No people in this view'
                    : 'No attendee matches yet'
                }
              />
            ) : home.summary.trackedUpcomingCount === 0 ? (
              <InlineSectionNote title="No people yet" />
            ) : (
              <InlineSectionNote
                title={
                  normalizedSearch.length > 0 || activeLens !== 'for_you'
                    ? 'No people in this view'
                    : 'No attendee matches yet'
                }
              />
            )}

            {!hasAnySpeakerSurfaces ? (
              <InlineSectionNote
                title={
                  normalizedSearch.length > 0 || activeLens !== 'for_you'
                    ? 'No speakers in this view'
                    : 'No speakers yet'
                }
              />
            ) : null}

            <SectionHeader
              icon="refresh"
              title="Follow up after events"
              meta={
                filteredFollowUps.length > 0
                  ? `${formatCommunityTabCount(filteredFollowUps.length)} people`
                  : undefined
              }
            />
            {filteredFollowUps.length > 0 ? (
              <View style={styles.stack}>
                {filteredFollowUps.map((person) => (
                  <CommunityNetworkingPersonCard
                    key={person.id}
                    person={person}
                    mode="follow-up"
                    isFollowing={person.isInNetwork}
                    isPending={pendingUserId === person.id}
                    onToggleFollow={() =>
                      handleToggleFollow(person.id, person.username, person.isInNetwork)
                    }
                    onOpenProfile={() => router.push(`/profile/${person.username}`)}
                    onOpenEvent={(eventId) => router.push(`/event/${eventId}`)}
                  />
                ))}
              </View>
            ) : home.summary.trackedUpcomingCount === 0 ? (
              <InlineSectionNote title="No follow-up yet" />
            ) : (
              <InlineSectionNote
                title={
                  normalizedSearch.length > 0
                    ? 'No follow-up in this view'
                    : 'No follow-up yet'
                }
              />
            )}
          </>
        ) : null}
      </View>
    </MobilePage>
  );
}

function NetworkToolbar({
  value,
  onChangeText,
  onOpenSettings,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onOpenSettings: () => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <View style={styles.toolbarRow}>
      <View
        style={[
          styles.searchBar,
          styles.searchBarExpanded,
          {
            backgroundColor: tokens.colors.surfaceStrong,
            borderColor: tokens.colors.border,
            borderRadius: tokens.radius.sm,
          },
        ]}
      >
        <FontAwesome name="search" size={15} color={tokens.colors.textTertiary} />
        <TextInput
          accessibilityLabel="Search network"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Search people, speakers, or events"
          placeholderTextColor={tokens.colors.textTertiary}
          returnKeyType="search"
          selectionColor={tokens.colors.accent}
          style={[
            styles.searchInput,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open network settings"
        onPress={onOpenSettings}
        style={({ pressed }) => [
          styles.toolbarAction,
          {
            backgroundColor: tokens.colors.surface,
            borderColor: tokens.colors.border,
            borderRadius: tokens.radius.sm,
          },
          pressed && styles.pressed,
        ]}
      >
        <FontAwesome name="gear" size={14} color={tokens.colors.textPrimary} />
      </Pressable>
    </View>
  );
}

function LensChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.lensChip,
        {
          backgroundColor: active
            ? tokens.colors.accentSoft
            : tokens.colors.surfaceStrong,
          borderColor: active ? tokens.colors.accent : tokens.colors.border,
          borderRadius: tokens.radius.sm,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={{
          color: active ? tokens.colors.accent : tokens.colors.textSecondary,
          fontFamily: tokens.typography.sans,
          fontSize: 12,
          lineHeight: 16,
          fontWeight: '800',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function VisibilityNotice({
  message,
  onOpenSettings,
}: {
  message: string;
  onOpenSettings: () => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.notice,
        {
          backgroundColor: tokens.colors.surfaceMuted,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      <View
        style={[
          styles.noticeIcon,
          {
            backgroundColor: tokens.colors.warning,
            borderRadius: tokens.radius.pill,
          },
        ]}
      >
        <FontAwesome name="eye-slash" size={12} color={tokens.colors.textInverse} />
      </View>
      <View style={styles.noticeBody}>
        <Text
          style={{
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
            fontSize: 13,
            lineHeight: 19,
            fontWeight: '600',
          }}
        >
          {message}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open visibility settings"
          onPress={onOpenSettings}
          style={({ pressed }) => [
            styles.noticeAction,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.sm,
            },
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 12,
              lineHeight: 16,
              fontWeight: '800',
            }}
          >
            Open settings
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function SectionHeader({
  icon,
  meta,
  title,
}: {
  icon: keyof typeof FontAwesome.glyphMap;
  meta?: string;
  title: string;
}) {
  const { tokens } = useAppTheme();

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        <View
          style={[
            styles.sectionIcon,
            {
              backgroundColor: tokens.colors.accentSoft,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.pill,
            },
          ]}
        >
          <FontAwesome name={icon} size={12} color={tokens.colors.accent} />
        </View>
        <Text
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 16,
            lineHeight: 20,
            fontWeight: '800',
          }}
        >
          {title}
        </Text>
      </View>
      {meta ? (
        <Text
          style={{
            color: tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
            fontSize: 11,
            lineHeight: 16,
            fontWeight: '700',
          }}
        >
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

function SectionEmptyState({
  icon,
  primaryAction,
  title,
}: {
  icon: keyof typeof FontAwesome.glyphMap;
  primaryAction: { label: string; onPress: () => void };
  title: string;
}) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.emptyState,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.lg,
        },
      ]}
    >
      <View
        style={[
          styles.emptyIcon,
          {
            backgroundColor: tokens.colors.surfaceMuted,
            borderColor: tokens.colors.border,
            borderRadius: tokens.radius.pill,
          },
        ]}
      >
        <FontAwesome name={icon} size={16} color={tokens.colors.textTertiary} />
      </View>
      <Text
        style={{
          color: tokens.colors.textPrimary,
          fontFamily: tokens.typography.sans,
          fontSize: 16,
          lineHeight: 20,
          fontWeight: '800',
        }}
      >
        {title}
      </Text>
      <View style={styles.emptyAction}>
        <KureButton onPress={primaryAction.onPress}>{primaryAction.label}</KureButton>
      </View>
    </View>
  );
}

function InlineSectionNote({ title }: { title: string }) {
  const { tokens } = useAppTheme();

  return (
    <View style={styles.inlineNote}>
      <Text
        style={{
          color: tokens.colors.textPrimary,
          fontFamily: tokens.typography.sans,
          fontSize: 15,
          lineHeight: 20,
          fontWeight: '800',
        }}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    gap: 12,
  },
  emptyAction: {
    width: '100%',
    maxWidth: 180,
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 20,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  eventStack: {
    gap: 8,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  inlineNote: {
    gap: 6,
    paddingBottom: 4,
  },
  lensChip: {
    minHeight: 30,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  lensRow: {
    gap: 6,
    paddingRight: 4,
  },
  notice: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noticeAction: {
    alignSelf: 'flex-start',
    minHeight: 32,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  noticeBody: {
    flex: 1,
    gap: 10,
  },
  noticeIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.84,
  },
  searchBar: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  searchBarExpanded: {
    flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    paddingVertical: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stack: {
    gap: 14,
  },
  toolbarAction: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
