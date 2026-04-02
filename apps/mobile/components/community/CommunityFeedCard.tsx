import { FontAwesome } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CommunityFeedPost } from '@kurecal/domain';
import { useAppTheme } from '@/providers/ThemeProvider';
import { CommunityAvatar } from '@/components/community/CommunityAvatar';
import {
  formatCommunityCircleName,
  formatCommunityRelativeTime,
  getCommunityCircleTone,
  parseCommunityPostContent,
} from '@/components/community/presentation';

interface CommunityFeedCardProps {
  post: CommunityFeedPost;
  onPress?: () => void;
  showDivider?: boolean;
}

export function CommunityFeedCard({
  post,
  onPress,
  showDivider = true,
}: CommunityFeedCardProps) {
  const { tokens, resolvedTheme } = useAppTheme();
  const parsed = parseCommunityPostContent(post.content ?? '');
  const title = parsed.title || parsed.body || 'Discussion';
  const excerpt = parsed.excerpt;
  const circleName = formatCommunityCircleName(post.circle.name);
  const circleTone = getCommunityCircleTone(post.circle.name, resolvedTheme);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open community thread ${title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        {
          backgroundColor: pressed ? tokens.colors.surfaceMuted : 'transparent',
          borderBottomColor: showDivider ? tokens.colors.divider : 'transparent',
        },
      ]}
    >
      <CommunityAvatar
        name={post.author.fullName}
        avatarUrl={post.author.avatarUrl}
        size={40}
      />

      <View style={styles.copy}>
        <View style={styles.metaRow}>
          <Text
            numberOfLines={1}
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 11,
              fontWeight: '700',
            }}
          >
            {post.author.fullName || 'Anonymous'}
          </Text>
          <Text style={[styles.metaDot, { color: tokens.colors.textTertiary }]}>•</Text>
          <Text
            numberOfLines={1}
            style={{
              color: circleTone.foreground,
              fontFamily: tokens.typography.sans,
              fontSize: 11,
              fontWeight: '700',
            }}
          >
            {circleName}
          </Text>
          <Text style={[styles.metaDot, { color: tokens.colors.textTertiary }]}>•</Text>
          <Text
            numberOfLines={1}
            style={{
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
              fontSize: 11,
              fontWeight: '600',
            }}
          >
            {formatCommunityRelativeTime(post.createdAt)}
          </Text>
          {post.isTrending ? (
            <>
              <Text style={[styles.metaDot, { color: tokens.colors.textTertiary }]}>•</Text>
              <Text
                style={{
                  color: tokens.colors.warning,
                  fontFamily: tokens.typography.sans,
                  fontSize: 11,
                  fontWeight: '700',
                }}
              >
                Trending
              </Text>
            </>
          ) : null}
        </View>

        <Text
          numberOfLines={2}
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 16,
            lineHeight: 21,
            fontWeight: '700',
          }}
        >
          {title}
        </Text>

        {excerpt ? (
          <Text
            numberOfLines={2}
            style={{
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            {excerpt}
          </Text>
        ) : null}

        {post.commentCount > 0 ? (
          <View style={styles.replyRow}>
            <FontAwesome name="comment-o" size={12} color={tokens.colors.textTertiary} />
            <Text
              style={{
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  copy: {
    flex: 1,
    gap: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  metaDot: {
    fontSize: 11,
    lineHeight: 14,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
});
