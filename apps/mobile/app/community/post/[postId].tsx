import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KureButton } from '@/components/chrome/KureButton';
import { HeaderActionButton } from '@/components/chrome/MobilePage';
import { KureScreen } from '@/components/chrome/KureScreen';
import { ScreenState } from '@/components/chrome/ScreenState';
import { CommunityAvatar } from '@/components/community/CommunityAvatar';
import { CommunityCommentThread } from '@/components/community/CommunityCommentThread';
import { CommunitySection } from '@/components/community/CommunitySection';
import {
  countThreadComments,
  formatCommunityCompactCount,
  formatCommunityRelativeTime,
  parseCommunityPostContent,
} from '@/components/community/presentation';
import { getMobileApiClient } from '@/lib/mobileApi';
import { mobileQueryKeys } from '@/lib/queryKeys';
import { mobileQueryStaleTimes } from '@/lib/queryClient';
import { useAppTheme } from '@/providers/ThemeProvider';

export default function CommunityPostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string | string[] }>();
  const resolvedPostId = Array.isArray(postId) ? postId[0] : postId;
  const queryClient = useQueryClient();
  const apiClient = useMemo(() => getMobileApiClient(), []);
  const { tokens } = useAppTheme();
  const [replyDraft, setReplyDraft] = useState('');

  const postQuery = useQuery({
    queryKey: mobileQueryKeys.community.post(resolvedPostId),
    enabled: Boolean(resolvedPostId),
    staleTime: mobileQueryStaleTimes.live,
    queryFn: async () => {
      const result = await apiClient.getCommunityPost(resolvedPostId!);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Unable to load this discussion.');
      }

      return result.data;
    },
  });

  const toggleMembershipMutation = useMutation({
    mutationFn: async ({
      circleId,
      isJoined,
    }: {
      circleId: string;
      isJoined: boolean;
    }) => {
      const result = isJoined
        ? await apiClient.leaveCommunityCircle(circleId)
        : await apiClient.joinCommunityCircle(circleId);

      if (!result.success) {
        throw new Error(result.error ?? 'Unable to update membership.');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.community.root() });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (voteType: -1 | 0 | 1) => {
      const page = postQuery.data;
      if (!page) {
        throw new Error('This discussion is not ready yet.');
      }

      const result = await apiClient.submitVote({
        entityType: 'post',
        entityId: page.post.id,
        circleSlug: page.circle.slug,
        voteType,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Unable to vote.');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.community.root() });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const page = postQuery.data;
      if (!page) {
        throw new Error('This discussion is not ready yet.');
      }

      const result = await apiClient.createCommunityComment({
        postId: page.post.id,
        circleSlug: page.circle.slug,
        content: replyDraft,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Unable to add reply.');
      }
    },
    onSuccess: async () => {
      setReplyDraft('');
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.community.root() });
    },
  });

  const page = postQuery.data;
  const parsed = parseCommunityPostContent(page?.post.content ?? '');
  const totalComments = countThreadComments(page?.post.comments ?? []);
  const title = parsed.title || parsed.body || 'Discussion';
  const body = parsed.title ? parsed.body : parsed.body || parsed.excerpt;
  const currentVote = page?.post.userVote ?? 0;
  const currentScore = page?.post.score ?? 0;

  async function handleToggleMembership() {
    if (!page) {
      return;
    }

    try {
      await toggleMembershipMutation.mutateAsync({
        circleId: page.circle.id,
        isJoined: page.isJoined,
      });
    } catch (error) {
      Alert.alert(
        page.isJoined ? 'Leave failed' : 'Join failed',
        error instanceof Error ? error.message : 'Unable to update membership.'
      );
    }
  }

  async function handleVote(voteType: -1 | 1) {
    try {
      await voteMutation.mutateAsync(currentVote === voteType ? 0 : voteType);
    } catch (error) {
      Alert.alert(
        'Vote failed',
        error instanceof Error ? error.message : 'Unable to vote on this post.'
      );
    }
  }

  async function handleReply() {
    try {
      await replyMutation.mutateAsync();
    } catch (error) {
      Alert.alert(
        'Reply failed',
        error instanceof Error ? error.message : 'Unable to publish this reply.'
      );
    }
  }

  return (
    <KureScreen
      title={page?.circle.name ?? 'Discussion'}
      subtitle="Expanded thread"
      action={<HeaderActionButton label="Back" onPress={() => router.back()} />}
    >
      {postQuery.isLoading && !page ? (
        <ScreenState
          mode="loading"
          title="Loading discussion"
          description="Pulling the full thread and replies."
        />
      ) : null}

      {postQuery.isError ? (
        <ScreenState
          mode="error"
          title="Discussion unavailable"
          description="This thread could not be loaded right now."
        />
      ) : null}

      {page ? (
        <>
          <View
            style={[
              styles.contextCard,
              {
                backgroundColor: tokens.colors.surface,
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.md,
              },
            ]}
          >
            <View style={styles.contextCopy}>
              <Text style={[styles.contextLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
                Circle
              </Text>
              <Text style={[styles.contextTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                {page.circle.name}
              </Text>
              <Text style={[styles.contextBody, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                {page.circle.description}
              </Text>
            </View>
            <View style={styles.contextActions}>
              <KureButton variant="secondary" onPress={() => router.push(`/community/${page.circle.slug}`)}>
                Open circle
              </KureButton>
              <KureButton onPress={handleToggleMembership}>
                {toggleMembershipMutation.isPending ? 'Working...' : page.isJoined ? 'Leave circle' : 'Join circle'}
              </KureButton>
            </View>
          </View>

          <View
            style={[
              styles.threadCard,
              {
                backgroundColor: tokens.colors.surface,
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.md,
              },
            ]}
          >
            <View style={styles.threadMeta}>
              <CommunityAvatar
                name={page.post.author.fullName}
                avatarUrl={page.post.author.avatarUrl}
                size={42}
              />
              <View style={styles.threadMetaCopy}>
                <Text style={[styles.threadAuthor, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                  {page.post.author.fullName || 'Anonymous'}
                </Text>
                <Text style={[styles.threadMetaLine, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
                  {formatCommunityRelativeTime(page.post.createdAt)} • {formatCommunityCompactCount(totalComments)} replies
                </Text>
              </View>
            </View>

            <Text style={[styles.threadTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
              {title}
            </Text>
            {body ? (
              <Text style={[styles.threadBody, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                {body}
              </Text>
            ) : null}

            <View style={styles.voteRow}>
              <KureButton variant={currentVote === 1 ? 'primary' : 'secondary'} onPress={() => handleVote(1)}>
                Upvote
              </KureButton>
              <KureButton variant={currentVote === -1 ? 'danger' : 'secondary'} onPress={() => handleVote(-1)}>
                Downvote
              </KureButton>
              <View style={styles.scoreChip}>
                <Text style={[styles.scoreLabel, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                  Score {currentScore}
                </Text>
              </View>
            </View>
          </View>

          {page.isJoined ? (
            <View
              style={[
                styles.replyCard,
                {
                  backgroundColor: tokens.colors.surface,
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.md,
                },
              ]}
            >
              <Text style={[styles.replyTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                Add a reply
              </Text>
              <TextInput
                multiline
                value={replyDraft}
                onChangeText={setReplyDraft}
                placeholder="Write your reply"
                placeholderTextColor={tokens.colors.textTertiary}
                style={[
                  styles.replyInput,
                  {
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                    backgroundColor: tokens.colors.input,
                    borderColor: tokens.colors.border,
                    borderRadius: tokens.radius.sm,
                  },
                ]}
              />
              <KureButton disabled={!replyDraft.trim() || replyMutation.isPending} onPress={handleReply}>
                {replyMutation.isPending ? 'Sending...' : 'Send reply'}
              </KureButton>
            </View>
          ) : (
            <ScreenState
              mode="empty"
              title="Join to reply"
              description="You can read the thread now. Join the circle to add your own reply."
            />
          )}

          <CommunitySection
            title="Replies"
            meta={`${formatCommunityCompactCount(totalComments)} total`}
          >
            {page.post.comments.length > 0 ? (
              <View style={styles.commentList}>
                {page.post.comments.map((comment) => (
                  <CommunityCommentThread key={comment.id} comment={comment} />
                ))}
              </View>
            ) : (
              <View style={styles.sectionState}>
                <Text style={[styles.sectionStateTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                  No replies yet
                </Text>
                <Text style={[styles.sectionStateBody, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                  The first reply will show up here.
                </Text>
              </View>
            )}
          </CommunitySection>
        </>
      ) : null}
    </KureScreen>
  );
}

const styles = StyleSheet.create({
  contextCard: {
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  contextCopy: {
    gap: 4,
  },
  contextLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  contextTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },
  contextBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  contextActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  threadCard: {
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  threadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  threadMetaCopy: {
    flex: 1,
    gap: 3,
  },
  threadAuthor: {
    fontSize: 15,
    fontWeight: '700',
  },
  threadMetaLine: {
    fontSize: 12,
    fontWeight: '600',
  },
  threadTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
  },
  threadBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  voteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  scoreChip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  replyCard: {
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  replyTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  replyInput: {
    minHeight: 120,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  commentList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  sectionState: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 4,
  },
  sectionStateTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionStateBody: {
    fontSize: 13,
    lineHeight: 18,
  },
});
