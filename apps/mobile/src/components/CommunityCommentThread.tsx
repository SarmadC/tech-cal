import { Feather } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileCommunityComment } from "@kurecal/domain";

import { formatCommunityRelativeTime } from "../lib/communityPresentation";
import { useAppTheme } from "../providers/ThemeProvider";

interface CommunityCommentThreadProps {
  comment: MobileCommunityComment;
  depth?: number;
  currentUserId?: string | null;
  onDelete?: (comment: MobileCommunityComment) => void;
  onReply?: (comment: MobileCommunityComment) => void;
  onReport?: (comment: MobileCommunityComment) => void;
  onShare?: (comment: MobileCommunityComment) => void;
  onVote?: (comment: MobileCommunityComment, voteType: -1 | 1) => void;
  originalPosterId?: string;
  votingDisabled?: boolean;
}

function getAuthorInitial(comment: MobileCommunityComment) {
  return getAuthorDisplayName(comment).slice(0, 1).toUpperCase();
}

function getAuthorDisplayName(comment: MobileCommunityComment) {
  return comment.author.fullName || comment.author.id.slice(0, 8);
}

export function CommunityCommentThread({
  comment,
  depth = 0,
  currentUserId,
  onDelete,
  onReply,
  onReport,
  onShare,
  onVote,
  originalPosterId,
  votingDisabled = false,
}: CommunityCommentThreadProps) {
  const { tokens } = useAppTheme();
  const currentVote = comment.userVote ?? 0;
  const isOriginalPoster = Boolean(originalPosterId && comment.author.id === originalPosterId);
  const canDelete = Boolean(
    currentUserId &&
      currentUserId === comment.author.id &&
      !comment.isRemoved &&
      onDelete
  );

  return (
    <View
      style={[
        styles.root,
        {
          borderColor: tokens.colors.border,
          marginLeft: depth > 0 ? 14 : 0,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.threadLine,
          {
            backgroundColor: tokens.colors.headerBorder,
            left: depth > 0 ? -8 : 11,
          },
        ]}
      />
      <View style={styles.commentRow}>
        <View style={[styles.avatar, { backgroundColor: tokens.colors.surfaceMuted }]}>
          {comment.author.avatarUrl ? (
            <Image source={{ uri: comment.author.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text
              style={[
                styles.avatarInitial,
                {
                  color: tokens.colors.accent,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {getAuthorInitial(comment)}
            </Text>
          )}
        </View>
        <View style={styles.commentContent}>
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
              {getAuthorDisplayName(comment)}
            </Text>
            {isOriginalPoster ? (
              <View style={[styles.opBadge, { borderColor: tokens.colors.accent }]}>
                <Text
                  style={[
                    styles.opBadgeText,
                    {
                      color: tokens.colors.accent,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  OP
                </Text>
              </View>
            ) : null}
            <Text
              style={[
                styles.metaDot,
                {
                  color: tokens.colors.textTertiary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              ·
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

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => onVote?.(comment, 1)}
              disabled={!onVote || votingDisabled}
              hitSlop={8}
              style={({ pressed }) => [
                styles.voteButton,
                pressed ? styles.pressed : null,
              ]}
              accessibilityLabel="Upvote comment"
            >
              <Feather
                name="arrow-up"
                size={15}
                color={currentVote === 1 ? tokens.colors.accent : tokens.colors.textTertiary}
              />
            </Pressable>
            <Text
              style={[
                styles.scoreLabel,
                {
                  color: tokens.colors.textTertiary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {comment.score ?? 0}
            </Text>
            <Pressable
              onPress={() => onVote?.(comment, -1)}
              disabled={!onVote || votingDisabled}
              hitSlop={8}
              style={({ pressed }) => [
                styles.voteButton,
                pressed ? styles.pressed : null,
              ]}
              accessibilityLabel="Downvote comment"
            >
              <Feather
                name="arrow-down"
                size={15}
                color={currentVote === -1 ? tokens.colors.danger : tokens.colors.textTertiary}
              />
            </Pressable>
            <Pressable
              onPress={() => onReply?.(comment)}
              disabled={!onReply}
              hitSlop={8}
              style={({ pressed }) => [
                styles.inlineActionButton,
                pressed ? styles.pressed : null,
              ]}
              accessibilityLabel="Reply to comment"
            >
              <Text style={[
                styles.inlineAction,
                styles.primaryInlineAction,
                { color: tokens.colors.textTertiary },
              ]}>
                Reply
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onShare?.(comment)}
              disabled={!onShare}
              hitSlop={8}
              style={({ pressed }) => [
                styles.inlineActionButton,
                pressed ? styles.pressed : null,
              ]}
              accessibilityLabel="Share comment"
            >
              <Text style={[styles.inlineAction, { color: tokens.colors.textTertiary }]}>
                Share
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onReport?.(comment)}
              disabled={!onReport}
              hitSlop={8}
              style={({ pressed }) => [
                styles.inlineActionButton,
                pressed ? styles.pressed : null,
              ]}
              accessibilityLabel="Report comment"
            >
              <Text style={[styles.inlineAction, { color: tokens.colors.textTertiary }]}>
                Report
              </Text>
            </Pressable>
            {canDelete ? (
              <Pressable
                onPress={() => onDelete?.(comment)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.inlineActionButton,
                  pressed ? styles.pressed : null,
                ]}
                accessibilityLabel="Delete reply"
              >
                <Text style={[styles.inlineAction, { color: tokens.colors.danger }]}>
                  Delete
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {comment.replies.length ? (
        <View
          style={[styles.replies, { borderLeftColor: tokens.colors.border }]}
        >
          {comment.replies.map((reply) => (
            <CommunityCommentThread
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              depth={depth + 1}
              onDelete={onDelete}
              onReply={onReply}
              onReport={onReport}
              onShare={onShare}
              onVote={onVote}
              originalPosterId={originalPosterId}
              votingDisabled={votingDisabled}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderRadius: 4,
    height: 22,
    justifyContent: "center",
    overflow: "hidden",
    width: 22,
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  avatarInitial: {
    fontSize: 11,
    fontWeight: "700",
  },
  authorLabel: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  commentContent: {
    flex: 1,
    gap: 7,
  },
  commentRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    zIndex: 2,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  metaDot: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14,
  },
  opBadge: {
    alignItems: "center",
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 16,
    paddingHorizontal: 4,
  },
  opBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 12,
  },
  inlineAction: {
    fontSize: 11,
    fontWeight: "500",
  },
  inlineActionButton: {
    alignItems: "center",
    borderRadius: 4,
    justifyContent: "center",
    minHeight: 30,
    paddingHorizontal: 6,
  },
  primaryInlineAction: {
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.84,
  },
  replies: {
    borderLeftWidth: 1,
    gap: 0,
    marginTop: 10,
    paddingLeft: 10,
  },
  root: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
    paddingVertical: 12,
    position: "relative",
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: "600",
    minWidth: 14,
    textAlign: "center",
  },
  voteButton: {
    alignItems: "center",
    borderRadius: 4,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  threadLine: {
    bottom: 12,
    position: "absolute",
    top: 12,
    width: StyleSheet.hairlineWidth,
  },
});
