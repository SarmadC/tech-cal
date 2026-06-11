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
import { SafeAreaView } from "react-native-safe-area-context";

import type { MobileSavedEventsFeed } from "@kurecal/domain";

import { EventSummaryCard } from "../src/components/EventSummaryCard";
import { ScreenStateView } from "../src/components/ScreenStateView";
import { loadMobileSavedEvents } from "../src/lib/mobileApi";
import { useAppTheme } from "../src/providers/ThemeProvider";
import { haptics } from "../src/lib/haptics";

export default function SavedScreen() {
  const { tokens } = useAppTheme();
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
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to load saved events",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [],
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
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Loading saved events"
              description="Pulling the events you bookmarked and tracked."
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error && events.length === 0) {
    return (
      <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
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
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
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
                <Text style={styles.eyebrow}>{header.eyebrow}</Text>
                <Text style={styles.title}>{header.title}</Text>
                {header.subtitle ? (
                  <Text style={styles.subtitle}>{header.subtitle}</Text>
                ) : null}
                <Text style={styles.meta}>
                  {feed?.totalCount ?? events.length} saved event
                  {(feed?.totalCount ?? events.length) === 1 ? "" : "s"}
                </Text>
              </View>
              {error ? <Text style={styles.inlineError}>{error}</Text> : null}
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
                onPress={() => router.push("./discover")}
                style={({ pressed }) => [
                  styles.primaryAction,
                  pressed ? styles.primaryActionPressed : null,
                ]}
              >
                <Text style={styles.primaryActionLabel}>Browse discover</Text>
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
      </SafeAreaView>
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
    minHeight: 32,
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
    minHeight: 32,
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
