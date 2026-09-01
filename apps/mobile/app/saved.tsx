import { useCallback, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { MobileSavedEventsFeed } from "@kurecal/domain";

import { EventSummaryCard } from "../src/components/EventSummaryCard";
import { ScreenStateView } from "../src/components/ScreenStateView";
import { loadMobileSavedEvents } from "../src/lib/mobileApi";
import { useAppTheme } from "../src/providers/ThemeProvider";
import { haptics } from "../src/lib/haptics";
import { useAuth } from "../src/context/AuthProvider";
import { readMobileSnapshot, writeMobileSnapshot } from "../src/lib/mobileSnapshotCache";

export default function SavedScreen() {
  const { tokens } = useAppTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [feed, setFeed] = useState<MobileSavedEventsFeed | null>(null);
  const [events, setEvents] = useState<MobileSavedEventsFeed["events"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSaved = useCallback(
    async (page = 1, mode: "initial" | "more" | "refresh" = "initial") => {
      if (mode === "more") {
        setLoadingMore(true);
      } else if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const nextFeed = await loadMobileSavedEvents(page);
        setFeed(nextFeed);
        setEvents((current) =>
          mode === "more" ? [...current, ...nextFeed.events] : nextFeed.events,
        );
        setError(null);
        if (page === 1) {
          void writeMobileSnapshot(profile?.profile.id ?? "signed-out", "saved", nextFeed);
        }
      } catch (nextError) {
        const cached = page === 1
          ? await readMobileSnapshot<MobileSavedEventsFeed>(profile?.profile.id ?? "signed-out", "saved")
          : null;
        if (cached) {
          setFeed(cached.value);
          setEvents(cached.value.events);
          setError("Showing your last saved shortlist.");
        } else {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Unable to load saved events",
          );
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [profile?.profile.id],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSaved(1);
    }, [loadSaved]),
  );

  const header = feed?.header ?? {
    eyebrow: "Saved",
    title: "Your shortlist",
    subtitle: "Events you bookmarked on mobile",
  };

  if (loading && events.length === 0) {
    return (
      <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
        <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Loading saved events"
              description="Pulling the events you bookmarked and tracked."
            />
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (error && events.length === 0) {
    return (
      <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
        <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="error"
              title="Saved events unavailable"
              description={error}
              onRetry={() => {
                void loadSaved(1);
              }}
            />
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
      <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <FlashList
          data={events}
          keyExtractor={(event) => event.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (feed?.nextPage && !loadingMore) {
              void loadSaved(feed.nextPage, "more");
            }
          }}
          onEndReachedThreshold={0.6}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadSaved(1, "refresh").then(() => {
                  haptics.success();
                });
              }}
              tintColor={tokens.colors.accent}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.hero}>
                <Text style={[styles.eyebrow, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>{header.eyebrow}</Text>
                <Text style={[styles.title, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{header.title}</Text>
                {header.subtitle ? (
                  <Text style={[styles.subtitle, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>{header.subtitle}</Text>
                ) : null}
                <Text style={[styles.meta, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
                  {feed?.totalCount ?? events.length} saved event
                  {(feed?.totalCount ?? events.length) === 1 ? "" : "s"}
                </Text>
              </View>
              {error ? <Text style={[styles.inlineError, { color: tokens.colors.warning, fontFamily: tokens.typography.sans }]}>{error}</Text> : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <ScreenStateView
                mode="empty"
                title="Nothing saved yet"
                description="Open an event from Discover and save it to build your shortlist."
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("./discover")}
                style={({ pressed }) => [
                  styles.primaryAction,
                  { backgroundColor: tokens.colors.pillActive },
                  pressed ? styles.primaryActionPressed : null,
                ]}
              >
                <Text style={[styles.primaryActionLabel, { color: tokens.colors.pillActiveText, fontFamily: tokens.typography.sans }]}>Browse discover</Text>
              </Pressable>
            </View>
          }
          ListFooterComponent={
            feed?.nextPage && loadingMore ? (
              <Text style={styles.secondaryActionLabel}>Loading…</Text>
            ) : null
          }
          renderItem={({ item: event }) => (
            <View style={styles.itemWrap}>
              <EventSummaryCard
                event={event}
                onPress={() =>
                  router.push({
                    pathname: "../event/[id]",
                    params: { id: event.id },
                  })
                }
              />
            </View>
          )}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
  },
  listHeader: {
    gap: 12,
    paddingBottom: 12,
  },
  itemWrap: {
    paddingBottom: 8,
  },
  emptyWrap: {
    gap: 8,
  },
  eyebrow: {
    color: "#908f9e",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.66,
    textTransform: "uppercase",
  },
  gradient: {
    flex: 1,
  },
  hero: {
    gap: 6,
  },
  inlineError: {
    color: "#fca5a5",
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: "#908f9e",
    fontSize: 12,
    fontWeight: "500",
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: "#5e6ad2",
    borderRadius: 4,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  primaryActionLabel: {
    color: "#fdfaff",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryActionPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  safeArea: {
    flex: 1,
  },
  secondaryAction: {
    alignItems: "center",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  secondaryActionLabel: {
    color: "#c6c5d5",
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryActionPressed: {
    opacity: 0.88,
  },
  stateWrap: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  subtitle: {
    color: "#c6c5d5",
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: "#e3e2e3",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.24,
    lineHeight: 29,
  },
});
