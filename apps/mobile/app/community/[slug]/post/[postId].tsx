import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type {
  MobileCommunityComment,
  MobileCommunityCurrentUser,
  MobileCommunityPostPage,
} from '@kurecal/domain';

import { CommunityCommentThread } from '../../../../src/components/CommunityCommentThread';
import { EventSummaryCard } from '../../../../src/components/EventSummaryCard';
import { CommunityRichPostContent } from '../../../../src/components/CommunityRichPostContent';
import { ScreenStateView } from '../../../../src/components/ScreenStateView';
import { getMobileApiBaseUrl } from '../../../../src/lib/env';
import {
  countCommunityComments,
  formatCommunityRelativeTime,
} from '../../../../src/lib/communityPresentation';
import {
  createMobileCommunityComment,
  deleteMobileCommunityComment,
  deleteMobileCommunityPost,
  loadMobileCommunityPost,
  submitMobileCommunityReport,
  submitMobileCommunityVote,
} from '../../../../src/lib/mobileApi';

const design = {
  accent: '#bdc2ff',
  accentText: '#121f8b',
  background: '#121314',
  border: '#454652',
  borderQuiet: 'rgba(69, 70, 82, 0.44)',
  danger: '#ffb4ab',
  muted: '#908f9e',
  surface: '#1b1c1d',
  surfaceLowest: '#0d0e0f',
  text: '#e3e2e3',
  textVariant: '#c6c5d5',
};

type CommentSortMode = 'best' | 'new' | 'old';

const commentSortLabels: Record<CommentSortMode, string> = {
  best: 'Best',
  new: 'New',
  old: 'Old',
};

const commentSortOptions: CommentSortMode[] = ['best', 'new', 'old'];

function formatPostTypeLabel(postType: string | undefined): string | null {
  if (!postType) {
    return null;
  }

  return postType
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function getCurrentUserDisplayName(currentUser: MobileCommunityCurrentUser | null): string {
  return currentUser?.fullName || currentUser?.username || currentUser?.id || '';
}

function getCurrentUserInitial(currentUser: MobileCommunityCurrentUser | null): string {
  return getCurrentUserDisplayName(currentUser).slice(0, 1).toUpperCase();
}

function getAuthorDisplayName(author: { fullName: string | null; id: string }): string {
  return author.fullName || author.id.slice(0, 8);
}

function buildThreadShareUrl(circleSlug: string, postId: string, commentId?: string): string {
  const base = getMobileApiBaseUrl().replace(/\/+$/, '');
  const query = commentId ? `?comment=${commentId}` : '';
  return `${base}/community/${encodeURIComponent(circleSlug)}/post/${encodeURIComponent(postId)}${query}`;
}

function compareCommentsBySortMode(
  left: MobileCommunityComment,
  right: MobileCommunityComment,
  sortMode: CommentSortMode
): number {
  const leftCreatedAt = new Date(left.createdAt).getTime();
  const rightCreatedAt = new Date(right.createdAt).getTime();

  if (sortMode === 'new') {
    return rightCreatedAt - leftCreatedAt;
  }

  if (sortMode === 'old') {
    return leftCreatedAt - rightCreatedAt;
  }

  const scoreDelta = (right.score ?? 0) - (left.score ?? 0);
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  return rightCreatedAt - leftCreatedAt;
}

function sortCommentTree(
  comments: MobileCommunityComment[],
  sortMode: CommentSortMode
): MobileCommunityComment[] {
  return comments
    .map((comment) => ({
      ...comment,
      replies: sortCommentTree(comment.replies, sortMode),
    }))
    .sort((left, right) => compareCommentsBySortMode(left, right, sortMode));
}

export default function CommunityPostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string | string[] }>();
  const resolvedPostId = Array.isArray(postId) ? postId[0] : postId;
  const [data, setData] = useState<MobileCommunityPostPage | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyParent, setReplyParent] = useState<MobileCommunityComment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentSortMode, setCommentSortMode] = useState<CommentSortMode>('best');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const replyInputRef = useRef<TextInput>(null);

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

  const sortedComments = useMemo(
    () => sortCommentTree(data?.post.comments ?? [], commentSortMode),
    [commentSortMode, data?.post.comments]
  );

  useEffect(() => {
    if (!isReplyOpen) {
      return undefined;
    }

    const focusTimer = setTimeout(() => {
      replyInputRef.current?.focus();
    }, 80);

    return () => clearTimeout(focusTimer);
  }, [isReplyOpen, replyParent?.id]);

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

  async function handleCommentVote(
    comment: MobileCommunityComment,
    voteType: -1 | 1
  ) {
    if (!data || working) {
      return;
    }

    setWorking(true);

    try {
      const currentVote = comment.userVote ?? 0;
      await submitMobileCommunityVote({
        entityType: 'comment',
        entityId: comment.id,
        circleSlug: data.circle.slug,
        voteType: currentVote === voteType ? 0 : voteType,
      });
      await loadPost('refresh');
    } catch (nextError) {
      Alert.alert(
        'Vote failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to vote on this comment.'
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
        parentId: replyParent?.id,
      });
      setReplyDraft('');
      setIsReplyOpen(false);
      setReplyParent(null);
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

  function handleDeletePost() {
    if (!data || working || data.currentUser?.id !== data.post.author.id) {
      return;
    }

    Alert.alert(
      'Delete thread',
      'Delete this thread? Replies will no longer be shown in the circle feed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deletePost();
          },
        },
      ]
    );
  }

  function handleCommentReply(comment: MobileCommunityComment) {
    setReplyParent(comment);
    setIsReplyOpen(true);
  }

  function handleCommentReport(comment: MobileCommunityComment) {
    if (!data || working) {
      return;
    }

    Alert.alert('Report comment', 'Choose a reason for this report.', [
      {
        text: 'Spam',
        onPress: () => {
          void submitReport('spam', 'comment', comment.id);
        },
      },
      {
        text: 'Harassment',
        onPress: () => {
          void submitReport('harassment', 'comment', comment.id);
        },
      },
      {
        text: 'Other',
        onPress: () => {
          void submitReport('other', 'comment', comment.id);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleCommentDelete(comment: MobileCommunityComment) {
    if (!data || working || data.currentUser?.id !== comment.author.id) {
      return;
    }

    Alert.alert('Delete reply', 'Delete this reply?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteComment(comment);
        },
      },
    ]);
  }

  async function handleShare(comment?: MobileCommunityComment) {
    if (!data) {
      return;
    }

    const url = buildThreadShareUrl(data.circle.slug, data.post.id, comment?.id);

    try {
      await Share.share({ message: url, url });
    } catch (nextError) {
      Alert.alert(
        'Share failed',
        nextError instanceof Error ? nextError.message : 'Please try again.'
      );
    }
  }

  async function deletePost() {
    if (!data || working || data.currentUser?.id !== data.post.author.id) {
      return;
    }

    setWorking(true);

    try {
      await deleteMobileCommunityPost(data.post.id);
      router.replace({
        pathname: '/community/[slug]',
        params: { slug: data.circle.slug },
      });
    } catch (nextError) {
      Alert.alert(
        'Delete failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to delete this thread.'
      );
    } finally {
      setWorking(false);
    }
  }

  async function deleteComment(comment: MobileCommunityComment) {
    if (!data || working || data.currentUser?.id !== comment.author.id) {
      return;
    }

    setWorking(true);

    try {
      await deleteMobileCommunityComment(comment.id);
      if (replyParent?.id === comment.id) {
        setReplyParent(null);
      }
      await loadPost('refresh');
    } catch (nextError) {
      Alert.alert(
        'Delete failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to delete this reply.'
      );
    } finally {
      setWorking(false);
    }
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (data) {
      router.replace({
        pathname: '/community/[slug]',
        params: { slug: data.circle.slug },
      });
    }
  }

  async function submitReport(
    reason: 'spam' | 'harassment' | 'other',
    subjectType: 'post' | 'comment' = 'post',
    subjectId?: string
  ) {
    if (!data || working) {
      return;
    }

    setWorking(true);

    try {
      await submitMobileCommunityReport({
        subjectType,
        subjectId: subjectId ?? data.post.id,
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
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Loading discussion"
              description="Pulling the full thread and replies."
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.screen}>
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
      </View>
    );
  }

  if (!data) {
    return null;
  }

  const currentVote = data.post.userVote ?? 0;
  const currentScore = data.post.score ?? 0;
  const postTypeLabel = formatPostTypeLabel(data.post.postType);
  const currentUserName = getCurrentUserDisplayName(data.currentUser);
  const canDeletePost = data.currentUser?.id === data.post.author.id && !data.post.isRemoved;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoider}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void loadPost('refresh');
                }}
                tintColor={design.accent}
              />
            }
          >
            <View style={styles.topBar}>
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed ? styles.cardPressed : null,
              ]}
            >
              <Feather name="chevron-left" size={22} color={design.text} />
            </Pressable>
          </View>

          <View style={styles.postSection}>
            <View style={styles.postMetaRow}>
              <Text numberOfLines={1} style={styles.metaLine}>
                {data.circle.name} • Posted by {getAuthorDisplayName(data.post.author)} •{' '}
                {formatCommunityRelativeTime(data.post.createdAt)}
              </Text>
              {postTypeLabel ? (
                <View style={styles.flair}>
                  <Text style={styles.flairLabel}>{postTypeLabel}</Text>
                </View>
              ) : null}
            </View>
            <CommunityRichPostContent
              content={data.post.content}
              linkPreviews={data.post.linkPreviews}
              media={data.post.media}
              mentions={data.post.mentions}
              textVariant="post"
              title={data.post.title}
            />
            {data.post.event ? (
              <EventSummaryCard event={data.post.event} tone="highlight" />
            ) : null}

            <View style={styles.voteRow}>
              <View style={styles.voteCluster}>
                <Pressable
                  onPress={() => {
                    void handleVote(1);
                  }}
                  style={({ pressed }) => [
                    styles.voteIconButton,
                    pressed ? styles.cardPressed : null,
                  ]}
                  accessibilityLabel="Upvote thread"
                >
                  <Feather
                    name="arrow-up"
                    size={17}
                    color={currentVote === 1 ? design.accent : design.textVariant}
                  />
                </Pressable>
                <Text style={styles.scoreLabel}>{currentScore}</Text>
                <Pressable
                  onPress={() => {
                    void handleVote(-1);
                  }}
                  style={({ pressed }) => [
                    styles.voteIconButton,
                    pressed ? styles.cardPressed : null,
                  ]}
                  accessibilityLabel="Downvote thread"
                >
                  <Feather
                    name="arrow-down"
                    size={17}
                    color={currentVote === -1 ? design.danger : design.textVariant}
                  />
                </Pressable>
              </View>
              <View style={styles.metaAction}>
                <FontAwesome name="comment-o" size={15} color={design.textVariant} />
                <Text style={styles.metaActionLabel}>
                  {totalComments} repl{totalComments === 1 ? 'y' : 'ies'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  void handleShare();
                }}
                style={({ pressed }) => [
                  styles.metaAction,
                  pressed ? styles.cardPressed : null,
                ]}
                accessibilityLabel="Share thread"
              >
                <FontAwesome name="share" size={15} color={design.textVariant} />
                <Text style={styles.metaActionLabel}>Share</Text>
              </Pressable>
              <Pressable
                onPress={handleReport}
                style={({ pressed }) => [
                  styles.metaAction,
                  pressed ? styles.cardPressed : null,
                ]}
                accessibilityLabel="Report thread"
              >
                <FontAwesome name="flag-o" size={15} color={design.textVariant} />
                <Text style={styles.metaActionLabel}>Report</Text>
              </Pressable>
              {canDeletePost ? (
                <Pressable
                  onPress={handleDeletePost}
                  style={({ pressed }) => [
                    styles.metaAction,
                    pressed ? styles.cardPressed : null,
                  ]}
                  accessibilityLabel="Delete thread"
                >
                  <FontAwesome name="trash-o" size={15} color={design.danger} />
                  <Text style={[styles.metaActionLabel, styles.dangerActionLabel]}>
                    Delete
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {!data.isJoined ? (
            <ScreenStateView
              mode="empty"
              title="Join to reply"
              description="You can read the thread now. Join the circle to add your reply."
            />
          ) : null}

          <View style={styles.section}>
            <View style={styles.sortWrap}>
              <Pressable
                onPress={() => setIsSortOpen((current) => !current)}
                style={({ pressed }) => [
                  styles.sortRow,
                  pressed ? styles.cardPressed : null,
                ]}
                accessibilityLabel="Sort replies"
              >
                <Text style={styles.sortLabel}>Sort by:</Text>
                <Text style={styles.sortValue}>{commentSortLabels[commentSortMode]}</Text>
                <FontAwesome
                  name={isSortOpen ? 'chevron-up' : 'chevron-down'}
                  size={11}
                  color={design.textVariant}
                />
              </Pressable>
              {isSortOpen ? (
                <View style={styles.sortDropdown}>
                  {commentSortOptions.map((option) => {
                    const isSelected = option === commentSortMode;

                    return (
                      <Pressable
                        key={option}
                        onPress={() => {
                          setCommentSortMode(option);
                          setIsSortOpen(false);
                        }}
                        style={({ pressed }) => [
                          styles.sortOption,
                          isSelected ? styles.sortOptionSelected : null,
                          pressed ? styles.cardPressed : null,
                        ]}
                        accessibilityLabel={`Sort replies by ${commentSortLabels[option]}`}
                      >
                        <Text
                          style={[
                            styles.sortOptionText,
                            isSelected ? styles.sortOptionTextSelected : null,
                          ]}
                        >
                          {commentSortLabels[option]}
                        </Text>
                        {isSelected ? (
                          <FontAwesome name="check" size={11} color={design.accent} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
            {sortedComments.length ? (
              <View style={styles.stack}>
                {sortedComments.map((comment) => (
                  <CommunityCommentThread
                    key={comment.id}
                    comment={comment}
                    currentUserId={data.currentUser?.id ?? null}
                    onDelete={handleCommentDelete}
                    onReply={handleCommentReply}
                    onReport={handleCommentReport}
                    onShare={(targetComment) => {
                      void handleShare(targetComment);
                    }}
                    onVote={handleCommentVote}
                    originalPosterId={data.post.author.id}
                    votingDisabled={working}
                  />
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
          {data.isJoined && isReplyOpen ? (
            <View style={styles.bottomComposer}>
              {data.currentUser ? (
                <View style={styles.replyIdentity}>
                  <View style={styles.replyAvatar}>
                    {data.currentUser.avatarUrl ? (
                      <Image
                        source={{ uri: data.currentUser.avatarUrl }}
                        style={styles.replyAvatarImage}
                      />
                    ) : (
                      <Text style={styles.replyAvatarInitial}>
                        {getCurrentUserInitial(data.currentUser)}
                      </Text>
                    )}
                  </View>
                  <Text numberOfLines={1} style={styles.replyIdentityText}>
                    {replyParent
                      ? `Replying to ${getAuthorDisplayName(replyParent.author)} as ${currentUserName}`
                      : `Replying as ${currentUserName}`}
                  </Text>
                </View>
              ) : null}
              <TextInput
                ref={replyInputRef}
                multiline
                value={replyDraft}
                onChangeText={setReplyDraft}
                placeholder="Add a comment"
                placeholderTextColor={design.muted}
                style={styles.input}
              />
              <View style={styles.composerActions}>
                <Pressable
                  onPress={() => {
                    setReplyDraft('');
                    setIsReplyOpen(false);
                    setReplyParent(null);
                  }}
                  style={({ pressed }) => [
                    styles.composerSecondaryAction,
                    pressed ? styles.cardPressed : null,
                  ]}
                >
                  <Text style={styles.composerSecondaryLabel}>Cancel</Text>
                </Pressable>
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
                    {working ? 'Sending...' : 'Comment'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    borderRadius: 4,
    justifyContent: 'center',
    minHeight: 34,
    width: 34,
  },
  cardPressed: {
    opacity: 0.84,
  },
  bottomComposer: {
    backgroundColor: 'rgba(18, 19, 20, 0.98)',
    borderTopColor: design.borderQuiet,
    borderTopWidth: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  composerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  composerSecondaryAction: {
    alignItems: 'center',
    borderRadius: 4,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  composerSecondaryLabel: {
    color: design.textVariant,
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    paddingBottom: 4,
  },
  contextLabel: {
    color: design.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  disabledAction: {
    opacity: 0.5,
  },
  screen: {
    backgroundColor: design.background,
    flex: 1,
  },
  input: {
    backgroundColor: design.surfaceLowest,
    borderColor: design.borderQuiet,
    borderRadius: 4,
    borderWidth: 1,
    color: design.text,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 96,
    padding: 12,
    textAlignVertical: 'top',
  },
  keyboardAvoider: {
    flex: 1,
  },
  flair: {
    alignSelf: 'flex-start',
    backgroundColor: design.surfaceLowest,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  flairLabel: {
    color: design.textVariant,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  metaLine: {
    color: design.muted,
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  metaAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 30,
  },
  metaActionLabel: {
    color: design.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  dangerActionLabel: {
    color: design.danger,
  },
  postMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  postSection: {
    backgroundColor: design.background,
    borderBottomColor: design.borderQuiet,
    borderBottomWidth: 1,
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: design.accent,
    borderColor: design.accent,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  primaryActionLabel: {
    color: design.accentText,
    fontSize: 13,
    fontWeight: '600',
  },
  replyPrompt: {
    alignItems: 'center',
    borderColor: design.borderQuiet,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  replyPromptText: {
    color: design.muted,
    fontSize: 14,
  },
  replyAvatar: {
    alignItems: 'center',
    backgroundColor: design.surface,
    borderRadius: 4,
    height: 24,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 24,
  },
  replyAvatarImage: {
    height: '100%',
    width: '100%',
  },
  replyAvatarInitial: {
    color: design.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  replyIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  replyIdentityText: {
    color: design.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  safeArea: {
    flex: 1,
  },
  scoreLabel: {
    color: design.text,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 16,
    textAlign: 'center',
  },
  section: {
    backgroundColor: design.background,
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  sortLabel: {
    color: design.muted,
    fontSize: 12,
  },
  sortDropdown: {
    alignSelf: 'flex-start',
    backgroundColor: design.surfaceLowest,
    borderColor: design.borderQuiet,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 6,
    minWidth: 112,
    overflow: 'hidden',
  },
  sortOption: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 32,
    paddingHorizontal: 10,
  },
  sortOptionSelected: {
    backgroundColor: 'rgba(189, 194, 255, 0.08)',
  },
  sortOptionText: {
    color: design.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  sortOptionTextSelected: {
    color: design.text,
    fontWeight: '600',
  },
  sortRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    minHeight: 30,
  },
  sortValue: {
    color: design.textVariant,
    fontSize: 13,
    fontWeight: '600',
  },
  sortWrap: {
    alignSelf: 'flex-start',
  },
  stack: {
    gap: 2,
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  voteCluster: {
    alignItems: 'center',
    borderRadius: 4,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 28,
  },
  voteIconButton: {
    alignItems: 'center',
    borderRadius: 4,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  voteRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  topBar: {
    alignItems: 'center',
    borderBottomColor: design.borderQuiet,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
