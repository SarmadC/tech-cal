import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MobileCommunityFeedPost } from '@kurecal/domain';

import {
  formatCommunityRelativeTime,
  summarizeCommunityPost,
} from '../lib/communityPresentation';

interface CommunityFeedCardProps {
  onPress?: () => void;
  post: MobileCommunityFeedPost;
  showCircle?: boolean;
}

function Content({
  post,
  showCircle,
}: {
  post: MobileCommunityFeedPost;
  showCircle: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.metaRow}>
        <Text style={styles.circleLabel}>
          {showCircle ? post.circle.name : post.author.fullName || 'Community member'}
        </Text>
        <Text style={styles.metaText}>{formatCommunityRelativeTime(post.createdAt)}</Text>
      </View>

      <Text style={styles.body}>{summarizeCommunityPost(post.content)}</Text>

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
    </View>
  );
}

export function CommunityFeedCard({
  onPress,
  post,
  showCircle = true,
}: CommunityFeedCardProps) {
  if (!onPress) {
    return <Content post={post} showCircle={showCircle} />;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        pressed ? styles.pressablePressed : null,
      ]}
    >
      <Content post={post} showCircle={showCircle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  circleLabel: {
    color: '#2dd4bf',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  metaText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  previewAuthor: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 88,
  },
  previewBody: {
    color: '#94a3b8',
    flex: 1,
    fontSize: 12,
  },
  previewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  previewStack: {
    borderTopColor: 'rgba(148, 163, 184, 0.12)',
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 12,
  },
  pressable: {
    borderRadius: 22,
  },
  pressablePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  trendingLabel: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
  },
  trendingPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
