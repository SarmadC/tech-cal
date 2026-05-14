import { useCallback, useState } from 'react';
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateWrap}>
          <ScreenStateView
            mode="loading"
            title="Loading community"
            description="Pulling the latest circle conversations and upcoming moments."
          />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
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
    );
  }

  const header = data?.header ?? {
    eyebrow: 'Community',
    title: 'Stay close to your circles',
    subtitle: 'Recent conversations and upcoming moments',
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadCommunity('refresh');
            }}
            tintColor={colors.accent}
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
                    {formatCommunityRelativeTime(event.startTime)} ·{' '}
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
  );
}

const styles = StyleSheet.create({
  cardPressed: {
    opacity: 0.84,
  },
  circleCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  circleDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  circleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  circleMeta: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  circleName: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 19,
  },
  content: {
    gap: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
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
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.66,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  hero: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 6,
    paddingBottom: 12,
  },
  inlineError: {
    backgroundColor: colors.surfaceHigh,
    borderColor: 'rgba(255, 180, 171, 0.22)',
    borderRadius: 4,
    borderWidth: 1,
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  joinedLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  joinedPill: {
    backgroundColor: 'rgba(189, 194, 255, 0.08)',
    borderColor: colors.borderStrong,
    borderRadius: 2,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 29,
  },
});
