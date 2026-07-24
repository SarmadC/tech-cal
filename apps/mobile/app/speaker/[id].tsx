import { FontAwesome } from '@expo/vector-icons';
import type { MobileEventCard, MobileSpeakerDetail } from '@kurecal/domain';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { HeaderActionButton, MobilePage } from '../../src/components/chrome/MobilePage';
import { ScreenState } from '../../src/components/chrome/ScreenState';
import {
  SpeakerProfileCard,
  type SpeakerNetworkingAction,
  type SpeakerNetworkingPendingState,
} from '../../src/components/speaker/SpeakerProfileCard';
import { DiscoverEventCard } from '../../src/components/discover/DiscoverEventCard';
import {
  formatCommunityTabCount,
  getSafeExternalUrl,
} from '../../src/components/community/presentation';
import {
  loadMobileSpeakerDetail,
  updateMobileNetworkingContact,
} from '../../src/lib/mobileApi';
import { selectSpeakerPrimaryAction } from '../../src/lib/speakerPresentation';
import { useAppTheme } from '../../src/providers/ThemeProvider';

function normalizeSpeakerEventFormat(
  format: string | null
): MobileEventCard['format'] {
  const normalized = format?.trim().toLowerCase();

  if (normalized === 'online' || normalized === 'virtual') {
    return 'virtual';
  }

  if (normalized === 'in-person' || normalized === 'in person') {
    return 'in-person';
  }

  return normalized === 'hybrid' ? 'hybrid' : null;
}

function toSpeakerDiscoverEventCard(
  event: MobileSpeakerDetail['events'][number]
): MobileEventCard {
  const format = normalizeSpeakerEventFormat(event.format);

  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    startTime: event.startTime,
    location: event.location,
    imageUrl: event.imageUrl ?? null,
    organizerLogoUrl: event.organizerLogoUrl ?? null,
    format,
    formatLabel: format ? undefined : event.format?.trim() || undefined,
  };
}

function resolveLinkedInFollowUpEvent(params: {
  speaker: MobileSpeakerDetail;
  routeEventId?: string;
  routeEventTitle?: string;
}) {
  const trimmedRouteEventId = params.routeEventId?.trim() ?? '';
  if (trimmedRouteEventId) {
    const matchedEvent = params.speaker.events.find(
      (event) => event.id === trimmedRouteEventId
    );

    return {
      eventId: trimmedRouteEventId,
      eventTitle:
        matchedEvent?.title ?? params.routeEventTitle?.trim() ?? null,
    };
  }

  const trimmedRouteEventTitle = params.routeEventTitle?.trim() ?? '';
  if (trimmedRouteEventTitle) {
    const matchedEvent = params.speaker.events.find(
      (event) => event.title === trimmedRouteEventTitle
    );

    if (matchedEvent) {
      return {
        eventId: matchedEvent.id,
        eventTitle: matchedEvent.title,
      };
    }
  }

  const pastEvents = params.speaker.events.filter((event) => event.isPastEvent);
  if (pastEvents.length === 1) {
    return {
      eventId: pastEvents[0].id,
      eventTitle: pastEvents[0].title,
    };
  }

  return null;
}

function getPendingState(
  action: SpeakerNetworkingAction
): Exclude<SpeakerNetworkingPendingState, null> {
  if (action === 'mark_request_sent') {
    return 'request';
  }
  if (action === 'confirm_connection') {
    return 'confirm';
  }
  return action === 'clear_request' ? 'clear' : 'clear_connection';
}

function getNetworkingErrorTitle(action: SpeakerNetworkingAction): string {
  if (action === 'mark_request_sent') {
    return 'Unable to log request';
  }
  if (action === 'confirm_connection') {
    return 'Unable to confirm connection';
  }
  return action === 'clear_request'
    ? 'Unable to clear request'
    : 'Unable to clear connection';
}

export default function SpeakerScreen() {
  const { tokens } = useAppTheme();
  const { id, eventId, eventTitle } = useLocalSearchParams<{
    id: string | string[];
    eventId?: string | string[];
    eventTitle?: string | string[];
  }>();
  const resolvedId = Array.isArray(id) ? id[0] : id;
  const resolvedEventId = Array.isArray(eventId) ? eventId[0] : eventId;
  const resolvedEventTitle = Array.isArray(eventTitle) ? eventTitle[0] : eventTitle;
  const requestSequenceRef = useRef(0);

  const [speaker, setSpeaker] = useState<MobileSpeakerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [networkingActionPending, setNetworkingActionPending] =
    useState<SpeakerNetworkingPendingState>(null);

  const loadSpeaker = useCallback(async () => {
    const trimmed = resolvedId?.trim();
    if (!trimmed) {
      setError('Speaker id is required.');
      setLoading(false);
      setSpeaker(null);
      return;
    }

    const requestId = ++requestSequenceRef.current;
    setLoading(true);

    try {
      const nextSpeaker = await loadMobileSpeakerDetail(trimmed);
      if (requestId !== requestSequenceRef.current) {
        return;
      }

      setSpeaker(nextSpeaker);
      setError(null);
    } catch (nextError) {
      if (requestId !== requestSequenceRef.current) {
        return;
      }

      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load this speaker.'
      );
    } finally {
      if (requestId === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [resolvedId]);

  useFocusEffect(
    useCallback(() => {
      void loadSpeaker();
    }, [loadSpeaker])
  );

  const networkingSourceEvent = speaker
    ? resolveLinkedInFollowUpEvent({
        speaker,
        routeEventId: resolvedEventId,
        routeEventTitle: resolvedEventTitle,
      })
    : null;

  const handleNetworkingAction = useCallback(
    async (action: SpeakerNetworkingAction) => {
      if (!speaker || networkingActionPending) {
        return;
      }

      setNetworkingActionPending(getPendingState(action));

      try {
        const result = await updateMobileNetworkingContact({
          target: {
            kind: 'speaker',
            id: speaker.id,
            sourceEventId: networkingSourceEvent?.eventId ?? null,
          },
          action,
        });

        setSpeaker((current) =>
          current
            ? {
                ...current,
                networkingState: result.networkingState,
              }
            : current
        );
      } catch (nextError) {
        Alert.alert(
          getNetworkingErrorTitle(action),
          nextError instanceof Error ? nextError.message : 'Please try again.'
        );
      } finally {
        setNetworkingActionPending(null);
      }
    },
    [networkingActionPending, networkingSourceEvent?.eventId, speaker]
  );

  const handleOpenExternal = useCallback(async (label: string, url: string) => {
    try {
      await Linking.openURL(url);
    } catch (nextError) {
      Alert.alert(
        `Unable to open ${label}`,
        nextError instanceof Error ? nextError.message : 'Link failed to open.'
      );
    }
  }, []);

  const secondaryLinks = useMemo(() => {
    if (!speaker) {
      return [];
    }

    const primaryAction = selectSpeakerPrimaryAction(speaker);
    const websiteUrl = getSafeExternalUrl(speaker.websiteUrl);
    const twitterUrl = getSafeExternalUrl(speaker.twitterUrl);

    return [
      websiteUrl && primaryAction?.kind !== 'website'
        ? {
            icon: 'external-link' as const,
            label: 'Website',
            url: websiteUrl,
          }
        : null,
      twitterUrl
        ? {
            icon: 'twitter' as const,
            label: 'Twitter',
            url: twitterUrl,
          }
        : null,
    ].filter(Boolean) as Array<{
      icon: keyof typeof FontAwesome.glyphMap;
      label: string;
      url: string;
    }>;
  }, [speaker]);

  return (
    <MobilePage
      headerHidden
      showAccentGlow={false}
      title={speaker?.name ?? 'Speaker'}
    >
      <View style={styles.contentWrap}>
        {loading && !speaker ? (
          <ScreenState
            description="Pulling profile and speaking sessions."
            mode="loading"
            title="Loading speaker"
          />
        ) : null}

        {error && !speaker ? (
          <ScreenState
            action={
              <HeaderActionButton
                label="Retry"
                onPress={() => {
                  void loadSpeaker();
                }}
              />
            }
            description={error}
            mode="error"
            title="Speaker unavailable"
          />
        ) : null}

        {speaker ? (
          <>
            <SpeakerProfileCard
              networkingActionPending={networkingActionPending}
              onBack={() => router.back()}
              onNetworkingAction={(action) => {
                void handleNetworkingAction(action);
              }}
              onOpenExternal={(label, url) => {
                void handleOpenExternal(label, url);
              }}
              speaker={speaker}
            />

            {speaker.bio || secondaryLinks.length > 0 ? (
              <View
                style={[
                  styles.section,
                  { borderColor: tokens.colors.divider },
                ]}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  About
                </Text>
                {speaker.bio ? (
                  <Text
                    maxFontSizeMultiplier={1.5}
                    style={[
                      styles.bio,
                      {
                        color: tokens.colors.textSecondary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                  >
                    {speaker.bio}
                  </Text>
                ) : null}
                {secondaryLinks.length > 0 ? (
                  <View style={styles.secondaryLinks}>
                    {secondaryLinks.map((link) => (
                      <Pressable
                        accessibilityLabel={`Open ${speaker.name} ${link.label}`}
                        accessibilityRole="link"
                        key={link.label}
                        onPress={() => {
                          void handleOpenExternal(link.label, link.url);
                        }}
                        style={({ pressed }) => [
                          styles.secondaryLink,
                          pressed && styles.pressed,
                        ]}
                      >
                        <FontAwesome
                          color={tokens.colors.link}
                          name={link.icon}
                          size={13}
                        />
                        <Text
                          style={[
                            styles.secondaryLinkLabel,
                            {
                              color: tokens.colors.link,
                              fontFamily: tokens.typography.sans,
                            },
                          ]}
                        >
                          {link.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View
              style={[
                styles.section,
                styles.eventsSection,
                { borderColor: tokens.colors.divider },
              ]}
            >
              <View style={styles.eventsHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  Speaking sessions
                </Text>
                {Math.max(speaker.appearanceCount, speaker.events.length) > 0 ? (
                  <Text
                    style={[
                      styles.eventCount,
                      {
                        color: tokens.colors.textTertiary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                  >
                    {formatCommunityTabCount(
                      Math.max(speaker.appearanceCount, speaker.events.length)
                    )}
                  </Text>
                ) : null}
              </View>

              <View style={styles.eventsBody}>
                {speaker.events.length > 0 ? (
                  speaker.events.map((event, index) => (
                    <DiscoverEventCard
                      accessibilityLabel={`Open event ${event.title}`}
                      event={toSpeakerDiscoverEventCard(event)}
                      key={event.id}
                      onPress={() => router.push(`/event/${event.id}`)}
                      showDivider={index < speaker.events.length - 1}
                      showSavedIndicator={false}
                    />
                  ))
                ) : (
                  <ScreenState
                    description="Speaking events will appear here when they are available."
                    mode="empty"
                    title="No sessions yet"
                    variant="plain"
                  />
                )}
              </View>
            </View>
          </>
        ) : null}
      </View>
    </MobilePage>
  );
}

const styles = StyleSheet.create({
  bio: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
  },
  contentWrap: {
    alignSelf: 'center',
    gap: 16,
    maxWidth: 430,
    width: '100%',
  },
  eventCount: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  eventsBody: {
    gap: 0,
  },
  eventsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  eventsSection: {
    paddingBottom: 4,
  },
  pressed: {
    opacity: 0.82,
  },
  secondaryLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    minHeight: 34,
  },
  secondaryLinkLabel: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  secondaryLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
    paddingTop: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
});
