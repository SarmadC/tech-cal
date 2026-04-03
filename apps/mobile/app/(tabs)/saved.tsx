import { useCallback, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MobileSavedEventsFeed } from '@kurecal/domain';

import { EventSummaryCard } from '../../src/components/EventSummaryCard';
import { ScreenStateView } from '../../src/components/ScreenStateView';
import { loadMobileSavedEvents } from '../../src/lib/mobileApi';

export default function SavedScreen() {
  const [feed, setFeed] = useState<MobileSavedEventsFeed | null>(null);
  const [events, setEvents] = useState<MobileSavedEventsFeed['events']>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSaved = useCallback(
    async (page = 1, mode: 'initial' | 'more' | 'refresh' = 'initial') => {
      if (mode === 'more') {
        setLoadingMore(true);
      } else if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const nextFeed = await loadMobileSavedEvents(page);
        setFeed(nextFeed);
        setEvents((current) =>
          mode === 'more' ? [...current, ...nextFeed.events] : nextFeed.events
        );
        setError(null);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load saved events'
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void loadSaved(1);
    }, [loadSaved])
  );

  const header = feed?.header ?? {
    eyebrow: 'Saved',
    title: 'Your shortlist',
    subtitle: 'Events you bookmarked on mobile',
  };

  if (loading && events.length === 0) {
    return (
      <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Loading saved events"
              description="Pulling the events you bookmarked and tracked."
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error && events.length === 0) {
    return (
      <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="error"
              title="Saved events unavailable"
              description={error}
              onRetry={() => {
                void loadSaved(1);
              }}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadSaved(1, 'refresh');
              }}
              tintColor="#2dd4bf"
            />
          }
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>{header.eyebrow}</Text>
            <Text style={styles.title}>{header.title}</Text>
            {header.subtitle ? (
              <Text style={styles.subtitle}>{header.subtitle}</Text>
            ) : null}
            <Text style={styles.meta}>
              {feed?.totalCount ?? events.length} saved event
              {(feed?.totalCount ?? events.length) === 1 ? '' : 's'}
            </Text>
          </View>

          {error ? <Text style={styles.inlineError}>{error}</Text> : null}

          {events.length > 0 ? (
            <View style={styles.stack}>
              {events.map((event) => (
                <EventSummaryCard
                  key={event.id}
                  event={event}
                  onPress={() =>
                    router.push({
                      pathname: '../event/[id]',
                      params: { id: event.id },
                    })
                  }
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <ScreenStateView
                mode="empty"
                title="Nothing saved yet"
                description="Open an event from Discover and save it to build your shortlist."
              />
              <Pressable
                onPress={() => router.push('./discover')}
                style={({ pressed }) => [
                  styles.primaryAction,
                  pressed ? styles.primaryActionPressed : null,
                ]}
              >
                <Text style={styles.primaryActionLabel}>Browse discover</Text>
              </Pressable>
            </View>
          )}

          {feed?.nextPage ? (
            <Pressable
              onPress={() => {
                void loadSaved(feed.nextPage!, 'more');
              }}
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed ? styles.secondaryActionPressed : null,
              ]}
            >
              <Text style={styles.secondaryActionLabel}>
                {loadingMore ? 'Loading…' : 'Load more saved events'}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    padding: 22,
  },
  emptyWrap: {
    gap: 14,
  },
  eyebrow: {
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  gradient: {
    flex: 1,
  },
  hero: {
    gap: 10,
  },
  inlineError: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#2dd4bf',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 16,
  },
  primaryActionLabel: {
    color: '#042f2e',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryActionPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  safeArea: {
    flex: 1,
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 16,
  },
  secondaryActionLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionPressed: {
    opacity: 0.88,
  },
  stack: {
    gap: 14,
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 38,
  },
});
