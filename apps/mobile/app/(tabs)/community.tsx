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

import type { MobileCommunityHome } from '@kurecal/domain';

import { CommunityFeedCard } from '../../src/components/CommunityFeedCard';
import { ScreenStateView } from '../../src/components/ScreenStateView';
import {
  formatCompactCount,
  formatCommunityRelativeTime,
} from '../../src/lib/communityPresentation';
import { loadMobileCommunityHome } from '../../src/lib/mobileApi';

export default function CommunityScreen() {
  const [data, setData] = useState<MobileCommunityHome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCommunity = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const nextData = await loadMobileCommunityHome();
        setData(nextData);
        setError(null);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load community'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void loadCommunity();
    }, [loadCommunity])
  );

  if (loading && !data) {
    return (
      <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Loading community"
              description="Pulling the latest circle conversations and upcoming moments."
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
              title="Community unavailable"
              description={error}
              onRetry={() => {
                void loadCommunity();
              }}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const header = data?.header ?? {
    eyebrow: 'Community',
    title: 'Stay close to your circles',
    subtitle: 'Recent conversations and upcoming moments',
  };

  return (
    <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadCommunity('refresh');
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
          </View>

          {error ? <Text style={styles.inlineError}>{error}</Text> : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Circles</Text>
              <Text style={styles.sectionTitle}>Your rooms</Text>
            </View>

            {data?.circles.length ? (
              <View style={styles.stack}>
                {data.circles.map((circle) => (
                  <Pressable
                    key={circle.id}
                    onPress={() =>
                      router.push({
                        pathname: '../community/[slug]',
                        params: { slug: circle.slug },
                      })
                    }
                    style={({ pressed }) => [
                      styles.circleCard,
                      pressed ? styles.cardPressed : null,
                    ]}
                  >
                    <View style={styles.circleHeader}>
                      <Text style={styles.circleName}>{circle.name}</Text>
                      {circle.isJoined ? (
                        <View style={styles.joinedPill}>
                          <Text style={styles.joinedLabel}>Joined</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.circleDescription}>{circle.description}</Text>
                    <Text style={styles.circleMeta}>
                      {formatCompactCount(circle.memberCount)} members
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <ScreenStateView
                mode="empty"
                title="No circles yet"
                description="Join a circle to keep its conversations and event moments close."
              />
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Feed</Text>
              <Text style={styles.sectionTitle}>Recent conversations</Text>
            </View>

            {data?.feed.length ? (
              <View style={styles.stack}>
                {data.feed.map((post) => (
                  <CommunityFeedCard
                    key={post.id}
                    post={post}
                    onPress={() =>
                      router.push({
                        pathname: '../community/[slug]/post/[postId]',
                        params: { slug: post.circle.slug, postId: post.id },
                      })
                    }
                  />
                ))}
              </View>
            ) : (
              <ScreenStateView
                mode="empty"
                title="No posts yet"
                description="The newest circle threads will show up here once the community starts moving."
              />
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Upcoming</Text>
              <Text style={styles.sectionTitle}>Moments around your community</Text>
            </View>

            {data?.upcomingEvents.length ? (
              <View style={styles.stack}>
                {data.upcomingEvents.map((event) => (
                  <Pressable
                    key={event.id}
                    onPress={() =>
                      router.push({
                        pathname: '../event/[id]',
                        params: { id: event.id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.eventCard,
                      pressed ? styles.cardPressed : null,
                    ]}
                  >
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventMeta}>
                      {formatCommunityRelativeTime(event.startTime)} •{' '}
                      {event.location || event.format || 'Online'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <ScreenStateView
                mode="empty"
                title="No upcoming community moments"
                description="Save a few events or join circles and upcoming moments will show here."
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  circleCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  circleDescription: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  circleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  circleMeta: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  circleName: {
    color: '#f8fafc',
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    gap: 18,
    padding: 22,
  },
  eventCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  eventMeta: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  eventTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
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
  joinedLabel: {
    color: '#ccfbf1',
    fontSize: 11,
    fontWeight: '700',
  },
  joinedPill: {
    backgroundColor: 'rgba(45, 212, 191, 0.16)',
    borderColor: 'rgba(45, 212, 191, 0.3)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  safeArea: {
    flex: 1,
  },
  section: {
    gap: 14,
  },
  sectionEyebrow: {
    color: '#2dd4bf',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    gap: 6,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
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
    letterSpacing: -0.8,
  },
});
