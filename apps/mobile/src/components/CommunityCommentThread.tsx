import { StyleSheet, Text, View } from "react-native";

import type { MobileCommunityComment } from "@kurecal/domain";

import { formatCommunityRelativeTime } from "../lib/communityPresentation";
import { useAppTheme } from "../providers/ThemeProvider";

interface CommunityCommentThreadProps {
  comment: MobileCommunityComment;
  depth?: number;
}

export function CommunityCommentThread({
  comment,
  depth = 0,
}: CommunityCommentThreadProps) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor:
            depth > 0 ? tokens.colors.surfaceMuted : tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.authorLabel,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {comment.author.fullName || "Community member"}
        </Text>
        <Text
          style={[
            styles.metaLabel,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {formatCommunityRelativeTime(comment.createdAt)}
        </Text>
        {typeof comment.score === "number" ? (
          <Text
            style={[
              styles.metaLabel,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Score {comment.score}
          </Text>
        ) : null}
      </View>

      <Text
        style={[
          styles.body,
          {
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {comment.content}
      </Text>

      {comment.replies.length ? (
        <View
          style={[styles.replies, { borderLeftColor: tokens.colors.border }]}
        >
          {comment.replies.map((reply) => (
            <CommunityCommentThread
              key={reply.id}
              comment={reply}
              depth={depth + 1}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  authorLabel: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  replies: {
    borderLeftWidth: 1,
    gap: 8,
    marginLeft: 6,
    marginTop: 6,
    paddingLeft: 8,
  },
  root: {
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
});
