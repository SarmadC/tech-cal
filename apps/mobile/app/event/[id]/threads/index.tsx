import type {
  MobileCommunityRoomThread,
  MobileCommunityRoomThreadList,
} from "@kurecal/domain";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  HeaderActionButton,
  MobilePage,
} from "../../../../src/components/chrome/MobilePage";
import { ScreenState } from "../../../../src/components/chrome/ScreenState";
import { loadMobileEventThreads } from "../../../../src/lib/mobileApi";
import { useAppTheme } from "../../../../src/providers/ThemeProvider";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatRelative(value: string): string {
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "Recently";
  const diff = Date.now() - ts;
  const minutes = Math.max(1, Math.round(diff / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatReplyLabel(count: number): string {
  if (count === 0) return "No replies";
  if (count === 1) return "1 reply";
  return `${count} replies`;
}

export default function EventThreadsScreen() {
  const { tokens } = useAppTheme();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [threads, setThreads] = useState<MobileCommunityRoomThread[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequenceRef = useRef(0);

  const loadPage = useCallback(
    async (mode: "initial" | "more") => {
      if (!eventId) {
        setError("Event id is missing");
        setLoading(false);
        return;
      }

      const requestId = ++requestSequenceRef.current;
      if (mode === "initial") {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const cursor = mode === "more" ? nextCursor : null;
        const data: MobileCommunityRoomThreadList = await loadMobileEventThreads(
          eventId,
          cursor,
        );
        if (requestId !== requestSequenceRef.current) return;
        setThreads((existing) =>
          mode === "more" ? [...existing, ...data.threads] : data.threads,
        );
        setNextCursor(data.nextCursor);
        setError(null);
      } catch (nextError) {
        if (requestId !== requestSequenceRef.current) return;
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to load threads",
        );
      } finally {
        if (requestId === requestSequenceRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [eventId, nextCursor],
  );

  useFocusEffect(
    useCallback(() => {
      void loadPage("initial");
      // We intentionally don't depend on loadPage (which depends on nextCursor)
      // because focus refresh should reset to the first page.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]),
  );

  const openThread = (threadId: string) => {
    if (!eventId) return;
    router.push(`/event/${eventId}/threads/${threadId}`);
  };

  const openComposer = () => {
    if (!eventId) return;
    router.push(`/event/${eventId}/threads/new`);
  };

  return (
    <MobilePage
      title="Threads"
      action={
        <HeaderActionButton label="Back" onPress={() => router.back()} />
      }
    >
      {loading && threads.length === 0 ? (
        <ScreenState
          mode="loading"
          title="Loading threads"
          description="Pulling the latest discussions for this event."
        />
      ) : null}

      {error && threads.length === 0 ? (
        <ScreenState
          mode="error"
          title="Threads unavailable"
          description={error}
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadPage("initial")}
              style={({ pressed }) => [
                styles.retryButton,
                {
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.sm,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={{
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                Try again
              </Text>
            </Pressable>
          }
        />
      ) : null}

      {!loading || threads.length > 0 ? (
        <View style={styles.stack}>
          <Pressable
            accessibilityRole="button"
            onPress={openComposer}
            style={({ pressed }) => [
              styles.startButton,
              {
                backgroundColor: tokens.colors.accent,
                borderRadius: tokens.radius.sm,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={{
                color: tokens.colors.textInverse,
                fontFamily: tokens.typography.sans,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              Start a thread
            </Text>
          </Pressable>

          {threads.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: tokens.colors.surface,
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.sm,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                No threads yet
              </Text>
              <Text
                style={[
                  styles.emptyBody,
                  {
                    color: tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                Start the first conversation about this event.
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.list,
                {
                  backgroundColor: tokens.colors.surface,
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.sm,
                },
              ]}
            >
              {threads.map((thread, index) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  isLast={index === threads.length - 1}
                  onOpen={() => openThread(thread.id)}
                />
              ))}
            </View>
          )}

          {nextCursor ? (
            <Pressable
              accessibilityRole="button"
              disabled={loadingMore}
              onPress={() => void loadPage("more")}
              style={({ pressed }) => [
                styles.loadMore,
                {
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.sm,
                },
                pressed && styles.pressed,
              ]}
            >
              {loadingMore ? (
                <ActivityIndicator
                  color={tokens.colors.textSecondary}
                  size="small"
                />
              ) : (
                <Text
                  style={{
                    color: tokens.colors.textSecondary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  Load more
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </MobilePage>
  );
}

function ThreadCard({
  isLast,
  onOpen,
  thread,
}: {
  isLast: boolean;
  onOpen: () => void;
  thread: MobileCommunityRoomThread;
}) {
  const { tokens } = useAppTheme();
  const authorName = thread.author.fullName || `@${thread.author.username}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        !isLast && {
          borderBottomColor: tokens.colors.divider,
          borderBottomWidth: 1,
        },
        pressed && { backgroundColor: tokens.colors.surfaceMuted },
      ]}
    >
      <View style={styles.cardAuthorRow}>
        <Avatar
          avatarUrl={thread.author.avatarUrl}
          name={authorName}
          size={20}
        />
        <Text
          numberOfLines={1}
          style={{
            color: tokens.colors.textSecondary,
            flex: 1,
            fontFamily: tokens.typography.sans,
            fontSize: 12,
            fontWeight: "600",
          }}
        >
          {authorName}
          {thread.isAuthor ? " · you" : ""}
        </Text>
        <Text
          style={{
            color: tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
            fontSize: 11,
            fontWeight: "500",
          }}
        >
          {formatRelative(thread.lastActivityAt)}
        </Text>
      </View>
      <Text
        numberOfLines={2}
        style={[
          styles.cardTitle,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {thread.title}
      </Text>
      <Text
        numberOfLines={2}
        style={[
          styles.cardBody,
          {
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {thread.body}
      </Text>
      <Text
        style={[
          styles.cardMeta,
          {
            color: tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {formatReplyLabel(thread.commentCount)}
      </Text>
    </Pressable>
  );
}

function isSafeAvatarUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

function Avatar({
  avatarUrl,
  name,
  size,
}: {
  avatarUrl: string | null;
  name: string;
  size: number;
}) {
  const { tokens } = useAppTheme();

  if (isSafeAvatarUrl(avatarUrl)) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: tokens.colors.surfaceMuted,
        borderRadius: size / 2,
        height: size,
        justifyContent: "center",
        width: size,
      }}
    >
      <Text
        style={{
          color: tokens.colors.textPrimary,
          fontFamily: tokens.typography.sans,
          fontSize: size < 30 ? 10 : 12,
          fontWeight: "700",
        }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cardAuthorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  cardBody: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  cardMeta: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  emptyBody: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  list: {
    borderWidth: 1,
    overflow: "hidden",
  },
  loadMore: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.82,
  },
  retryButton: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  stack: {
    gap: 10,
  },
  startButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 12,
  },
});
