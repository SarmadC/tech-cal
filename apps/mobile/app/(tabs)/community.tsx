import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { CommunityReportInput } from '@kurecal/domain';
import { KureButton } from '@/components/chrome/KureButton';
import { KureCard } from '@/components/chrome/KureCard';
import { HeaderActionButton } from '@/components/chrome/MobilePage';
import { KureScreen } from '@/components/chrome/KureScreen';
import { InlineNotice } from '@/components/chrome/InlineNotice';
import { ScreenState } from '@/components/chrome/ScreenState';
import { SectionCard } from '@/components/chrome/SectionCard';
import { SectionHeading } from '@/components/chrome/SectionHeading';
import {
  CommunityReportComposer,
  type CommunityReportTarget,
} from '@/components/community/CommunityReportComposer';
import { useMobileAuth } from '@/hooks/useMobileAuth';
import { getMobileApiClient } from '@/lib/mobileApi';
import { mobileQueryKeys } from '@/lib/queryKeys';
import { mobileQueryStaleTimes } from '@/lib/queryClient';
import { useAppTheme } from '@/providers/ThemeProvider';

export default function CommunityScreen() {
  const queryClient = useQueryClient();
  const { user } = useMobileAuth();
  const { tokens } = useAppTheme();
  const apiClient = useMemo(() => getMobileApiClient(), []);
  const [draft, setDraft] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [reportTarget, setReportTarget] = useState<CommunityReportTarget | null>(null);

  const circlesQuery = useQuery({
    queryKey: mobileQueryKeys.community.joinedCircles(user?.id),
    enabled: Boolean(user?.id),
    staleTime: mobileQueryStaleTimes.medium,
    queryFn: async () => {
      const result = await apiClient.getJoinedCircles();
      if (!result.success) {
        throw new Error(result.error ?? 'Unable to load circles.');
      }

      return result.data ?? [];
    },
  });

  const feedQuery = useQuery({
    queryKey: mobileQueryKeys.community.feed(),
    staleTime: mobileQueryStaleTimes.live,
    queryFn: async () => {
      const result = await apiClient.getCommunityFeed();
      if (!result.success) throw new Error(result.error ?? 'Unable to load community');
      return result.data;
    },
  });

  const blockedUsersQuery = useQuery({
    queryKey: mobileQueryKeys.community.blockedUsers(),
    staleTime: mobileQueryStaleTimes.medium,
    queryFn: async () => {
      const result = await apiClient.getBlockedUsers();
      if (!result.success) throw new Error(result.error ?? 'Unable to load block list.');
      return result.data ?? [];
    },
  });

  const selectedCircle = circlesQuery.data?.[0] ?? null;
  const blockedUserIds = new Set((blockedUsersQuery.data ?? []).map((blockedUser) => blockedUser.id));

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCircle) throw new Error('Join a circle on web first to post from mobile.');
      const result = await apiClient.createCommunityPost({
        circleId: selectedCircle.id,
        circleSlug: selectedCircle.slug,
        content: draft,
      });
      if (!result.success) throw new Error(result.error ?? 'Unable to publish post.');
    },
    onSuccess: async () => {
      setDraft('');
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.community.feed() });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (payload: { postId: string; circleSlug: string; voteType: -1 | 1 }) => {
      const result = await apiClient.submitVote({
        entityType: 'post',
        entityId: payload.postId,
        circleSlug: payload.circleSlug,
        voteType: payload.voteType,
      });
      if (!result.success) throw new Error(result.error ?? 'Unable to vote.');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.community.feed() });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ postId, circleSlug }: { postId: string; circleSlug: string }) => {
      const content = replyDrafts[postId]?.trim();
      if (!content) throw new Error('Write a reply first.');
      const result = await apiClient.createCommunityComment({
        postId,
        circleSlug,
        content,
      });
      if (!result.success) throw new Error(result.error ?? 'Unable to add comment.');
    },
    onSuccess: async (_data, variables) => {
      setReplyDrafts((current) => ({ ...current, [variables.postId]: '' }));
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.community.feed() });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (payload: CommunityReportInput) => {
      const result = await apiClient.reportCommunityContent(payload);
      if (!result.success) throw new Error(result.error ?? 'Unable to submit this report.');
    },
    onSuccess: () => {
      setReportTarget(null);
    },
  });

  const blockMutation = useMutation({
    mutationFn: async ({ blockedUserId }: { blockedUserId: string }) => {
      const result = await apiClient.blockUser(blockedUserId);
      if (!result.success) throw new Error(result.error ?? 'Unable to block this user.');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.community.blockedUsers() }),
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.community.feed() }),
      ]);
    },
  });

  return (
    <KureScreen
      title="Community"
      subtitle="Posting, voting, commenting, blocking, and moderation all live inside the same signed-in mobile shell."
      action={<HeaderActionButton label="Settings" onPress={() => router.push('../settings')} />}
    >
      <SectionCard
        eyebrow={selectedCircle ? selectedCircle.name : 'Your circle'}
        title="Start a conversation"
        detail="Posting, moderation, and circle state all use the same mobile API lane."
      >
        {!selectedCircle ? (
          <InlineNotice
            title="Join a circle on web first"
            description="The mobile composer is ready, but publishing stays scoped to circles already attached to your account."
          />
        ) : null}
        <TextInput
          multiline
          value={draft}
          onChangeText={setDraft}
          placeholder={
            selectedCircle
              ? 'Share something with ' + selectedCircle.name
              : 'Join a circle on web to post from mobile'
          }
          placeholderTextColor={tokens.colors.textTertiary}
          style={[
            styles.textarea,
            {
              backgroundColor: tokens.colors.input,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        />
        <KureButton onPress={() => postMutation.mutateAsync().catch((error) => Alert.alert('Post failed', error.message))}>
          Publish post
        </KureButton>
      </SectionCard>

      {feedQuery.isLoading ? (
        <ScreenState
          mode="loading"
          title="Loading community"
          description="Fetching circles, posts, and moderation state."
        />
      ) : null}

      {feedQuery.isError ? (
        <ScreenState
          mode="error"
          title="Community unavailable"
          description="Tap back in a moment. The feed request failed."
        />
      ) : null}

      {feedQuery.data?.feed.map((post) => (
        <KureCard key={post.id}>
          <Text style={[styles.kicker, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
            {post.circle.name} • {post.author.fullName ?? 'Community member'}
          </Text>
          <Text style={[styles.postBody, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{post.content}</Text>
          <Text style={[styles.meta, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}> 
            {post.commentCount} comments{post.isTrending ? ' • Trending' : ''}
          </Text>
          <View style={styles.actionRow}>
            <KureButton variant="secondary" onPress={() => voteMutation.mutateAsync({ postId: post.id, circleSlug: post.circle.slug, voteType: 1 }).catch((error) => Alert.alert('Vote failed', error.message))}>
              Upvote
            </KureButton>
            <KureButton variant="secondary" onPress={() => voteMutation.mutateAsync({ postId: post.id, circleSlug: post.circle.slug, voteType: -1 }).catch((error) => Alert.alert('Vote failed', error.message))}>
              Downvote
            </KureButton>
            {post.author.id !== user?.id ? (
              <KureButton
                variant="ghost"
                onPress={() =>
                  setReportTarget({
                    id: post.id,
                    type: 'post',
                    title: 'Report this post',
                    context: post.content,
                  })
                }
              >
                Report post
              </KureButton>
            ) : null}
            {post.author.id !== user?.id ? (
              <KureButton
                variant="ghost"
                onPress={() =>
                  setReportTarget({
                    id: post.author.id,
                    type: 'profile',
                    title: 'Report ' + (post.author.fullName ?? 'this member'),
                    context: 'Use this when the member profile, identity, or behavior needs moderator review.',
                  })
                }
              >
                Report member
              </KureButton>
            ) : null}
            {!blockedUserIds.has(post.author.id) && post.author.id !== user?.id ? (
              <KureButton
                variant="ghost"
                onPress={() =>
                  blockMutation
                    .mutateAsync({ blockedUserId: post.author.id })
                    .then(() => Alert.alert('User blocked', 'Posts from this member will be filtered out.'))
                    .catch((error) => Alert.alert('Block failed', error.message))
                }
              >
                Block member
              </KureButton>
            ) : null}
          </View>
          {post.recentComments?.length ? (
            <View style={styles.commentStack}>
              <Text style={[styles.replyLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Recent replies</Text>
              {post.recentComments.map((comment) => (
                <View
                  key={comment.id}
                  style={[
                    styles.commentCard,
                    {
                      backgroundColor: tokens.colors.input,
                      borderColor: tokens.colors.border,
                      borderRadius: tokens.radius.sm,
                    },
                  ]}
                >
                  <Text style={[styles.commentMeta, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                    {comment.author.fullName ?? 'Community member'}
                  </Text>
                  <Text style={[styles.commentBody, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{comment.content}</Text>
                  <View style={styles.commentActions}>
                    {comment.author.id !== user?.id ? (
                      <KureButton
                        variant="ghost"
                        onPress={() =>
                          setReportTarget({
                            id: comment.id,
                            type: 'comment',
                            title: 'Report this reply',
                            context: comment.content,
                          })
                        }
                      >
                        Report reply
                      </KureButton>
                    ) : null}
                    {comment.author.id !== user?.id && !blockedUserIds.has(comment.author.id) ? (
                      <KureButton
                        variant="ghost"
                        onPress={() =>
                          blockMutation
                            .mutateAsync({ blockedUserId: comment.author.id })
                            .then(() => Alert.alert('User blocked', 'Their community activity will be hidden across the app.'))
                            .catch((error) => Alert.alert('Block failed', error.message))
                        }
                      >
                        Block member
                      </KureButton>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          <TextInput
            value={replyDrafts[post.id] ?? ''}
            onChangeText={(value) => setReplyDrafts((current) => ({ ...current, [post.id]: value }))}
            placeholder="Add a reply"
            placeholderTextColor={tokens.colors.textTertiary}
            style={[
              styles.replyInput,
              {
                backgroundColor: tokens.colors.input,
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.sm,
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          />
          <KureButton variant="secondary" onPress={() => commentMutation.mutateAsync({ postId: post.id, circleSlug: post.circle.slug }).catch((error) => Alert.alert('Comment failed', error.message))}>
            Send reply
          </KureButton>
        </KureCard>
      ))}

      {!feedQuery.isLoading && !feedQuery.data?.feed.length ? (
        <ScreenState
          mode="empty"
          title="No posts yet"
          description="Once a circle starts moving, the feed will surface discussion, moderation, and replies here."
        />
      ) : null}

      <CommunityReportComposer
        visible={Boolean(reportTarget)}
        target={reportTarget}
        submitting={reportMutation.isPending}
        onClose={() => setReportTarget(null)}
        onSubmit={(payload) =>
          reportMutation
            .mutateAsync(payload)
            .then(() => Alert.alert('Reported', 'Thanks. Your report is now in the moderation queue.'))
            .catch((error) => Alert.alert('Report failed', error.message))
        }
      />
    </KureScreen>
  );
}

const styles = StyleSheet.create({
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    padding: 14,
    fontSize: 16,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
  },
  postBody: {
    fontSize: 16,
    lineHeight: 24,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  commentStack: {
    gap: 10,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  commentCard: {
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  commentMeta: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  replyInput: {
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
});
