import { useCallback, useMemo, useState } from 'react';
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

import type { MobileCommunityPostPage } from '@kurecal/domain';

import { CommunityCommentThread } from '../../../../src/components/CommunityCommentThread';
import { ScreenStateView } from '../../../../src/components/ScreenStateView';
import {
  countCommunityComments,
  formatCommunityRelativeTime,
} from '../../../../src/lib/communityPresentation';
import {
  createMobileCommunityComment,
  joinMobileCommunityCircle,
  leaveMobileCommunityCircle,
  loadMobileCommunityPost,
  submitMobileCommunityReport,
  submitMobileCommunityVote,
} from '../../../../src/lib/mobileApi';

export default function CommunityPostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string | string[] }>();
  const resolvedPostId = Array.isArray(postId) ? postId[0] : postId;
  const [data, setData] = useState<MobileCommunityPostPage | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);

  const loadPost = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!resolvedPostId) {
        setError('Post id is missing');
        setLoading(false);
        return;
      }

      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const nextData = await loadMobileCommunityPost(resolvedPostId);
        setData(nextData);
        setError(null);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load discussion'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [resolvedPostId]
  );

  useFocusEffect(
    useCallback(() => {
      void loadPost();
    }, [loadPost])
  );

  const totalComments = useMemo(
    () => countCommunityComments(data?.post.comments ?? []),
    [data?.post.comments]
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

      await loadPost('refresh');
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

  async function handleVote(voteType: -1 | 1) {
    if (!data || working) {
      return;
    }

    setWorking(true);

    try {
      const currentVote = data.post.userVote ?? 0;
      await submitMobileCommunityVote({
        entityType: 'post',
        entityId: data.post.id,
        circleSlug: data.circle.slug,
        voteType: currentVote === voteType ? 0 : voteType,
      });
      await loadPost('refresh');
    } catch (nextError) {
      Alert.alert(
        'Vote failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to vote on this thread.'
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleReply() {
    if (!data || !replyDraft.trim() || working) {
      return;
    }

    setWorking(true);

    try {
      await createMobileCommunityComment({
        postId: data.post.id,
        circleSlug: data.circle.slug,
        content: replyDraft,
      });
      setReplyDraft('');
      await loadPost('refresh');
    } catch (nextError) {
      Alert.alert(
        'Reply failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to send reply.'
      );
    } finally {
      setWorking(false);
    }
  }

  function handleReport() {
    if (!data || working) {
      return;
    }

    Alert.alert('Report thread', 'Choose a reason for this report.', [
      {
        text: 'Spam',
        onPress: () => {
          void submitReport('spam');
        },
      },
      {
        text: 'Harassment',
        onPress: () => {
          void submitReport('harassment');
        },
      },
      {
        text: 'Other',
        onPress: () => {
          void submitReport('other');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function submitReport(
    reason: 'spam' | 'harassment' | 'other'
  ) {
    if (!data || working) {
      return;
    }

    setWorking(true);

    try {
      await submitMobileCommunityReport({
        subjectType: 'post',
        subjectId: data.post.id,
        reason,
      });
      Alert.alert('Report submitted', 'Thanks. Your report is now queued for review.');
    } catch (nextError) {
      Alert.alert(
        'Report failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to submit report.'
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
              title="Loading discussion"
              description="Pulling the full thread and replies."
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
              title="Discussion unavailable"
              description={error}
              onRetry={() => {
                void loadPost();
              }}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!data) {
    return null;
  }

  const currentVote = data.post.userVote ?? 0;
  const currentScore = data.post.score ?? 0;

  return (
    <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadPost('refresh');
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

          <View style={styles.contextCard}>
            <Text style={styles.contextLabel}>Circle</Text>
            <Text style={styles.contextTitle}>{data.circle.name}</Text>
            <Text style={styles.contextBody}>{data.circle.description}</Text>
            <View style={styles.contextActions}>
              <Pressable
                onPress={() => {
                  void handleToggleMembership();
                }}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed ? styles.cardPressed : null,
                ]}
              >
                <Text style={styles.secondaryActionLabel}>
                  {working
                    ? 'Working...'
                    : data.isJoined
                      ? 'Leave circle'
                      : 'Join circle'}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleReport}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed ? styles.cardPressed : null,
                ]}
              >
                <Text style={styles.secondaryActionLabel}>Report</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.postCard}>
            <Text style={styles.metaLine}>
              {data.post.author.fullName || 'Community member'} •{' '}
              {formatCommunityRelativeTime(data.post.createdAt)} • {totalComments}{' '}
              repl{totalComments === 1 ? 'y' : 'ies'}
            </Text>
            <Text style={styles.postBody}>{data.post.content}</Text>

            <View style={styles.voteRow}>
              <Pressable
                onPress={() => {
                  void handleVote(1);
                }}
                style={({ pressed }) => [
                  styles.voteButton,
                  currentVote === 1 ? styles.voteButtonActive : null,
                  pressed ? styles.cardPressed : null,
                ]}
              >
                <Text style={styles.voteLabel}>Upvote</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void handleVote(-1);
                }}
                style={({ pressed }) => [
                  styles.voteButton,
                  currentVote === -1 ? styles.voteButtonActiveDanger : null,
                  pressed ? styles.cardPressed : null,
                ]}
              >
                <Text style={styles.voteLabel}>Downvote</Text>
              </Pressable>
              <View style={styles.scoreChip}>
                <Text style={styles.scoreLabel}>Score {currentScore}</Text>
              </View>
            </View>
          </View>

          {data.isJoined ? (
            <View style={styles.replyCard}>
              <Text style={styles.sectionTitle}>Add a reply</Text>
              <TextInput
                multiline
                value={replyDraft}
                onChangeText={setReplyDraft}
                placeholder="Write your reply"
                placeholderTextColor="#64748b"
                style={styles.input}
              />
              <Pressable
                onPress={() => {
                  void handleReply();
                }}
                style={({ pressed }) => [
                  styles.primaryAction,
                  (!replyDraft.trim() || working) ? styles.disabledAction : null,
                  pressed ? styles.cardPressed : null,
                ]}
                disabled={!replyDraft.trim() || working}
              >
                <Text style={styles.primaryActionLabel}>
                  {working ? 'Sending...' : 'Send reply'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScreenStateView
              mode="empty"
              title="Join to reply"
              description="You can read the thread now. Join the circle to add your reply."
            />
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Replies</Text>
              <Text style={styles.sectionTitle}>Thread</Text>
            </View>

            {data.post.comments.length ? (
              <View style={styles.stack}>
                {data.post.comments.map((comment) => (
                  <CommunityCommentThread key={comment.id} comment={comment} />
                ))}
              </View>
            ) : (
              <ScreenStateView
                mode="empty"
                title="No replies yet"
                description="Be the first person to reply to this discussion."
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
  content: {
    gap: 18,
    padding: 22,
  },
  contextActions: {
    flexDirection: 'row',
    gap: 10,
  },
  contextBody: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  contextCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  contextLabel: {
    color: '#2dd4bf',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  contextTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  disabledAction: {
    opacity: 0.5,
  },
  gradient: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(148, 163, 184, 0.16)',
    borderRadius: 16,
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 15,
    minHeight: 110,
    padding: 14,
    textAlignVertical: 'top',
  },
  metaLine: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  postBody: {
    color: '#e2e8f0',
    fontSize: 16,
    lineHeight: 24,
  },
  postCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 18,
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
  replyCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  safeArea: {
    flex: 1,
  },
  scoreChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  scoreLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  secondaryActionLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
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
    gap: 12,
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  voteButton: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 92,
    paddingHorizontal: 14,
  },
  voteButtonActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.16)',
    borderColor: 'rgba(45, 212, 191, 0.32)',
  },
  voteButtonActiveDanger: {
    backgroundColor: 'rgba(248, 113, 113, 0.16)',
    borderColor: 'rgba(248, 113, 113, 0.32)',
  },
  voteLabel: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  voteRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
