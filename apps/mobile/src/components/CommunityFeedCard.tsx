import { Feather } from '@expo/vector-icons';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useScalePress } from '../hooks/useAnimation';

import type { MobileCommunityFeedPost } from '@kurecal/domain';

import { CommunityRichPostContent } from './CommunityRichPostContent';
import { CommunityAttachedEventRow } from './community/CommunityAttachedEventRow';
import {
  formatCommunityRelativeTime,
} from '../lib/communityPresentation';

const colors = {
  accent: '#BDC2FF',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(189, 194, 255, 0.36)',
  danger: '#FFB4AB',
  surface: '#121314',
  surfaceHigh: '#1B1C1D',
  text: '#E3E2E3',
  textMuted: '#C6C5D5',
  textSubtle: '#908F9E',
  warning: '#FBBF24',
};

interface CommunityFeedCardProps {
  onOpenEvent?: (eventId: string) => void;
  onVote?: (post: MobileCommunityFeedPost, voteType: -1 | 1) => void;
  onPress?: () => void;
  post: MobileCommunityFeedPost;
  variant?: 'card' | 'row' | 'thread';
}

function VoteButton({
  accessibilityLabel,
  color,
  icon,
  onPress,
}: {
  accessibilityLabel: string;
  color: string;
  icon: 'arrow-up' | 'arrow-down';
  onPress?: () => void;
}) {
  const { scale, onPressIn, onPressOut } = useScalePress();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.voteButton}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Feather name={icon} size={20} color={color} />
      </Animated.View>
    </Pressable>
  );
}

function Content({
  onPress,
  onOpenEvent,
  onVote,
  post,
  variant,
}: {
  onPress?: () => void;
  onOpenEvent?: (eventId: string) => void;
  onVote?: (post: MobileCommunityFeedPost, voteType: -1 | 1) => void;
  post: MobileCommunityFeedPost;
  variant: 'card' | 'row' | 'thread';
}) {
  const score = post.score ?? 0;
  const userVote = post.userVote ?? 0;
  const isThread = variant === 'thread';
  const attachedEventId = post.event?.id ?? post.eventId ?? null;
  const body = (
    <>
      <CommunityRichPostContent
        content={post.content}
        linkPreviews={post.linkPreviews}
        media={post.media}
        mentions={post.mentions}
        numberOfLines={isThread ? undefined : 4}
        textVariant="post"
        title={post.title}
      />

      {post.event ? (
        <CommunityAttachedEventRow
          event={post.event}
          variant="selected"
          onPress={
            onOpenEvent && attachedEventId
              ? () => onOpenEvent(attachedEventId)
              : undefined
          }
        />
      ) : null}

      <View style={[styles.footerRow, isThread ? styles.threadFooterRow : null]}>
        <View style={styles.footerActions}>
          <Text style={styles.footerText}>
            {post.commentCount} repl{post.commentCount === 1 ? 'y' : 'ies'}
          </Text>
        </View>
        <Text style={styles.metaText}>{formatCommunityRelativeTime(post.createdAt)}</Text>
        {post.isTrending ? (
          <View style={styles.trendingPill}>
            <Text style={styles.trendingLabel}>Trending</Text>
          </View>
        ) : null}
      </View>

      {!isThread && post.recentComments?.length ? (
        <View style={styles.previewStack}>
          {post.recentComments.slice(0, 2).map((comment) => (
            <View key={comment.id} style={styles.previewRow}>
              <Text numberOfLines={1} style={styles.previewAuthor}>
                {comment.author.fullName || 'Member'}
              </Text>
              <Text numberOfLines={1} style={styles.previewBody}>
                {comment.content}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );

  return (
    <View
      style={[
        styles.card,
        variant === 'row' ? styles.rowCard : null,
        variant === 'thread' ? styles.threadCard : null,
      ]}
    >
      {variant === 'row' || variant === 'thread' ? (
        <View style={variant === 'thread' ? styles.fullThreadRow : styles.threadRow}>
          <View style={styles.voteRail}>
            <VoteButton
              accessibilityLabel="Upvote thread"
              color={userVote === 1 ? colors.accent : colors.textSubtle}
              icon="arrow-up"
              onPress={() => onVote?.(post, 1)}
            />
            <Text style={styles.scoreLabel}>{score}</Text>
            <VoteButton
              accessibilityLabel="Downvote thread"
              color={userVote === -1 ? colors.danger : colors.textSubtle}
              icon="arrow-down"
              onPress={() => onVote?.(post, -1)}
            />
          </View>
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [
              variant === 'thread' ? styles.fullThreadCopy : styles.threadCopy,
              pressed ? styles.pressablePressed : null,
            ]}
          >
            {body}
          </Pressable>
        </View>
      ) : (
        body
      )}
    </View>
  );
}

export function CommunityFeedCard({
  onOpenEvent,
  onVote,
  onPress,
  post,
  variant = 'card',
}: CommunityFeedCardProps) {
  const { scale, onPressIn, onPressOut } = useScalePress();

  if (!onPress || variant === 'row' || variant === 'thread') {
    return (
      <Content
        onPress={onPress}
        onOpenEvent={onOpenEvent}
        onVote={onVote}
        post={post}
        variant={variant}
      />
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.pressable}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Content
          onPress={onPress}
          onOpenEvent={onOpenEvent}
          onVote={onVote}
          post={post}
          variant={variant}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  threadCopy: {
    flex: 1,
    gap: 10,
  },
  fullThreadCopy: {
    flex: 1,
    gap: 10,
    minWidth: 0,
  },
  fullThreadRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  threadRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 12,
  },
  threadCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
  threadFooterRow: {
    justifyContent: 'space-between',
    paddingTop: 0,
  },
  footerAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  footerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 28,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  footerText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  metaText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  previewAuthor: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    minWidth: 88,
  },
  previewBody: {
    color: colors.textSubtle,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  previewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  previewStack: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 6,
    paddingTop: 8,
  },
  pressable: {
    borderRadius: 6,
  },
  pressablePressed: {
    opacity: 0.84,
  },
  scoreLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
  trendingLabel: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  trendingPill: {
    backgroundColor: colors.surfaceHigh,
    borderColor: 'rgba(251, 191, 36, 0.28)',
    borderRadius: 2,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  voteButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  voteRail: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 1,
    width: 36,
  },
});
