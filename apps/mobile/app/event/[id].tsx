import { useEffect, useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MobileEventDetail } from '@kurecal/domain';

import { ScreenStateView } from '../../src/components/ScreenStateView';
import {
  loadMobileEventDetail,
  updateMobileEventEngagement,
} from '../../src/lib/mobileApi';

function formatDateTime(value: string, timezone?: string | null) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone ?? undefined,
  });
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const [data, setData] = useState<MobileEventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadDetail(mode: 'initial' | 'refresh' = 'initial') {
    if (!eventId) {
      setError('Event id is missing');
      setLoading(false);
      return;
    }

    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextData = await loadMobileEventDetail(eventId);
      setData(nextData);
      setError(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load event detail'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [eventId]);

  async function openUrl(url: string | null | undefined) {
    if (!url) {
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (nextError) {
      Alert.alert(
        'Unable to open link',
        nextError instanceof Error ? nextError.message : 'Link failed to open.'
      );
    }
  }

  async function toggleSavedState() {
    if (!data || saving) {
      return;
    }

    const nextValue = !(data.event.engagement?.isBookmarked ?? false);
    setSaving(true);

    try {
      const engagement = await updateMobileEventEngagement(event.id, {
        isBookmarked: nextValue,
      });

      setData((current) =>
        current
          ? {
              ...current,
              event: {
                ...current.event,
                engagement,
              },
            }
          : current
      );
    } catch (nextError) {
      Alert.alert(
        'Unable to update saved state',
        nextError instanceof Error
          ? nextError.message
          : 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  const agendaDays = useMemo(() => {
    const grouped = new Map<number, NonNullable<MobileEventDetail['agenda']>>();

    for (const item of data?.agenda ?? []) {
      const current = grouped.get(item.dayNumber) ?? [];
      current.push(item);
      grouped.set(item.dayNumber, current);
    }

    return Array.from(grouped.entries()).sort((left, right) => left[0] - right[0]);
  }, [data?.agenda]);

  if (loading && !data) {
    return (
      <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Loading event"
              description="Pulling the event details, agenda, and speaker lineup."
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error && !data) {
    return (
      <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="error"
              title="Event unavailable"
              description={error}
              onRetry={() => {
                void loadDetail();
              }}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const detail = data;
  if (!detail) {
    return null;
  }

  const event = detail.event;
  const badges = [
    ...(event.metaLabel ? [event.metaLabel] : []),
    ...(event.formatLabel ? [event.formatLabel] : []),
    ...(event.priceLabel ? [event.priceLabel] : []),
    ...(event.engagement?.isBookmarked ? ['Saved'] : []),
    ...(event.engagement?.status ? [event.engagement.status] : []),
  ];

  return (
    <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadDetail('refresh');
              }}
              tintColor="#2dd4bf"
            />
          }
        >
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed ? styles.backButtonPressed : null,
              ]}
            >
              <Text style={styles.backLabel}>Back</Text>
            </Pressable>
            <Text style={styles.headerEyebrow}>Event detail</Text>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.timeMeta}>
              {formatDateTime(event.startTime, event.timezone)}
              {event.endTime
                ? ` · ${formatDateTime(event.endTime, event.timezone)}`
                : ''}
            </Text>
            {event.location ? (
              <Text style={styles.location}>{event.location}</Text>
            ) : null}
            {detail.host?.name ? (
              <Text style={styles.host}>Hosted by {detail.host.name}</Text>
            ) : null}

            {badges.length > 0 ? (
              <View style={styles.badges}>
                {badges.map((badge) => (
                  <View key={badge} style={styles.badge}>
                    <Text style={styles.badgeLabel}>{badge}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <Pressable
                onPress={() => {
                  void toggleSavedState();
                }}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed ? styles.secondaryActionPressed : null,
                ]}
              >
                <Text style={styles.secondaryActionLabel}>
                  {saving
                    ? 'Updating…'
                    : event.engagement?.isBookmarked
                      ? 'Unsave event'
                      : 'Save event'}
                </Text>
              </Pressable>
              {event.registrationUrl ? (
                <Pressable
                  onPress={() => {
                    void openUrl(event.registrationUrl);
                  }}
                  style={({ pressed }) => [
                    styles.primaryAction,
                    pressed ? styles.primaryActionPressed : null,
                  ]}
                >
                  <Text style={styles.primaryActionLabel}>Open registration</Text>
                </Pressable>
              ) : null}
              {event.sourceUrl ? (
                <Pressable
                  onPress={() => {
                    void openUrl(event.sourceUrl);
                  }}
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    pressed ? styles.secondaryActionPressed : null,
                  ]}
                >
                  <Text style={styles.secondaryActionLabel}>Open source page</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {event.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Overview</Text>
              <Text style={styles.sectionTitle}>Why this event matters</Text>
              <Text style={styles.bodyCopy}>{event.description}</Text>
            </View>
          ) : null}

          {detail.tags?.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Tags</Text>
              <Text style={styles.sectionTitle}>Focus areas</Text>
              <View style={styles.badges}>
                {detail.tags.map((tag) => (
                  <View key={tag} style={styles.tagBadge}>
                    <Text style={styles.tagLabel}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {detail.speakerLineup?.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Speakers</Text>
              <Text style={styles.sectionTitle}>Who is on stage</Text>
              <View style={styles.stack}>
                {detail.speakerLineup.map((speaker) => (
                  <View key={speaker.id} style={styles.infoCard}>
                    <Text style={styles.infoTitle}>{speaker.name}</Text>
                    <Text style={styles.infoMeta}>
                      {[speaker.title, speaker.company].filter(Boolean).join(' · ') ||
                        'Speaker'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {agendaDays.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Agenda</Text>
              <Text style={styles.sectionTitle}>What the event day looks like</Text>
              <View style={styles.stack}>
                {agendaDays.map(([dayNumber, items]) => (
                  <View key={String(dayNumber)} style={styles.dayGroup}>
                    <Text style={styles.dayLabel}>Day {dayNumber}</Text>
                    {items.map((item) => (
                      <View key={item.id} style={styles.infoCard}>
                        <Text style={styles.infoTitle}>{item.title}</Text>
                        <Text style={styles.infoMeta}>
                          {formatDateTime(item.startTime, event.timezone)}
                          {item.location ? ` · ${item.location}` : ''}
                        </Text>
                        {item.description ? (
                          <Text style={styles.bodyCopy}>{item.description}</Text>
                        ) : null}
                        {item.speakers.length ? (
                          <Text style={styles.infoMeta}>
                            {item.speakers.map((speaker) => speaker.name).join(', ')}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  backButton: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.24)',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 76,
    paddingHorizontal: 14,
  },
  backButtonPressed: {
    opacity: 0.92,
  },
  backLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    borderColor: 'rgba(45, 212, 191, 0.18)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeLabel: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bodyCopy: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },
  content: {
    gap: 18,
    padding: 22,
  },
  dayGroup: {
    gap: 10,
  },
  dayLabel: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  gradient: {
    flex: 1,
  },
  header: {
    gap: 10,
  },
  headerEyebrow: {
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  heroCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.9)',
    borderColor: 'rgba(45, 212, 191, 0.18)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  host: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  infoMeta: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  infoTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  location: {
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '500',
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#2dd4bf',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryActionLabel: {
    color: '#042f2e',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryActionPressed: {
    opacity: 0.92,
  },
  safeArea: {
    flex: 1,
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.24)',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  secondaryActionLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionPressed: {
    opacity: 0.92,
  },
  section: {
    gap: 12,
  },
  sectionEyebrow: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  stack: {
    gap: 12,
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  tagBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.18)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagLabel: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '600',
  },
  timeMeta: {
    color: '#99f6e4',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.9,
    lineHeight: 36,
  },
});
