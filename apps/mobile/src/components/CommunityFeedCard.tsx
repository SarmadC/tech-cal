import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileCommunityFeedPost } from "@kurecal/domain";

import {
  formatCommunityRelativeTime,
  summarizeCommunityPost,
} from "../lib/communityPresentation";
import { useAppTheme } from "../providers/ThemeProvider";

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
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      <View style={styles.metaRow}>
        <Text
          style={[
            styles.circleLabel,
            { color: tokens.colors.accent, fontFamily: tokens.typography.sans },
          ]}
        >
          {showCircle
            ? post.circle.name
            : post.author.fullName || "Community member"}
        </Text>
        <Text
          style={[
            styles.metaText,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {formatCommunityRelativeTime(post.createdAt)}
        </Text>
      </View>

      <Text
        style={[
          styles.body,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {summarizeCommunityPost(post.content)}
      </Text>

      <View style={styles.footerRow}>
        <Text
          style={[
            styles.footerText,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {post.commentCount} repl{post.commentCount === 1 ? "y" : "ies"}
        </Text>
        {post.isTrending ? (
          <View
            style={[
              styles.trendingPill,
              {
                backgroundColor: tokens.colors.accentSoft,
                borderColor: tokens.colors.borderStrong,
                borderRadius: tokens.radius.xs,
              },
            ]}
          >
            <Text
              style={[
                styles.trendingLabel,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              Trending
            </Text>
          </View>
        ) : null}
      </View>

      {post.recentComments?.length ? (
        <View
          style={[
            styles.previewStack,
            { borderTopColor: tokens.colors.divider },
          ]}
        >
          {post.recentComments.slice(0, 2).map((comment) => (
            <View key={comment.id} style={styles.previewRow}>
              <Text
                numberOfLines={1}
                style={[
                  styles.previewAuthor,
                  {
                    color: tokens.colors.textSecondary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                {comment.author.fullName || "Member"}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.previewBody,
                  {
                    color: tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
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
  const { tokens } = useAppTheme();

  if (!onPress) {
    return <Content post={post} showCircle={showCircle} />;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        { borderRadius: tokens.radius.md },
        pressed ? styles.pressablePressed : null,
      ]}
    >
      <Content post={post} showCircle={showCircle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  circleLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.66,
    textTransform: "uppercase",
  },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "600",
  },
  previewAuthor: {
    fontSize: 12,
    fontWeight: "700",
    minWidth: 88,
  },
  previewBody: {
    flex: 1,
    fontSize: 12,
  },
  previewRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  previewStack: {
    borderTopWidth: 1,
    gap: 6,
    paddingTop: 8,
  },
  pressable: {},
  pressablePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  trendingLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  trendingPill: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
