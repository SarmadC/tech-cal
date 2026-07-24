import { FontAwesome } from '@expo/vector-icons';
import type { MobileEventCard, MobileSpeakerDetail } from '@kurecal/domain';
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
import { ScreenState } from '../../src/components/chrome/ScreenState';
import { DiscoverEventCard } from '../../src/components/discover/DiscoverEventCard';
import {
  formatCommunityTabCount,
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

function buildSpeakerInitials(name: string | null | undefined): string {
  const parts = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'SP';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function getNetworkingSectionCopy(
  networkingState: NonNullable<MobileSpeakerDetail['networkingState']>
): string {
  if (networkingState.status === 'connected') {
    return 'Connection confirmed on LinkedIn.';
  }

  if (networkingState.status === 'requested') {
    return 'Waiting for connection acceptance.';
  }

  return 'Track LinkedIn request status.';
}

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

  if (normalized === 'hybrid') {
    return 'hybrid';
  }

  return null;
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
    formatLabel: format
      ? undefined
      : event.format?.trim() || undefined,
  };
}

function getPrimaryNetworkingAction(
  networkingState: NonNullable<MobileSpeakerDetail['networkingState']>
): {
  action: 'mark_request_sent' | 'confirm_connection';
  label: string;
  pendingLabel: string;
  pendingState: 'request' | 'confirm';
} | null {
  if (networkingState.status === 'none') {
    return {
      action: 'mark_request_sent',
      label: 'Mark LinkedIn request sent',
      pendingLabel: 'Saving...',
      pendingState: 'request',
    };
  }

  if (networkingState.status === 'requested') {
    return {
      action: 'confirm_connection',
      label: 'Mark connected',
      pendingLabel: 'Saving...',
      pendingState: 'confirm',
    };
  }

  return null;
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

function getNetworkingStatusTone(
  status: NonNullable<MobileSpeakerDetail['networkingState']>['status'],
  mode: 'light' | 'dark'
) {
  if (status === 'connected') {
    return mode === 'dark'
      ? {
          background: 'rgba(34, 197, 94, 0.16)',
          border: 'rgba(34, 197, 94, 0.34)',
          text: '#BBF7D0',
        }
      : {
          background: 'rgba(34, 197, 94, 0.08)',
          border: 'rgba(34, 197, 94, 0.24)',
          text: '#166534',
        };
  }

  if (status === 'requested') {
    return mode === 'dark'
      ? {
          background: 'rgba(251, 191, 36, 0.16)',
          border: 'rgba(251, 191, 36, 0.32)',
          text: '#FDE68A',
        }
      : {
          background: 'rgba(245, 158, 11, 0.09)',
          border: 'rgba(245, 158, 11, 0.22)',
          text: '#92400E',
        };
  }

  return mode === 'dark'
    ? {
        background: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.22)',
        text: '#CBD5E1',
      }
    : {
        background: 'rgba(148, 163, 184, 0.1)',
        border: 'rgba(148, 163, 184, 0.18)',
        text: '#475569',
      };
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
    'request' | 'confirm' | 'clear' | 'clear_connection' | null
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
  const primaryNetworkingAction = getPrimaryNetworkingAction(networkingState);
  const networkingStatusTone = getNetworkingStatusTone(
    networkingState.status,
    tokens.mode
  );

  const handleNetworkingAction = useCallback(
    async (
      action:
        | 'mark_request_sent'
        | 'confirm_connection'
        | 'clear_request'
        | 'clear_connection'
    ) => {
      if (!speaker || networkingActionPending) {
        return;
      }

      setNetworkingActionPending(
        action === 'mark_request_sent'
          ? 'request'
          : action === 'confirm_connection'
            ? 'confirm'
            : action === 'clear_request'
              ? 'clear'
              : 'clear_connection'
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
            : action === 'confirm_connection'
              ? 'Unable to confirm connection'
              : action === 'clear_request'
                ? 'Unable to clear request'
                : 'Unable to clear connection',
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
      headerHidden
      showAccentGlow={false}
      title={speaker?.name ?? 'Speaker'}
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
                  borderColor: tokens.colors.divider,
                  borderRadius: tokens.radius.lg,
                  shadowColor: tokens.shadow.shadowColor,
                  shadowOpacity: tokens.mode === 'dark' ? 0.18 : 0.08,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 14 },
                  elevation: 5,
                },
              ]}
            >
              {speaker.photoUrl ? (
                <ImageBackground
                  source={{ uri: speaker.photoUrl }}
                  style={styles.heroMedia}
                  imageStyle={{ borderRadius: tokens.radius.lg }}
                >
                  <LinearGradient
                    colors={[
                      'rgba(10, 15, 24, 0.02)',
                      'rgba(10, 15, 24, 0.12)',
                      'rgba(10, 15, 24, 0.46)',
                      'rgba(10, 15, 24, 0.72)',
                    ]}
                    locations={[0, 0.5, 0.78, 1]}
                    style={StyleSheet.absoluteFillObject}
                  />
                </ImageBackground>
              ) : (
                <View style={styles.heroMedia}>
                  <LinearGradient
                    colors={
                      tokens.mode === 'dark'
                        ? ['#0F172A', '#162033', '#1E293B']
                        : ['#F5F7F8', '#E8EFF2', '#DDE7EC']
                    }
                    end={{ x: 1, y: 1 }}
                    start={{ x: 0, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View
                    style={[
                      styles.fallbackOrbLarge,
                      {
                        backgroundColor:
                          tokens.mode === 'dark'
                            ? 'rgba(255,255,255,0.05)'
                            : 'rgba(255,255,255,0.64)',
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.fallbackOrbSmall,
                      {
                        backgroundColor:
                          tokens.mode === 'dark'
                            ? 'rgba(148, 163, 184, 0.1)'
                            : 'rgba(191, 219, 254, 0.4)',
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.fallbackMonogram,
                      {
                        backgroundColor:
                          tokens.mode === 'dark'
                            ? 'rgba(15, 23, 42, 0.4)'
                            : 'rgba(255, 255, 255, 0.46)',
                        borderColor:
                          tokens.mode === 'dark'
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(255,255,255,0.38)',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          tokens.mode === 'dark'
                            ? 'rgba(255,255,255,0.92)'
                            : '#1E293B',
                        fontFamily: tokens.typography.sans,
                        fontSize: 38,
                        lineHeight: 42,
                        fontWeight: '800',
                        letterSpacing: -1.2,
                      }}
                    >
                      {buildSpeakerInitials(speaker.name)}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.heroTopRow}>
                <Pressable
                  accessibilityLabel="Back"
                  accessibilityRole="button"
                  hitSlop={12}
                  onPress={() => router.back()}
                  style={({ pressed }) => [
                    styles.heroBackButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <FontAwesome
                    name="angle-left"
                    size={20}
                    color={speaker.photoUrl ? '#FFFFFF' : tokens.colors.textPrimary}
                  />
                </Pressable>
              </View>

              <View style={styles.heroOverlay}>
                <Text
                  style={[
                    styles.heroName,
                    {
                      color: speaker.photoUrl ? '#FFFFFF' : tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  {speaker.name}
                </Text>
                <Text
                  style={{
                    color: speaker.photoUrl
                      ? 'rgba(255,255,255,0.86)'
                      : tokens.colors.textSecondary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 18,
                    lineHeight: 24,
                    fontWeight: '700',
                  }}
                >
                  {getSpeakerHeadline(speaker.title, speaker.company)}
                </Text>
                {speaker.bio ? (
                  <Text
                    numberOfLines={2}
                    style={{
                      color: speaker.photoUrl
                        ? 'rgba(255,255,255,0.84)'
                        : tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                      fontSize: 15,
                      lineHeight: 22,
                      fontWeight: '500',
                    }}
                  >
                    {speaker.bio}
                  </Text>
                ) : null}
                {socialLinks.length > 0 ? (
                  <View style={styles.heroFooterRow}>
                    <View style={styles.heroLinkRow}>
                      {socialLinks.map((link) => (
                        <Pressable
                          key={link.label}
                          accessibilityLabel={`Open ${speaker.name} ${link.label}`}
                          accessibilityRole="button"
                          onPress={() => {
                            void handleOpenSocialLink(link.label, link.url);
                          }}
                          style={({ pressed }) => [
                            styles.heroLinkButton,
                            {
                              backgroundColor: speaker.photoUrl
                                ? 'rgba(255,255,255,0.72)'
                                : tokens.colors.surfaceStrong,
                              borderColor: speaker.photoUrl
                                ? 'rgba(255,255,255,0.56)'
                                : tokens.colors.divider,
                              borderRadius: tokens.radius.pill,
                            },
                            pressed && styles.pressed,
                          ]}
                        >
                          <FontAwesome
                            name={link.icon}
                            size={12}
                            color="#334155"
                          />
                          <Text
                            style={{
                              color: '#0F172A',
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
                  </View>
                ) : null}
              </View>
            </View>

            <View
              style={[
                styles.openSection,
                styles.connectionSection,
                { borderColor: tokens.colors.divider },
              ]}
            >
              <View style={styles.connectionTitleBlock}>
                <Text
                  style={{
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 15,
                    lineHeight: 20,
                    fontWeight: '600',
                  }}
                >
                  Connection
                </Text>
                <Text
                  style={{
                    color: tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 12,
                    lineHeight: 16,
                    fontWeight: '400',
                  }}
                >
                  Status: {networkingState.status === 'connected'
                    ? 'Connected'
                    : networkingState.status === 'requested'
                      ? 'Request sent'
                      : 'Not contacted'}
                </Text>
              </View>

              <Text
                style={{
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 14,
                  lineHeight: 20,
                  fontWeight: '400',
                }}
              >
                {getNetworkingSectionCopy(networkingState)}
              </Text>

              {networkingState.status === 'connected' ? (
                <View style={styles.connectionResolvedRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={Boolean(networkingActionPending)}
                    onPress={() => {
                      void handleNetworkingAction('clear_connection');
                    }}
                    style={({ pressed }) => [
                      styles.undoActionInline,
                      pressed && styles.pressed,
                      networkingActionPending && styles.disabledAction,
                    ]}
                  >
                    <Text
                      style={{
                        color: tokens.colors.textSecondary,
                        fontFamily: tokens.typography.sans,
                        fontSize: 13,
                        lineHeight: 18,
                        fontWeight: '600',
                      }}
                    >
                      {networkingActionPending === 'clear_connection'
                        ? 'Undoing...'
                        : 'Undo'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View
                style={[
                  styles.connectionActions,
                  networkingState.status === 'connected'
                    ? styles.connectionActionsCompact
                    : null,
                ]}
              >
                {primaryNetworkingAction ? (
                  <View style={styles.connectionPrimaryAction}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void handleNetworkingAction(primaryNetworkingAction.action);
                      }}
                      disabled={Boolean(networkingActionPending)}
                      style={({ pressed }) => [
                        styles.primaryActionButton,
                        {
                          backgroundColor: tokens.colors.pillActive,
                          borderColor: tokens.colors.pillActive,
                          borderRadius: tokens.radius.sm,
                        },
                        pressed && styles.pressed,
                        networkingActionPending && styles.disabledAction,
                      ]}
                    >
                      <Text
                        style={{
                          color: tokens.colors.pillActiveText,
                          fontFamily: tokens.typography.sans,
                          fontSize: 13,
                          lineHeight: 16,
                          fontWeight: '600',
                        }}
                      >
                        {networkingActionPending ===
                        primaryNetworkingAction.pendingState
                          ? primaryNetworkingAction.pendingLabel
                          : primaryNetworkingAction.label}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
                {networkingState.status === 'requested' ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={Boolean(networkingActionPending)}
                    onPress={() => {
                      void handleNetworkingAction('clear_request');
                    }}
                    style={({ pressed }) => [
                      styles.undoAction,
                      pressed && styles.pressed,
                      networkingActionPending && styles.disabledAction,
                    ]}
                  >
                    <FontAwesome
                      name="undo"
                      size={12}
                      color={tokens.colors.textSecondary}
                    />
                    <Text
                      style={{
                        color: tokens.colors.textSecondary,
                        fontFamily: tokens.typography.sans,
                        fontSize: 13,
                        lineHeight: 18,
                        fontWeight: '700',
                      }}
                    >
                      {networkingActionPending === 'clear'
                        ? 'Undoing...'
                        : 'Undo'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View
              style={[
                styles.openSection,
                styles.eventsSection,
                { borderColor: tokens.colors.divider },
              ]}
            >
              <View style={styles.eventsHeader}>
                <Text
                  style={{
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 18,
                    lineHeight: 24,
                    fontWeight: '600',
                  }}
                >
                  {speaker.events.length > 1 ? 'Speaking sessions' : 'Upcoming session'}
                </Text>
                {speaker.events.length > 1 ? (
                  <Text
                    style={{
                      color: tokens.colors.textTertiary,
                      fontFamily: tokens.typography.sans,
                      fontSize: 12,
                      lineHeight: 16,
                      fontWeight: '400',
                    }}
                  >
                    {formatCommunityTabCount(speaker.events.length)}
                  </Text>
                ) : null}
              </View>

              <View style={styles.eventsBody}>
                {speaker.events.length > 0 ? (
                  speaker.events.map((event, index) => (
                    <DiscoverEventCard
                      key={event.id}
                      accessibilityLabel={`Open event ${event.title}`}
                      event={toSpeakerDiscoverEventCard(event)}
                      onPress={() => router.push(`/event/${event.id}`)}
                      showDivider={index < speaker.events.length - 1}
                      showSavedIndicator={false}
                    />
                  ))
                ) : (
                  <ScreenState
                    mode="empty"
                    title="No event context yet"
                    description="Speaking events will appear here when they are available."
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
  contentWrap: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    gap: 12,
  },
  eventsBody: {
    gap: 0,
    paddingHorizontal: 0,
  },
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 8,
  },
  eventsSection: {
    paddingBottom: 4,
  },
  fallbackMonogram: {
    position: 'absolute',
    left: 30,
    top: 116,
    width: 124,
    height: 124,
    borderRadius: 124,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackOrbLarge: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 320,
    right: -40,
    top: 10,
  },
  fallbackOrbSmall: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 180,
    left: -18,
    bottom: 120,
  },
  heroCard: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  heroFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  heroLinkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroMetaChip: {
    maxWidth: '72%',
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    justifyContent: 'center',
  },
  heroMedia: {
    minHeight: 500,
  },
  heroName: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1.4,
  },
  heroOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    gap: 12,
  },
  heroTopRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },
  heroBackButton: {
    alignItems: 'center',
    borderRadius: 4,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  connectionActions: {
    gap: 8,
    marginTop: 4,
  },
  connectionActionsCompact: {
    gap: 0,
    minHeight: 0,
  },
  connectionPrimaryAction: {
    width: '100%',
  },
  connectionResolvedRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-start',
    gap: 12,
  },
  connectionSection: {
    gap: 6,
  },
  connectionTitleBlock: {
    gap: 1,
  },
  primaryActionButton: {
    minHeight: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  disabledAction: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.86,
  },
  openSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  undoAction: {
    alignSelf: 'flex-start',
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  undoActionInline: {
    minHeight: 20,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
});
