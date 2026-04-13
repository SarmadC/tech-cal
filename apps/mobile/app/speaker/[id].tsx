import { FontAwesome } from '@expo/vector-icons';
import type { MobileSpeakerDetail } from '@kurecal/domain';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { HeaderActionButton, MobilePage } from '../../src/components/chrome/MobilePage';
import { KureButton } from '../../src/components/chrome/KureButton';
import { ScreenState } from '../../src/components/chrome/ScreenState';
import { CommunityAvatar } from '../../src/components/community/CommunityAvatar';
import { CommunitySection } from '../../src/components/community/CommunitySection';
import { CommunityUpcomingEventRow } from '../../src/components/community/CommunityUpcomingEventRow';
import {
  formatCommunityTabCount,
  formatNetworkingLocation,
  getSafeExternalUrl,
} from '../../src/components/community/presentation';
import { useAppTheme } from '../../src/providers/ThemeProvider';
import {
  loadMobileSpeakerDetail,
  updateMobileNetworkingContact,
} from '../../src/lib/mobileApi';

function getSpeakerHeadline(title: string | null, company: string | null): string {
  const parts = [title, company].filter(Boolean);
  return parts.join(' · ') || 'Speaker';
}

function getSpeakerEventMeta(
  location: string | null,
  format: string | null,
  isPastEvent: boolean
): string {
  const locationLine = formatNetworkingLocation(location, format);
  return isPastEvent ? `Past event · ${locationLine}` : locationLine;
}

function getSocialLinks(speaker: MobileSpeakerDetail) {
  const linkedinUrl = getSafeExternalUrl(speaker.linkedinUrl);
  const twitterUrl = getSafeExternalUrl(speaker.twitterUrl);
  const websiteUrl = getSafeExternalUrl(speaker.websiteUrl);

  return [
    linkedinUrl
      ? { label: 'LinkedIn', icon: 'linkedin-square' as const, url: linkedinUrl }
      : null,
    twitterUrl ? { label: 'Twitter', icon: 'twitter' as const, url: twitterUrl } : null,
    websiteUrl
      ? { label: 'Website', icon: 'external-link' as const, url: websiteUrl }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    icon: keyof typeof FontAwesome.glyphMap;
    url: string;
  }>;
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
  const [networkingActionPending, setNetworkingActionPending] = useState<
    'request' | 'confirm' | null
  >(null);

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
  const networkingState = speaker?.networkingState ?? {
    status: 'none',
    linkedinRequestedAt: null,
    confirmedConnectedAt: null,
  };

  const handleNetworkingAction = useCallback(
    async (action: 'mark_request_sent' | 'confirm_connection') => {
      if (!speaker || networkingActionPending) {
        return;
      }

      setNetworkingActionPending(
        action === 'mark_request_sent' ? 'request' : 'confirm'
      );

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
          action === 'mark_request_sent'
            ? 'Unable to log request'
            : 'Unable to confirm connection',
          nextError instanceof Error ? nextError.message : 'Please try again.'
        );
      } finally {
        setNetworkingActionPending(null);
      }
    },
    [networkingActionPending, networkingSourceEvent?.eventId, speaker]
  );

  const handleOpenSocialLink = useCallback(
    async (label: string, url: string) => {
      try {
        await Linking.openURL(url);
      } catch (nextError) {
        Alert.alert(
          'Unable to open link',
          nextError instanceof Error ? nextError.message : 'Link failed to open.'
        );
      }
    },
    []
  );

  const socialLinks = useMemo(() => (speaker ? getSocialLinks(speaker) : []), [speaker]);

  return (
    <MobilePage
      action={<HeaderActionButton label="Back" onPress={() => router.back()} />}
      subtitle="Speaker profile and event context."
      title="Speaker"
    >
      <View style={styles.contentWrap}>
        {loading && !speaker ? (
          <ScreenState
            mode="loading"
            title="Loading speaker"
            description="Pulling bio, links, and speaking events."
          />
        ) : null}

        {error && !speaker ? (
          <ScreenState
            mode="error"
            title="Speaker unavailable"
            description={error}
            action={
              <HeaderActionButton
                label="Retry"
                onPress={() => {
                  void loadSpeaker();
                }}
              />
            }
          />
        ) : null}

        {speaker ? (
          <>
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: tokens.colors.surface,
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.lg,
                },
              ]}
            >
              <View
                style={[
                  styles.heroHeader,
                  {
                    borderRadius: tokens.radius.lg,
                    backgroundColor: tokens.mode === 'dark' ? '#171B25' : '#1F2430',
                  },
                ]}
              >
                {speaker.photoUrl ? (
                  <ImageBackground
                    source={{ uri: speaker.photoUrl }}
                    style={StyleSheet.absoluteFillObject}
                    imageStyle={{ borderRadius: tokens.radius.lg }}
                  >
                    <LinearGradient
                      colors={['rgba(15, 23, 42, 0.12)', 'rgba(15, 23, 42, 0.7)']}
                      end={{ x: 0.8, y: 1 }}
                      start={{ x: 0.2, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </ImageBackground>
                ) : (
                  <LinearGradient
                    colors={
                      tokens.mode === 'dark'
                        ? ['#161B26', '#232A3B']
                        : ['#232837', '#2F3648']
                    }
                    end={{ x: 1, y: 1 }}
                    start={{ x: 0, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                )}
              </View>

              <View
                style={[
                  styles.avatarWrap,
                  {
                    backgroundColor: tokens.colors.surface,
                    borderRadius: 52,
                    borderColor: tokens.colors.surface,
                  },
                ]}
              >
                <CommunityAvatar avatarUrl={speaker.photoUrl} name={speaker.name} size={88} />
              </View>

              <View style={styles.heroBody}>
                <Text
                  style={{
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 26,
                    lineHeight: 30,
                    fontWeight: '800',
                    letterSpacing: -0.7,
                  }}
                >
                  {speaker.name}
                </Text>
                <Text
                  style={{
                    color: tokens.colors.textSecondary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 15,
                    lineHeight: 21,
                    fontWeight: '600',
                  }}
                >
                  {getSpeakerHeadline(speaker.title, speaker.company)}
                </Text>
                {speaker.bio ? (
                  <Text
                    style={{
                      color: tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                      fontSize: 14,
                      lineHeight: 21,
                      fontWeight: '500',
                    }}
                  >
                    {speaker.bio}
                  </Text>
                ) : null}

                {socialLinks.length > 0 ? (
                  <View style={styles.linkRow}>
                    {socialLinks.map((link) => (
                      <Pressable
                        key={link.label}
                        accessibilityLabel={`Open ${speaker.name} ${link.label}`}
                        accessibilityRole="button"
                        onPress={() => {
                          void handleOpenSocialLink(link.label, link.url);
                        }}
                        style={({ pressed }) => [
                          styles.linkButton,
                          {
                            backgroundColor: tokens.colors.surfaceStrong,
                            borderColor: tokens.colors.border,
                            borderRadius: tokens.radius.pill,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <FontAwesome
                          name={link.icon}
                          size={13}
                          color={tokens.colors.textPrimary}
                        />
                        <Text
                          style={{
                            color: tokens.colors.textPrimary,
                            fontFamily: tokens.typography.sans,
                            fontSize: 13,
                            fontWeight: '700',
                          }}
                        >
                          {link.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                <View
                  style={[
                    styles.followUpCard,
                    {
                      backgroundColor: tokens.colors.surfaceStrong,
                      borderColor: tokens.colors.border,
                      borderRadius: tokens.radius.md,
                    },
                  ]}
                >
                  <View style={styles.followUpCopy}>
                    <Text
                      style={{
                        color: tokens.colors.textPrimary,
                        fontFamily: tokens.typography.sans,
                        fontSize: 15,
                        lineHeight: 20,
                        fontWeight: '800',
                      }}
                    >
                      Networking
                    </Text>
                    <Text
                      style={{
                        color: tokens.colors.textSecondary,
                        fontFamily: tokens.typography.sans,
                        fontSize: 13,
                        lineHeight: 18,
                        fontWeight: '600',
                      }}
                    >
                      {networkingState.status === 'connected'
                        ? 'Confirmed as a real connection.'
                        : networkingState.status === 'requested'
                          ? 'LinkedIn request logged. Confirm once it becomes a real connection.'
                          : 'Track outreach and confirmed connections from this speaker here.'}
                    </Text>
                    {networkingSourceEvent?.eventTitle ? (
                      <Text
                        style={{
                          color: tokens.colors.textTertiary,
                          fontFamily: tokens.typography.sans,
                          fontSize: 12,
                          lineHeight: 16,
                          fontWeight: '600',
                        }}
                      >
                        Source event: {networkingSourceEvent.eventTitle}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.followUpActions}>
                    {speaker.linkedinUrl ? (
                      <View style={styles.followUpAction}>
                        <KureButton
                          variant="secondary"
                          onPress={() => {
                            void handleOpenSocialLink('LinkedIn', speaker.linkedinUrl!);
                          }}
                        >
                          Open LinkedIn
                        </KureButton>
                      </View>
                    ) : null}
                    {networkingState.status !== 'connected' ? (
                      <View style={styles.followUpAction}>
                        <KureButton
                          variant={
                            networkingState.status === 'requested'
                              ? 'secondary'
                              : 'primary'
                          }
                          onPress={() => {
                            void handleNetworkingAction('mark_request_sent');
                          }}
                          disabled={Boolean(networkingActionPending)}
                        >
                          {networkingActionPending === 'request'
                            ? 'Saving...'
                            : 'Mark request sent'}
                        </KureButton>
                      </View>
                    ) : null}
                    <View style={styles.followUpAction}>
                      <KureButton
                        onPress={() => {
                          void handleNetworkingAction('confirm_connection');
                        }}
                        disabled={
                          Boolean(networkingActionPending) ||
                          networkingState.status === 'connected'
                        }
                      >
                        {networkingActionPending === 'confirm'
                          ? 'Saving...'
                          : networkingState.status === 'connected'
                            ? 'Connection confirmed'
                            : 'Confirm connection'}
                      </KureButton>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <CommunitySection
              title="Speaking events"
              meta={`${formatCommunityTabCount(speaker.events.length)} events`}
            >
              <View style={styles.sectionInner}>
                {speaker.events.length > 0 ? (
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
                    {speaker.events.map((event, index) => (
                      <CommunityUpcomingEventRow
                        key={event.id}
                        meta={getSpeakerEventMeta(event.location, event.format, event.isPastEvent)}
                        startTime={event.startTime}
                        title={event.title}
                        showDivider={index < speaker.events.length - 1}
                        onPress={() => router.push(`/event/${event.id}`)}
                      />
                    ))}
                  </View>
                ) : (
                  <ScreenState
                    mode="empty"
                    title="No event context yet"
                    description="Speaking events will appear here when they are available."
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

const styles = StyleSheet.create({
  avatarWrap: {
    position: 'absolute',
    top: 138,
    left: 18,
    padding: 4,
    borderWidth: 1,
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
  followUpAction: {
    width: '100%',
  },
  followUpActions: {
    gap: 10,
  },
  followUpCard: {
    borderWidth: 1,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  followUpCopy: {
    gap: 4,
  },
  heroBody: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 44,
    paddingBottom: 18,
  },
  heroCard: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  heroHeader: {
    height: 196,
    overflow: 'hidden',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 4,
  },
  pressed: {
    opacity: 0.86,
  },
  sectionInner: {
    padding: 16,
    gap: 10,
  },
});
