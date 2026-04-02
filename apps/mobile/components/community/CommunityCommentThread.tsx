import { StyleSheet, Text, View } from 'react-native';
import type { MobileCommunityComment } from '@kurecal/domain';
import { useAppTheme } from '@/providers/ThemeProvider';
import { CommunityAvatar } from '@/components/community/CommunityAvatar';
import { formatCommunityRelativeTime } from '@/components/community/presentation';

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
    <View style={[styles.thread, depth > 0 && styles.nestedThread]}>
      <View
        style={[
          styles.card,
          {
            marginLeft: depth > 0 ? 14 : 0,
            backgroundColor: tokens.colors.surfaceMuted,
            borderColor: tokens.colors.border,
            borderRadius: tokens.radius.sm,
          },
        ]}
      >
        <CommunityAvatar
          name={comment.author.fullName}
          avatarUrl={comment.author.avatarUrl}
          size={34}
        />

        <View style={styles.copy}>
          <View style={styles.metaRow}>
            <Text
              style={{
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {comment.author.fullName || 'Anonymous'}
            </Text>
            <Text style={[styles.metaDot, { color: tokens.colors.textTertiary }]}>•</Text>
            <Text
              style={{
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
                fontSize: 11,
                fontWeight: '600',
              }}
            >
              {formatCommunityRelativeTime(comment.createdAt)}
            </Text>
          </View>

          <Text
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 14,
              lineHeight: 19,
            }}
          >
            {comment.content}
          </Text>
        </View>
      </View>

      {(comment.replies ?? []).map((reply) => (
        <CommunityCommentThread key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  thread: {
    gap: 10,
  },
  nestedThread: {
    marginTop: 6,
  },
  card: {
    borderWidth: 1,
    padding: 12,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDot: {
    fontSize: 11,
    lineHeight: 14,
  },
});
