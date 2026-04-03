import { useCallback, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MobileCommunityCirclePage } from '@kurecal/domain';

import { CommunityFeedCard } from '../../src/components/CommunityFeedCard';
import { ScreenStateView } from '../../src/components/ScreenStateView';
import {
  countCommunityComments,
  formatCompactCount,
  formatCommunityRelativeTime,
} from '../../src/lib/communityPresentation';
import {
  createMobileCommunityPost,
  joinMobileCommunityCircle,
  leaveMobileCommunityCircle,
  loadMobileCommunityCircle,
} from '../../src/lib/mobileApi';

export default function CommunityCircleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string | string[] }>();
  const circleSlug = Array.isArray(slug) ? slug[0] : slug;
  const [data, setData] = useState<MobileCommunityCirclePage | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);

  const loadCircle = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!circleSlug) {
        setError('Circle slug is missing');
        setLoading(false);
        return;
      }

      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const nextData = await loadMobileCommunityCircle(circleSlug);
        setData(nextData);
        setError(null);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load circle'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [circleSlug]
  );

  useFocusEffect(
    useCallback(() => {
      void loadCircle();
    }, [loadCircle])
  );

  async function handleToggleMembership() {
    if (!data || working) {
      return;
    }

    setWorking(true);

    try {
      if (data.isJoined) {
        await leaveMobileCommunityCircle(data.circle.id);
      } else {
        await joinMobileCommunityCircle(data.circle.id);
      }

      await loadCircle('refresh');
    } catch (nextError) {
      Alert.alert(
        data.isJoined ? 'Leave failed' : 'Join failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to update membership.'
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleCreatePost() {
    if (!data || !draft.trim() || working) {
      return;
    }

    setWorking(true);

    try {
      await createMobileCommunityPost({
        circleId: data.circle.id,
        circleSlug: data.circle.slug,
        content: draft,
      });
      setDraft('');
      await loadCircle('refresh');
    } catch (nextError) {
      Alert.alert(
        'Post failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to publish post.'
      );
    } finally {
      setWorking(false);
    }
  }

  if (loading && !data) {
    return (
      <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Loading circle"
              description="Pulling the latest posts, members, and upcoming moments."
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
              title="Circle unavailable"
              description={error}
              onRetry={() => {
                void loadCircle();
              }}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const header = data?.header ?? {
    eyebrow: 'Circle',
    title: 'Community circle',
    subtitle: 'Discussion room',
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
                void loadCircle('refresh');
              }}
              tintColor="#2dd4bf"
            />
          }
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed ? styles.cardPressed : null,
              ]}
            >
              <Text style={styles.backLabel}>Back</Text>
            </Pressable>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>{header.eyebrow}</Text>
            <Text style={styles.title}>{header.title}</Text>
            {header.subtitle ? (
              <Text style={styles.subtitle}>{header.subtitle}</Text>
            ) : null}
          </View>

          {error ? <Text style={styles.inlineError}>{error}</Text> : null}

          <View style={styles.heroCard}>
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>
                  {formatCompactCount(data?.circle.memberCount ?? 0)}
                </Text>
                <Text style={styles.metricLabel}>Members</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>
                  {formatCompactCount(data?.posts.length ?? 0)}
                </Text>
                <Text style={styles.metricLabel}>Threads</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>
                  {formatCompactCount(data?.upcomingEvents.length ?? 0)}
                </Text>
                <Text style={styles.metricLabel}>Upcoming</Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                void handleToggleMembership();
              }}
              style={({ pressed }) => [
                styles.primaryAction,
                pressed ? styles.cardPressed : null,
              ]}
            >
              <Text style={styles.primaryActionLabel}>
                {working
                  ? 'Working...'
                  : data?.isJoined
                    ? 'Leave circle'
                    : 'Join circle'}
              </Text>
            </Pressable>
          </View>

          {data?.isJoined ? (
            <View style={styles.composerCard}>
              <Text style={styles.sectionTitle}>Start a thread</Text>
              <TextInput
                multiline
                value={draft}
                onChangeText={setDraft}
                placeholder={`Share something with ${data.circle.name}`}
                placeholderTextColor="#64748b"
                style={styles.input}
              />
              <Pressable
                onPress={() => {
                  void handleCreatePost();
                }}
                style={({ pressed }) => [
                  styles.primaryAction,
                  (!draft.trim() || working) ? styles.disabledAction : null,
                  pressed ? styles.cardPressed : null,
                ]}
                disabled={!draft.trim() || working}
              >
                <Text style={styles.primaryActionLabel}>
                  {working ? 'Publishing...' : 'Publish post'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScreenStateView
              mode="empty"
              title="Join to post"
              description="You can browse the circle now. Join it to start threads and reply."
            />
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Discussions</Text>
              <Text style={styles.sectionTitle}>Latest threads</Text>
            </View>

            {data?.posts.length ? (
              <View style={styles.stack}>
                {data.posts.map((post) => (
                  <CommunityFeedCard
                    key={post.id}
                    showCircle={false}
                    post={{
                      id: post.id,
                      content: post.content,
                      createdAt: post.createdAt,
                      author: post.author,
                      circle: {
                        slug: data.circle.slug,
                        name: data.circle.name,
                      },
                      commentCount: countCommunityComments(post.comments),
                      isTrending: countCommunityComments(post.comments) >= 8,
                    }}
                    onPress={() =>
                      router.push({
                        pathname: './post/[postId]',
                        params: { slug: data.circle.slug, postId: post.id },
                      })
                    }
                  />
                ))}
              </View>
            ) : (
              <ScreenStateView
                mode="empty"
                title="No discussions yet"
                description="Be the first member to start a conversation in this circle."
              />
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Members</Text>
              <Text style={styles.sectionTitle}>People in this circle</Text>
            </View>

            {data?.members.length ? (
              <View style={styles.stack}>
                {data.members.slice(0, 8).map((member) => (
                  <View key={member.id} style={styles.memberRow}>
                    <Text style={styles.memberName}>
                      {member.fullName || member.username || 'Community member'}
                    </Text>
                    {member.headline ? (
                      <Text style={styles.memberHeadline}>{member.headline}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <ScreenStateView
                mode="empty"
                title="No member preview yet"
                description="Member previews will show up here once the circle has active members."
              />
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Upcoming</Text>
              <Text style={styles.sectionTitle}>Related events</Text>
            </View>

            {data?.upcomingEvents.length ? (
              <View style={styles.stack}>
                {data.upcomingEvents.map((event) => (
                  <Pressable
                    key={event.id}
                    onPress={() =>
                      router.push({
                        pathname: '../../event/[id]',
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
                      {event.location || 'Online'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <ScreenStateView
                mode="empty"
                title="No upcoming circle moments"
                description="As matching events appear, they will show up here."
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 72,
    paddingHorizontal: 14,
  },
  backLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  composerCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  content: {
    gap: 18,
    padding: 22,
  },
  disabledAction: {
    opacity: 0.5,
  },
  eventCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  eventMeta: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  eventTitle: {
    color: '#f8fafc',
    fontSize: 15,
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  hero: {
    gap: 10,
  },
  heroCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  inlineError: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(148, 163, 184, 0.16)',
    borderRadius: 16,
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 15,
    minHeight: 120,
    padding: 14,
    textAlignVertical: 'top',
  },
  memberHeadline: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  memberName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  memberRow: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  metricCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderColor: 'rgba(148, 163, 184, 0.08)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 12,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#2dd4bf',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryActionLabel: {
    color: '#042f2e',
    fontSize: 14,
    fontWeight: '700',
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
