import type { MobileCommunityRoomThread } from '@kurecal/domain';
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
import { loadMobileEventThreads } from '../../lib/mobileApi';
import { useAppTheme } from '../../providers/ThemeProvider';

const ROOM_THRESHOLD = 5;
const PREVIEW_LIMIT = 3;

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

function ThreadAvatar({ avatarUrl, name }: { avatarUrl: string | null | undefined; name: string }) {
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

// ─── thread preview row ──────────────────────────────────────────────────────

function ThreadPreviewRow({
  thread,
  isLast,
  onPress,
}: {
  thread: MobileCommunityRoomThread;
  isLast: boolean;
  onPress: () => void;
}) {
  const { tokens } = useAppTheme();
  const authorName = thread.author.fullName ?? `@${thread.author.username}`;

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
      <ThreadAvatar avatarUrl={thread.author.avatarUrl} name={authorName} />
      <Text
        numberOfLines={1}
        style={[styles.previewTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}
      >
        {thread.title}
      </Text>
      <Text
        style={[styles.previewMeta, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}
      >
        {thread.commentCount > 0 ? `${thread.commentCount} repl${thread.commentCount === 1 ? 'y' : 'ies'}` : formatRelative(thread.lastActivityAt)}
      </Text>
    </Pressable>
  );
}

// ─── room banner ─────────────────────────────────────────────────────────────

function RoomBanner({
  threadCount,
  lastActivityAt,
  onViewRoom,
  onNewThread,
}: {
  threadCount: number;
  lastActivityAt: string | null;
  onViewRoom: () => void;
  onNewThread: () => void;
}) {
  const { tokens } = useAppTheme();
  const newThreadPress = useScalePress();
  const viewRoomPress = useScalePress();

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border, borderRadius: tokens.radius.sm },
      ]}
    >
      <View style={styles.bannerMeta}>
        <Text style={[styles.bannerTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
          Event Room
        </Text>
        <Text style={[styles.bannerSub, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
          {threadCount} thread{threadCount !== 1 ? 's' : ''}
          {lastActivityAt ? ` · active ${formatRelative(lastActivityAt)}` : ''}
        </Text>
      </View>
      <View style={styles.bannerActions}>
        <Pressable
          accessibilityRole="button"
          onPress={onNewThread}
          onPressIn={newThreadPress.onPressIn}
          onPressOut={newThreadPress.onPressOut}
          style={[styles.ghostButton, { borderColor: tokens.colors.border, borderRadius: tokens.radius.sm }]}
        >
          <Animated.View style={{ transform: [{ scale: newThreadPress.scale }] }}>
            <Text style={[styles.ghostButtonLabel, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
              New thread
            </Text>
          </Animated.View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onViewRoom}
          onPressIn={viewRoomPress.onPressIn}
          onPressOut={viewRoomPress.onPressOut}
          style={[styles.accentButton, { backgroundColor: tokens.colors.accent, borderRadius: tokens.radius.sm }]}
        >
          <Animated.View style={{ transform: [{ scale: viewRoomPress.scale }] }}>
            <Text style={[styles.accentButtonLabel, { color: tokens.colors.textInverse, fontFamily: tokens.typography.sans }]}>
              View Room
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
  | { status: 'loaded'; threads: MobileCommunityRoomThread[]; totalCount: number };

export function EventDiscussionSection({ eventId }: { eventId: string }) {
  const { tokens } = useAppTheme();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  // Guard against stale responses from in-flight requests on focus change
  const requestSequenceRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestSequenceRef.current;
    // Only show loading spinner on first fetch; keep stale data visible on re-fetches
    setLoadState((prev) => (prev.status === 'loaded' ? prev : { status: 'loading' }));
    try {
      const data = await loadMobileEventThreads(eventId);
      if (requestId !== requestSequenceRef.current) return;
      setLoadState({
        status: 'loaded',
        threads: data.threads,
        totalCount: data.threads.length,
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

  const goToThreads = useCallback(() => {
    router.push(`/event/${eventId}/threads`);
  }, [eventId]);

  const goToNewThread = useCallback(() => {
    router.push(`/event/${eventId}/threads/new`);
  }, [eventId]);

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

  const { threads, totalCount } = loadState;
  const roomOpen = totalCount >= ROOM_THRESHOLD;
  const preview = threads.slice(0, PREVIEW_LIMIT);
  const isEmpty = threads.length === 0;
  const lastActivityAt = threads[0]?.lastActivityAt ?? null;
  const emptyPress = useScalePress();

  return (
    <View style={styles.section}>
      {/* ── header row ─────────────────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
          Discussions
        </Text>
        {/* Only show header button when there are threads and the room isn't open yet */}
        {!roomOpen && !isEmpty && (
          <Pressable
            accessibilityRole="button"
            onPress={goToNewThread}
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
          threadCount={totalCount}
          lastActivityAt={lastActivityAt}
          onViewRoom={goToThreads}
          onNewThread={goToNewThread}
        />
      ) : isEmpty ? (
        <Pressable
          accessibilityRole="button"
          onPress={goToNewThread}
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
            {preview.map((thread, index) => (
              <ThreadPreviewRow
                key={thread.id}
                thread={thread}
                isLast={index === preview.length - 1}
                onPress={() => router.push(`/event/${eventId}/threads/${thread.id}`)}
              />
            ))}
          </View>
          {totalCount > PREVIEW_LIMIT && (
            <Pressable
              accessibilityRole="button"
              onPress={goToThreads}
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
    paddingHorizontal: 12,
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
    paddingHorizontal: 12,
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
    paddingHorizontal: 12,
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
    paddingHorizontal: 16,
    paddingTop: 20,
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
