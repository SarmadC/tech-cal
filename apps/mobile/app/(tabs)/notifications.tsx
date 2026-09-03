import { FontAwesome } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NotificationItem } from "../../src/components/notifications/NotificationItem";
import { TabMenuOverlay } from "../../src/components/chrome/TabMenuOverlay";
import { useAppTheme } from "../../src/providers/ThemeProvider";
import { useScrollControlsVisibility } from "../../src/hooks/useScrollControlsVisibility";
import {
  loadMobileNotifications,
  dismissMobileNotifications,
  markMobileNotificationsRead,
} from "../../src/lib/mobileApi";
import {
  pushPayloadForNotification,
  routeForNotificationData,
} from "../../src/lib/notificationRouting";
import {
  adjustLocalUnreadCount,
  setLocalUnreadCount,
  useUnreadNotifications,
} from "../../src/hooks/useUnreadNotifications";
import type {
  MobileNotificationItem,
  MobileNotificationListResponse,
} from "@kurecal/domain";
import { haptics } from "../../src/lib/haptics";
import { useAuth } from "../../src/context/AuthProvider";
import {
  readMobileSnapshot,
  removeItemsFromMobileSnapshot,
  writeMobileSnapshot,
} from "../../src/lib/mobileSnapshotCache";
import {
  beginNotificationDismissal,
  filterPendingNotification,
  restoreNotificationDismissal,
  type PendingNotificationDismissal,
} from "../../src/lib/notificationDismissal";
import { dismissPresentedNotificationByInboxId } from "../../src/lib/pushNotifications";

const UNDO_WINDOW_MS = 5_000;

export default function NotificationsScreen() {
  const { tokens } = useAppTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { count, refresh: refreshUnread } = useUnreadNotifications();

  const [items, setItems] = useState<MobileNotificationItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [mode, setMode] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [headerControlsVisible, setHeaderControlsVisible] = useState(true);
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [pendingDismissal, setPendingDismissal] =
    useState<PendingNotificationDismissal | null>(null);
  const [dismissError, setDismissError] = useState<string | null>(null);
  const visibleUnreadIds = useRef<Set<string>>(new Set());
  const itemsRef = useRef(items);
  const pendingDismissalRef = useRef(pendingDismissal);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitPendingRef = useRef<
    ((pending: PendingNotificationDismissal) => Promise<void>) | null
  >(null);
  const handleScroll = useScrollControlsVisibility({
    onVisibilityChange: setHeaderControlsVisible,
  });

  const loadFirstPage = useCallback(async () => {
    try {
      const page = await loadMobileNotifications({ limit: 30 });
      const visibleItems = filterPendingNotification(
        page.items,
        pendingDismissalRef.current?.item.id ?? null,
      );
      itemsRef.current = visibleItems;
      setItems(visibleItems);
      setCursor(page.nextCursor);
      visibleItems.forEach((item) => {
        if (item.readAt == null) visibleUnreadIds.current.add(item.id);
      });
      setMode("ready");
      // Keep pending dismissals out of the UI without persisting them before
      // the Undo window has elapsed.
      void writeMobileSnapshot(
        profile?.profile.id ?? "signed-out",
        "notifications",
        page,
      );
    } catch {
      const cached = await readMobileSnapshot<MobileNotificationListResponse>(
        profile?.profile.id ?? "signed-out",
        "notifications",
      );
      if (cached) {
        const visibleItems = filterPendingNotification(
          cached.value.items,
          pendingDismissalRef.current?.item.id ?? null,
        );
        itemsRef.current = visibleItems;
        setItems(visibleItems);
        setCursor(cached.value.nextCursor);
        setMode("ready");
      } else {
        setMode("error");
      }
    }
  }, [profile?.profile.id]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    pendingDismissalRef.current = pendingDismissal;
  }, [pendingDismissal]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    visibleUnreadIds.current.clear();
    await loadFirstPage();
    await refreshUnread();
    if (pendingDismissalRef.current?.item.readAt == null) {
      adjustLocalUnreadCount(-1);
    }
    haptics.success();
    setRefreshing(false);
  }, [loadFirstPage, refreshUnread]);

  const onEndReached = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await loadMobileNotifications({ cursor, limit: 30 });
      const nextItems = filterPendingNotification(
        page.items,
        pendingDismissalRef.current?.item.id ?? null,
      );
      setItems((prev) => {
        const combined = [...prev, ...nextItems];
        itemsRef.current = combined;
        return combined;
      });
      setCursor(page.nextCursor);
      nextItems.forEach((item) => {
        if (item.readAt == null) visibleUnreadIds.current.add(item.id);
      });
    } catch {
      // keep current cursor — user can pull to refresh
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  const handleItemPress = useCallback(
    async (item: MobileNotificationItem) => {
      // Optimistic mark-read for this row.
      if (item.readAt == null) {
        const nowIso = new Date().toISOString();
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id ? { ...row, readAt: nowIso } : row,
          ),
        );
        visibleUnreadIds.current.delete(item.id);
        setLocalUnreadCount(Math.max(0, count - 1));
        void markMobileNotificationsRead({ ids: [item.id] }).catch(() => {
          // swallow — the next focus refresh will reconcile
        });
      }

      const path = routeForNotificationData(pushPayloadForNotification(item));
      if (path) router.push(path as never);
    },
    [count],
  );

  const handleMarkAll = useCallback(async () => {
    if (count === 0) return;
    const nowIso = new Date().toISOString();
    setItems((prev) =>
      prev.map((row) =>
        row.readAt == null ? { ...row, readAt: nowIso } : row,
      ),
    );
    visibleUnreadIds.current.clear();
    setLocalUnreadCount(0);
    try {
      await markMobileNotificationsRead({ all: true });
    } catch {
      // best-effort
    }
    await refreshUnread();
  }, [count, refreshUnread]);

  const commitPendingDismissal = useCallback(
    async (pending: PendingNotificationDismissal) => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      if (pendingDismissalRef.current?.item.id === pending.item.id) {
        pendingDismissalRef.current = null;
        setPendingDismissal(null);
      }

      try {
        await dismissMobileNotifications({
          ids: [pending.item.id],
          dismissed: true,
        });
        await removeItemsFromMobileSnapshot<MobileNotificationListResponse>(
          profile?.profile.id ?? "signed-out",
          "notifications",
          new Set([pending.item.id]),
        );
        void dismissPresentedNotificationByInboxId(pending.item.id);
      } catch {
        const restored = restoreNotificationDismissal(
          itemsRef.current,
          pending,
        );
        itemsRef.current = restored;
        setItems(restored);
        if (pending.item.readAt == null) {
          visibleUnreadIds.current.add(pending.item.id);
          adjustLocalUnreadCount(1);
        }
        setDismissError("Couldn’t delete notification. Try again.");
      }
    },
    [profile?.profile.id],
  );

  commitPendingRef.current = commitPendingDismissal;

  const handleDelete = useCallback(
    (item: MobileNotificationItem) => {
      const previous = pendingDismissalRef.current;
      if (previous) void commitPendingDismissal(previous);

      const result = beginNotificationDismissal(itemsRef.current, item.id);
      if (!result.pending) return;

      itemsRef.current = result.items;
      setItems(result.items);
      pendingDismissalRef.current = result.pending;
      setPendingDismissal(result.pending);
      setDismissError(null);
      setOpenRowId(null);
      visibleUnreadIds.current.delete(item.id);
      if (item.readAt == null) adjustLocalUnreadCount(-1);

      dismissTimerRef.current = setTimeout(() => {
        void commitPendingRef.current?.(result.pending!);
      }, UNDO_WINDOW_MS);
    },
    [commitPendingDismissal],
  );

  const handleUndoDelete = useCallback(() => {
    const pending = pendingDismissalRef.current;
    if (!pending) return;
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    const restored = restoreNotificationDismissal(itemsRef.current, pending);
    itemsRef.current = restored;
    setItems(restored);
    pendingDismissalRef.current = null;
    setPendingDismissal(null);
    if (pending.item.readAt == null) {
      visibleUnreadIds.current.add(pending.item.id);
      adjustLocalUnreadCount(1);
    }
    haptics.light();
  }, []);

  const handleSwipeStateChange = useCallback((id: string, open: boolean) => {
    setOpenRowId((current) => (open ? id : current === id ? null : current));
  }, []);

  // Batch-mark the rows that were unread when this screen mounted, on unmount.
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      const pending = pendingDismissalRef.current;
      if (pending) void commitPendingRef.current?.(pending);
      const ids = Array.from(visibleUnreadIds.current);
      if (ids.length > 0) {
        void markMobileNotificationsRead({ ids }).catch(() => undefined);
      }
    };
  }, []);

  const empty = useMemo(
    () => mode === "ready" && items.length === 0,
    [mode, items.length],
  );

  return (
    <View style={[styles.screen, { backgroundColor: tokens.colors.shell }]}>
      {headerControlsVisible && <TabMenuOverlay topOffset={12} />}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: tokens.colors.header,
            borderBottomColor: tokens.colors.headerBorder,
          },
        ]}
      >
        {/* Spacer matching the floating hamburger so the title clears it. */}
        <View style={styles.backButton} />
        <Text style={[styles.title, { color: tokens.colors.textPrimary }]}>
          Notifications
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notification preferences"
            hitSlop={10}
            onPress={() => router.push("/notifications/preferences")}
            style={styles.iconButton}
          >
            <FontAwesome
              name="sliders"
              size={16}
              color={tokens.colors.textPrimary}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
            disabled={count === 0}
            onPress={handleMarkAll}
            style={({ pressed }) => [
              styles.markAll,
              {
                opacity: count === 0 ? 0.4 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.markAllText, { color: tokens.colors.accent }]}>
              Mark all read
            </Text>
          </Pressable>
        </View>
      </View>

      {mode === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.accent} />
        </View>
      ) : mode === "error" ? (
        <View style={styles.center}>
          <Text style={{ color: tokens.colors.textSecondary }}>
            Couldn’t load notifications.
          </Text>
          <Pressable onPress={() => void loadFirstPage()} hitSlop={10}>
            <Text
              style={{
                color: tokens.colors.accent,
                marginTop: 12,
                fontFamily: "DMSans",
              }}
            >
              Try again
            </Text>
          </Pressable>
        </View>
      ) : empty ? (
        <View style={styles.center}>
          <FontAwesome
            name="bell-o"
            size={32}
            color={tokens.colors.textTertiary}
          />
          <Text
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: "DMSans",
              fontWeight: "600",
              marginTop: 12,
            }}
          >
            No notifications yet
          </Text>
          <Text
            style={{
              color: tokens.colors.textTertiary,
              fontFamily: "DMSans",
              marginTop: 4,
              textAlign: "center",
              paddingHorizontal: 32,
            }}
          >
            Replies, mentions, and follow-ups will show up here.
          </Text>
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              anotherRowOpen={openRowId != null && openRowId !== item.id}
              item={item}
              onDelete={handleDelete}
              onPress={handleItemPress}
              onSwipeStateChange={handleSwipeStateChange}
            />
          )}
          extraData={openRowId}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={tokens.colors.accent}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator color={tokens.colors.accent} />
              </View>
            ) : null
          }
        />
      )}
      {pendingDismissal ? (
        <Animated.View
          accessibilityLiveRegion="polite"
          entering={FadeIn.duration(150).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(150).reduceMotion(ReduceMotion.System)}
          style={[
            styles.snackbar,
            {
              bottom: tokens.spacing.tabBarBottom + insets.bottom,
              backgroundColor: tokens.colors.surfaceStrong,
              borderColor: tokens.colors.borderStrong,
            },
          ]}
        >
          <Text
            style={[styles.snackbarText, { color: tokens.colors.textPrimary }]}
          >
            Notification deleted
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleUndoDelete}
            hitSlop={10}
          >
            <Text
              style={[styles.snackbarAction, { color: tokens.colors.accent }]}
            >
              Undo
            </Text>
          </Pressable>
        </Animated.View>
      ) : dismissError ? (
        <Animated.View
          accessibilityLiveRegion="assertive"
          entering={FadeIn.duration(150).reduceMotion(ReduceMotion.System)}
          style={[
            styles.snackbar,
            {
              bottom: tokens.spacing.tabBarBottom + insets.bottom,
              backgroundColor: tokens.colors.surfaceStrong,
              borderColor: tokens.colors.danger,
            },
          ]}
        >
          <Text style={[styles.snackbarText, { color: tokens.colors.danger }]}>
            {dismissError}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setDismissError(null)}
            hitSlop={10}
          >
            <Text
              style={[styles.snackbarAction, { color: tokens.colors.accent }]}
            >
              Dismiss
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "DMSans",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  markAll: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  markAllText: {
    fontFamily: "DMSans",
    fontSize: 13,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  snackbar: {
    position: "absolute",
    left: 20,
    right: 20,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 20,
  },
  snackbarText: {
    flex: 1,
    fontFamily: "DMSans",
    fontSize: 13,
    lineHeight: 18,
  },
  snackbarAction: {
    fontFamily: "DMSans",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});
