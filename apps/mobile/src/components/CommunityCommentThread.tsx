import { StyleSheet, Text, View } from 'react-native';

import type { MobileCommunityComment } from '@kurecal/domain';

import { formatCommunityRelativeTime } from '../lib/communityPresentation';

interface CommunityCommentThreadProps {
  comment: MobileCommunityComment;
  depth?: number;
}

export function CommunityCommentThread({
  comment,
  depth = 0,
}: CommunityCommentThreadProps) {
  return (
    <View style={[styles.root, depth > 0 ? styles.replyRoot : null]}>
      <View style={styles.headerRow}>
        <Text style={styles.authorLabel}>
          {comment.author.fullName || 'Community member'}
        </Text>
        <Text style={styles.metaLabel}>
          {formatCommunityRelativeTime(comment.createdAt)}
        </Text>
        {typeof comment.score === 'number' ? (
          <Text style={styles.metaLabel}>Score {comment.score}</Text>
        ) : null}
      </View>

      <Text style={styles.body}>{comment.content}</Text>

      {comment.replies.length ? (
        <View style={styles.replies}>
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
    color: '#f8fafc',
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  replies: {
    borderLeftColor: 'rgba(148, 163, 184, 0.14)',
    borderLeftWidth: 1,
    gap: 12,
    marginLeft: 8,
    marginTop: 12,
    paddingLeft: 12,
  },
  replyRoot: {
    backgroundColor: 'rgba(15, 23, 42, 0.36)',
  },
  root: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
});
