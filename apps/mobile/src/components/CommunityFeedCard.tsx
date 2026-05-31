import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { MobileCommunityFeedPost } from '@kurecal/domain';

import { EventSummaryCard } from './EventSummaryCard';
import { CommunityRichPostContent } from './CommunityRichPostContent';
import {
  formatCommunityRelativeTime,
} from '../lib/communityPresentation';

const colors = {
  accent: '#BDC2FF',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(189, 194, 255, 0.36)',
  surface: '#121314',
  surfaceHigh: '#1B1C1D',
  text: '#E3E2E3',
  textMuted: '#C6C5D5',
  textSubtle: '#908F9E',
  warning: '#FBBF24',
};

interface CommunityFeedCardProps {
  onPress?: () => void;
  post: MobileCommunityFeedPost;
  showCircle?: boolean;
  variant?: 'card' | 'row';
}

function getAuthorInitial(post: MobileCommunityFeedPost): string {
  return (post.author.fullName || post.author.id || 'M').slice(0, 1).toUpperCase();
}

function Content({
  post,
  showCircle,
  variant,
}: {
  post: MobileCommunityFeedPost;
  showCircle: boolean;
  variant: 'card' | 'row';
}) {
  const body = (
    <>
      <View style={styles.metaRow}>
        <Text style={styles.circleLabel}>
          {showCircle ? post.circle.name : post.author.fullName || 'Community member'}
        </Text>
        <Text style={styles.metaText}>{formatCommunityRelativeTime(post.createdAt)}</Text>
      </View>

      <CommunityRichPostContent
        content={post.content}
        linkPreviews={post.linkPreviews}
        media={post.media}
        mentions={post.mentions}
        numberOfLines={4}
      />

      {post.event ? (
        <EventSummaryCard event={post.event} tone="highlight" />
      ) : null}

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {post.commentCount} repl{post.commentCount === 1 ? 'y' : 'ies'}
        </Text>
        {post.isTrending ? (
          <View style={styles.trendingPill}>
            <Text style={styles.trendingLabel}>Trending</Text>
          </View>
        ) : null}
      </View>

      {post.recentComments?.length ? (
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
    <View style={[styles.card, variant === 'row' ? styles.rowCard : null]}>
      {variant === 'row' ? (
        <View style={styles.threadRow}>
          <View style={styles.avatarFrame}>
            {post.author.avatarUrl ? (
              <Image source={{ uri: post.author.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>{getAuthorInitial(post)}</Text>
            )}
          </View>
          <View style={styles.threadCopy}>{body}</View>
        </View>
      ) : (
        body
      )}
    </View>
  );
}

export function CommunityFeedCard({
  onPress,
  post,
  showCircle = true,
  variant = 'card',
}: CommunityFeedCardProps) {
  if (!onPress) {
    return <Content post={post} showCircle={showCircle} variant={variant} />;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        pressed ? styles.pressablePressed : null,
      ]}
    >
      <Content post={post} showCircle={showCircle} variant={variant} />
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
  avatarFrame: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 34,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarInitial: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
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
    gap: 8,
  },
  threadRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 2,
  },
  circleLabel: {
    color: colors.accent,
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  footerText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
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
});
