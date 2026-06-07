import type { MobileCommunityFeedPost } from '@kurecal/domain';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useScalePress } from '../../hooks/useAnimation';
import { loadMobileEventCommunityPosts } from '../../lib/mobileApi';
import { useAppTheme } from '../../providers/ThemeProvider';

const ROOM_THRESHOLD = 5;
const PREVIEW_LIMIT = 3;
const DETAIL_CARD_INSET = 18;

// ─── helpers ────────────────────────────────────────────────────────────────

function formatRelative(value: string): string {
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return 'recently';
  const diff = Date.now() - ts;
  const minutes = Math.max(1, Math.round(diff / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function isSafeUrl(url: string | null | undefined): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

function PostAvatar({ avatarUrl, name }: { avatarUrl: string | null | undefined; name: string }) {
  const { tokens } = useAppTheme();
  const size = 20;

  if (isSafeUrl(avatarUrl)) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: tokens.colors.surfaceMuted,
        borderRadius: size / 2,
        height: size,
        justifyContent: 'center',
        width: size,
      }}
    >
      <Text
        style={{
          color: tokens.colors.textSecondary,
          fontFamily: tokens.typography.sans,
          fontSize: 9,
          fontWeight: '700',
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

// ─── post preview row ────────────────────────────────────────────────────────

function PostPreviewRow({
  post,
  isLast,
  onPress,
}: {
  post: MobileCommunityFeedPost;
  isLast: boolean;
  onPress: () => void;
}) {
  const { tokens } = useAppTheme();
  const authorName = post.author.fullName ?? 'Community member';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.previewRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: tokens.colors.divider },
        pressed && { backgroundColor: tokens.colors.surfaceMuted },
      ]}
    >
      <PostAvatar avatarUrl={post.author.avatarUrl} name={authorName} />
      <Text
        numberOfLines={1}
        style={[styles.previewTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}
      >
        {post.title}
      </Text>
      <Text
        style={[styles.previewMeta, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}
      >
        {post.commentCount > 0
          ? `${post.commentCount} repl${post.commentCount === 1 ? 'y' : 'ies'}`
          : formatRelative(post.createdAt)}
      </Text>
    </Pressable>
  );
}

// ─── room banner ─────────────────────────────────────────────────────────────

function RoomBanner({
  postCount,
  lastActivityAt,
  onViewAll,
  onNewPost,
}: {
  postCount: number;
  lastActivityAt: string | null;
  onViewAll: () => void;
  onNewPost: () => void;
}) {
  const { tokens } = useAppTheme();
  const newPostPress = useScalePress();
  const viewAllPress = useScalePress();

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border, borderRadius: tokens.radius.sm },
      ]}
    >
      <View style={styles.bannerMeta}>
        <Text style={[styles.bannerTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
          Event Discussions
        </Text>
        <Text style={[styles.bannerSub, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
          {postCount} post{postCount !== 1 ? 's' : ''}
          {lastActivityAt ? ` · active ${formatRelative(lastActivityAt)}` : ''}
        </Text>
      </View>
      <View style={styles.bannerActions}>
        <Pressable
          accessibilityRole="button"
          onPress={onNewPost}
          onPressIn={newPostPress.onPressIn}
          onPressOut={newPostPress.onPressOut}
          style={[styles.ghostButton, { borderColor: tokens.colors.border, borderRadius: tokens.radius.sm }]}
        >
          <Animated.View style={{ transform: [{ scale: newPostPress.scale }] }}>
            <Text style={[styles.ghostButtonLabel, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
              New post
            </Text>
          </Animated.View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onViewAll}
          onPressIn={viewAllPress.onPressIn}
          onPressOut={viewAllPress.onPressOut}
          style={[styles.accentButton, { backgroundColor: tokens.colors.accent, borderRadius: tokens.radius.sm }]}
        >
          <Animated.View style={{ transform: [{ scale: viewAllPress.scale }] }}>
            <Text style={[styles.accentButtonLabel, { color: tokens.colors.textInverse, fontFamily: tokens.typography.sans }]}>
              View All
            </Text>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

// ─── main section ────────────────────────────────────────────────────────────

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; posts: MobileCommunityFeedPost[]; totalCount: number };

export function EventDiscussionSection({
  eventId,
  onStartThread,
}: {
  eventId: string;
  onStartThread: () => void;
}) {
  const { tokens } = useAppTheme();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  // Guard against stale responses from in-flight requests on focus change
  const requestSequenceRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestSequenceRef.current;
    // Only show loading spinner on first fetch; keep stale data visible on re-fetches
    setLoadState((prev) => (prev.status === 'loaded' ? prev : { status: 'loading' }));
    try {
      const data = await loadMobileEventCommunityPosts(eventId);
      if (requestId !== requestSequenceRef.current) return;
      setLoadState({
        status: 'loaded',
        posts: data.posts,
        totalCount: data.totalCount,
      });
    } catch {
      if (requestId !== requestSequenceRef.current) return;
      // On re-fetch failure, keep stale data rather than showing an error
      setLoadState((prev) => (prev.status === 'loaded' ? prev : { status: 'error' }));
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Must be declared before any early returns (Rules of Hooks)
  const emptyPress = useScalePress();

  // ── loading ──────────────────────────────────────────────────────────────
  if (loadState.status === 'loading') {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
            Discussions
          </Text>
        </View>
        <View
          style={[
            styles.previewList,
            { backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border, borderRadius: tokens.radius.sm },
          ]}
        >
          {[0, 1].map((i) => (
            <View
              key={i}
              style={[
                styles.previewRow,
                i > 0 && { borderTopWidth: 1, borderTopColor: tokens.colors.divider },
              ]}
            >
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: tokens.colors.surfaceMuted }} />
              <View style={{ flex: 1, height: 11, borderRadius: 4, backgroundColor: tokens.colors.surfaceMuted }} />
              <View style={{ width: 36, height: 10, borderRadius: 4, backgroundColor: tokens.colors.surfaceMuted }} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ── error ────────────────────────────────────────────────────────────────
  if (loadState.status === 'error') {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
            Discussions
          </Text>
        </View>
        <Pressable onPress={() => void load()} style={styles.retryRow}>
          <Text style={[styles.retryText, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
            Couldn't load discussions.{' '}
          </Text>
          <Text style={[styles.retryLink, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  const { posts, totalCount } = loadState;
  const roomOpen = totalCount >= ROOM_THRESHOLD;
  const preview = posts.slice(0, PREVIEW_LIMIT);
  const isEmpty = posts.length === 0;
  const lastActivityAt = posts[0]?.createdAt ?? null;

  const goToPost = (post: MobileCommunityFeedPost) => {
    router.push(`/community/${post.circle.slug}/post/${post.id}`);
  };

  return (
    <View style={styles.section}>
      {/* ── header row ─────────────────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
          Discussions
        </Text>
        {/* Only show header button when there are posts and the room isn't open yet */}
        {!roomOpen && !isEmpty && (
          <Pressable
            accessibilityRole="button"
            onPress={onStartThread}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={[styles.headerAction, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
              + Add
            </Text>
          </Pressable>
        )}
      </View>

      {/* ── body ───────────────────────────────────────────────────────── */}
      {roomOpen ? (
        <RoomBanner
          postCount={totalCount}
          lastActivityAt={lastActivityAt}
          onViewAll={() => {
            if (posts[0]) goToPost(posts[0]);
          }}
          onNewPost={onStartThread}
        />
      ) : isEmpty ? (
        <Pressable
          accessibilityRole="button"
          onPress={onStartThread}
          onPressIn={emptyPress.onPressIn}
          onPressOut={emptyPress.onPressOut}
          style={[styles.emptyPrompt, { borderColor: tokens.colors.border, borderRadius: tokens.radius.sm }]}
        >
          <Animated.View style={{ transform: [{ scale: emptyPress.scale }] }}>
            <Text style={[styles.emptyText, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
              No discussions yet. Be the first →
            </Text>
          </Animated.View>
        </Pressable>
      ) : (
        <>
          <View
            style={[
              styles.previewList,
              { backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border, borderRadius: tokens.radius.sm },
            ]}
          >
            {preview.map((post, index) => (
              <PostPreviewRow
                key={post.id}
                post={post}
                isLast={index === preview.length - 1}
                onPress={() => goToPost(post)}
              />
            ))}
          </View>
          {totalCount > PREVIEW_LIMIT && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (posts[0]) goToPost(posts[0]);
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, alignSelf: 'flex-start' })}
            >
              <Text style={[styles.seeAll, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
                See all {totalCount} discussions →
              </Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  accentButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  accentButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  banner: {
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: DETAIL_CARD_INSET,
    paddingVertical: 10,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bannerMeta: {
    flex: 1,
    gap: 2,
  },
  bannerSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyPrompt: {
    borderWidth: 1,
    paddingHorizontal: DETAIL_CARD_INSET,
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  ghostButton: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  ghostButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerAction: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewList: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewMeta: {
    flexShrink: 0,
    fontSize: 11,
    fontWeight: '500',
  },
  previewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: DETAIL_CARD_INSET,
    paddingVertical: 10,
  },
  previewTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  retryLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  retryRow: {
    flexDirection: 'row',
  },
  retryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '600',
  },
});
