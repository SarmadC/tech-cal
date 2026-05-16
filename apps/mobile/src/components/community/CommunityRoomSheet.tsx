import { FontAwesome } from "@expo/vector-icons";
import type {
  MobileCommunityRoomAttendee,
  MobileCommunityRoomDetail,
  MobileCommunityRoomRelationship,
  MobileCommunityRoomSignal,
} from "@kurecal/domain";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  loadMobileCommunityRoom,
  updateMobileEventEngagement,
  updateMobileProfile,
} from "../../lib/mobileApi";
import { useAppTheme } from "../../providers/ThemeProvider";

interface CommunityRoomSheetProps {
  eventId: string | null;
  onClose: () => void;
}

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

function formatEventTime(startTime: string): string {
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return startTime;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const RELATIONSHIP_LABEL: Record<MobileCommunityRoomRelationship, string> = {
  mutual: "Mutual",
  follows_you: "Follows you",
  in_network: "In network",
  stranger: "",
};

function getViewerLabel(viewer: MobileCommunityRoomDetail["viewer"]): string {
  if (viewer.isAttending && viewer.isVisible) return "You're going · Visible";
  if (viewer.isAttending) return "You're going · Hidden";
  if (viewer.isSaved) return "You saved this";
  return "Not tracking";
}

function getSignalCopy(signal: MobileCommunityRoomSignal): string {
  const name = signal.actor.fullName || `@${signal.actor.username}`;
  switch (signal.kind) {
    case "mutual_arrived":
      return `${name} joined the room`;
    case "saved":
      return `${name} saved this event`;
    case "joined_attending":
    default:
      return `${name} is going`;
  }
}

export function CommunityRoomSheet({
  eventId,
  onClose,
}: CommunityRoomSheetProps) {
  const { tokens } = useAppTheme();
  const [detail, setDetail] = useState<MobileCommunityRoomDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "going" | "save" | "visibility" | null
  >(null);
  const requestSequenceRef = useRef(0);
  const visible = Boolean(eventId);

  const load = useCallback(async (id: string) => {
    const requestId = ++requestSequenceRef.current;
    setLoading(true);
    setError(null);
    try {
      const next = await loadMobileCommunityRoom(id);
      if (requestId !== requestSequenceRef.current) return;
      setDetail(next);
    } catch (nextError) {
      if (requestId !== requestSequenceRef.current) return;
      setError(
        nextError instanceof Error ? nextError.message : "Couldn't load room.",
      );
    } finally {
      if (requestId === requestSequenceRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!eventId) {
      setDetail(null);
      setError(null);
      return;
    }
    void load(eventId);
  }, [eventId, load]);

  const openProfile = (username: string) => {
    onClose();
    router.push(`/profile/${username}`);
  };

  const openFullEvent = () => {
    if (!detail) return;
    onClose();
    router.push(`/event/${detail.event.id}`);
  };

  const handleToggleGoing = async () => {
    if (!detail || pendingAction) return;
    setPendingAction("going");
    try {
      await updateMobileEventEngagement(detail.event.id, {
        status: detail.viewer.isAttending ? null : "attending",
      });
      await load(detail.event.id);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Couldn't update attendance.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleToggleSave = async () => {
    if (!detail || pendingAction) return;
    setPendingAction("save");
    try {
      await updateMobileEventEngagement(detail.event.id, {
        isBookmarked: !detail.viewer.isSaved,
      });
      await load(detail.event.id);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Couldn't save event.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const navigateToThreads = (mode: "list" | "new") => {
    if (!detail) return;
    onClose();
    if (mode === "new") {
      router.push(`/event/${detail.event.id}/threads/new`);
    } else {
      router.push(`/event/${detail.event.id}/threads`);
    }
  };

  const handleGoVisible = async () => {
    if (!detail || pendingAction) return;
    setPendingAction("visibility");
    try {
      await updateMobileProfile({ showAttendance: true });
      await load(detail.event.id);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Couldn't update visibility.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="Close room"
        style={[styles.overlay, { backgroundColor: tokens.colors.overlay }]}
        onPress={onClose}
      />
      <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: tokens.colors.shellElevated,
              borderTopColor: tokens.colors.borderStrong,
            },
          ]}
        >
          <View
            style={[
              styles.dragHandle,
              { backgroundColor: tokens.colors.borderStrong },
            ]}
          />

          {loading && !detail ? (
            <View style={styles.centered}>
              <ActivityIndicator color={tokens.colors.accent} />
            </View>
          ) : null}

          {error && !detail ? (
            <View style={styles.centered}>
              <Text
                style={[
                  styles.errorText,
                  {
                    color: tokens.colors.textSecondary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                {error}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => eventId && void load(eventId)}
                style={[
                  styles.retryButton,
                  {
                    borderColor: tokens.colors.border,
                    borderRadius: tokens.radius.sm,
                  },
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
            </View>
          ) : null}

          {detail ? (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.headerRow}>
                <View style={styles.headerCopy}>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.title,
                      {
                        color: tokens.colors.textPrimary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                  >
                    {detail.event.title}
                  </Text>
                  <Text
                    style={[
                      styles.subMeta,
                      {
                        color: tokens.colors.textTertiary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                  >
                    {formatEventTime(detail.event.startTime)}
                    {detail.event.location
                      ? ` · ${detail.event.location}`
                      : detail.event.format
                        ? ` · ${detail.event.format}`
                        : ""}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close room"
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.closeButton,
                    {
                      borderColor: tokens.colors.border,
                      borderRadius: tokens.radius.sm,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <FontAwesome
                    name="close"
                    size={13}
                    color={tokens.colors.textSecondary}
                  />
                </Pressable>
              </View>

              <View
                style={[
                  styles.viewerChip,
                  {
                    backgroundColor: tokens.colors.surfaceMuted,
                    borderRadius: tokens.radius.sm,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: detail.viewer.isAttending
                        ? tokens.colors.accent
                        : tokens.colors.textTertiary,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.viewerText,
                    {
                      color: tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  {getViewerLabel(detail.viewer)}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <ActionButton
                  active={detail.viewer.isSaved}
                  label={detail.viewer.isSaved ? "Saved" : "Save"}
                  loading={pendingAction === "save"}
                  onPress={handleToggleSave}
                />
                <ActionButton
                  active={detail.viewer.isAttending}
                  label={detail.viewer.isAttending ? "Going" : "I'm going"}
                  loading={pendingAction === "going"}
                  onPress={handleToggleGoing}
                />
              </View>

              {detail.viewer.isAttending && !detail.viewer.isVisible ? (
                <View
                  style={[
                    styles.nudge,
                    {
                      backgroundColor: tokens.colors.accentSoft,
                      borderColor: tokens.colors.accentSoft,
                      borderRadius: tokens.radius.sm,
                    },
                  ]}
                >
                  <View style={styles.nudgeCopy}>
                    <Text
                      style={[
                        styles.nudgeTitle,
                        {
                          color: tokens.colors.textPrimary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                    >
                      You're hidden in this room
                    </Text>
                    <Text
                      style={[
                        styles.nudgeBody,
                        {
                          color: tokens.colors.textSecondary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                    >
                      Go visible so attendees can see you here.
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={pendingAction === "visibility"}
                    onPress={handleGoVisible}
                    style={({ pressed }) => [
                      styles.nudgeAction,
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
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {pendingAction === "visibility"
                        ? "Updating..."
                        : "Go visible"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.statsRow}>
                <StatTile
                  label="Here"
                  value={detail.stats.visibleAttendeeCount}
                />
                <StatTile
                  label="Network"
                  value={detail.stats.networkAttendingCount}
                  emphasis
                />
                <StatTile
                  label="Active 24h"
                  value={detail.stats.activeNowCount}
                />
                <StatTile
                  label="Total"
                  value={detail.stats.totalAttendeeCount}
                  muted
                />
              </View>

              {detail.attendees.length > 0 ? (
                <>
                  <SectionLabel title="Who's here" />
                  <View
                    style={[
                      styles.attendeeList,
                      {
                        backgroundColor: tokens.colors.surface,
                        borderColor: tokens.colors.border,
                        borderRadius: tokens.radius.sm,
                      },
                    ]}
                  >
                    {detail.attendees.map((attendee, index) => (
                      <AttendeeRow
                        key={attendee.id}
                        attendee={attendee}
                        isLast={index === detail.attendees.length - 1}
                        onPress={() => openProfile(attendee.username)}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  navigateToThreads(
                    detail.stats.threadCount === 0 ? "new" : "list",
                  )
                }
                style={({ pressed }) => [
                  styles.threadsTile,
                  {
                    backgroundColor: tokens.colors.surface,
                    borderColor: tokens.colors.border,
                    borderRadius: tokens.radius.sm,
                  },
                  pressed && { backgroundColor: tokens.colors.surfaceMuted },
                ]}
              >
                <View style={styles.threadsTileCopy}>
                  <Text
                    style={[
                      styles.threadsTileLabel,
                      {
                        color: tokens.colors.textPrimary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                  >
                    {detail.stats.threadCount === 0
                      ? "No threads yet"
                      : `Threads · ${detail.stats.threadCount}`}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.threadsTileAction,
                    {
                      color: tokens.colors.accent,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  {detail.stats.threadCount === 0
                    ? "Start one →"
                    : "View threads →"}
                </Text>
              </Pressable>

              {detail.signals.length > 0 ? (
                <>
                  <SectionLabel title="Recent activity" />
                  <View
                    style={[
                      styles.signalList,
                      {
                        backgroundColor: tokens.colors.surface,
                        borderColor: tokens.colors.border,
                        borderRadius: tokens.radius.sm,
                      },
                    ]}
                  >
                    {detail.signals.map((signal, index) => (
                      <SignalRow
                        key={signal.id}
                        signal={signal}
                        isLast={index === detail.signals.length - 1}
                        onPress={() => openProfile(signal.actor.username)}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={openFullEvent}
                style={({ pressed }) => [
                  styles.footerLink,
                  {
                    borderColor: tokens.colors.border,
                    borderRadius: tokens.radius.sm,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.footerLinkText,
                    {
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  Open full event
                </Text>
                <FontAwesome
                  name="long-arrow-right"
                  size={12}
                  color={tokens.colors.textSecondary}
                />
              </Pressable>
            </ScrollView>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function ActionButton({
  active,
  label,
  loading,
  onPress,
}: {
  active: boolean;
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  const { tokens } = useAppTheme();
  const background = active ? tokens.colors.accent : tokens.colors.surface;
  const borderColor = active ? tokens.colors.accent : tokens.colors.border;
  const textColor = active
    ? tokens.colors.textInverse
    : tokens.colors.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: background,
          borderColor,
          borderRadius: tokens.radius.sm,
        },
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={active ? tokens.colors.textInverse : tokens.colors.textPrimary}
          size="small"
        />
      ) : (
        <Text
          style={{
            color: textColor,
            fontFamily: tokens.typography.sans,
            fontSize: 13,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function StatTile({
  emphasis,
  label,
  muted,
  value,
}: {
  emphasis?: boolean;
  label: string;
  muted?: boolean;
  value: number;
}) {
  const { tokens } = useAppTheme();
  const valueColor = emphasis
    ? tokens.colors.accent
    : muted
      ? tokens.colors.textTertiary
      : tokens.colors.textPrimary;

  return (
    <View
      style={[
        styles.statTile,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.sm,
        },
      ]}
    >
      <Text
        style={{
          color: valueColor,
          fontFamily: tokens.typography.sans,
          fontSize: 18,
          fontWeight: "700",
          letterSpacing: -0.3,
          lineHeight: 22,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: tokens.colors.textTertiary,
          fontFamily: tokens.typography.sans,
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.2,
          lineHeight: 14,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function AttendeeRow({
  attendee,
  isLast,
  onPress,
}: {
  attendee: MobileCommunityRoomAttendee;
  isLast: boolean;
  onPress: () => void;
}) {
  const { tokens } = useAppTheme();
  const displayName = attendee.fullName || `@${attendee.username}`;
  const subline = attendee.matchReason ?? attendee.headline ?? attendee.location;
  const relationshipLabel = RELATIONSHIP_LABEL[attendee.relationship];
  const isMutual = attendee.relationship === "mutual";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.attendeeRow,
        !isLast && {
          borderBottomColor: tokens.colors.divider,
          borderBottomWidth: 1,
        },
        pressed && { backgroundColor: tokens.colors.surfaceMuted },
      ]}
    >
      <Avatar
        avatarUrl={attendee.avatarUrl}
        name={displayName}
        size={36}
      />
      <View style={styles.attendeeCopy}>
        <Text
          numberOfLines={1}
          style={[
            styles.attendeeName,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {displayName}
        </Text>
        {subline ? (
          <Text
            numberOfLines={1}
            style={[
              styles.attendeeSubline,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {subline}
          </Text>
        ) : null}
      </View>
      {relationshipLabel ? (
        <Text
          style={{
            color: isMutual ? tokens.colors.accent : tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.2,
          }}
        >
          {relationshipLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

function SignalRow({
  isLast,
  onPress,
  signal,
}: {
  isLast: boolean;
  onPress: () => void;
  signal: MobileCommunityRoomSignal;
}) {
  const { tokens } = useAppTheme();
  const copy = getSignalCopy(signal);
  const time = formatRelative(signal.occurredAt);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.signalRow,
        !isLast && {
          borderBottomColor: tokens.colors.divider,
          borderBottomWidth: 1,
        },
        pressed && { backgroundColor: tokens.colors.surfaceMuted },
      ]}
    >
      <Avatar
        avatarUrl={signal.actor.avatarUrl}
        name={signal.actor.fullName || signal.actor.username}
        size={24}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.signalCopy,
          {
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {copy}
      </Text>
      <Text
        style={{
          color: tokens.colors.textTertiary,
          fontFamily: tokens.typography.sans,
          fontSize: 11,
          fontWeight: "500",
        }}
      >
        {time}
      </Text>
    </Pressable>
  );
}

function SectionLabel({ title }: { title: string }) {
  const { tokens } = useAppTheme();
  return (
    <Text
      style={[
        styles.sectionLabel,
        {
          color: tokens.colors.textTertiary,
          fontFamily: tokens.typography.sans,
        },
      ]}
    >
      {title}
    </Text>
  );
}

function EmptyNote({ text }: { text: string }) {
  const { tokens } = useAppTheme();
  return (
    <View
      style={[
        styles.emptyNote,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.sm,
        },
      ]}
    >
      <Text
        style={[
          styles.emptyText,
          {
            color: tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {text}
      </Text>
    </View>
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
  actionButton: {
    alignItems: "center",
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  attendeeCopy: {
    flex: 1,
    gap: 2,
  },
  attendeeList: {
    borderWidth: 1,
    overflow: "hidden",
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  attendeeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  attendeeSubline: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  centered: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 32,
  },
  closeButton: {
    alignItems: "center",
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  content: {
    gap: 14,
    paddingBottom: 16,
  },
  dragHandle: {
    alignSelf: "center",
    borderRadius: 999,
    height: 4,
    marginBottom: 12,
    width: 36,
  },
  emptyNote: {
    borderWidth: 1,
    padding: 12,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  footerLink: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 12,
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: "700",
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  nudge: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10,
  },
  nudgeAction: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: 12,
  },
  nudgeBody: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  nudgeCopy: {
    flex: 1,
    gap: 2,
  },
  nudgeTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
    lineHeight: 17,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  pressed: {
    opacity: 0.82,
  },
  retryButton: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  safeArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    lineHeight: 16,
    paddingTop: 4,
  },
  sheet: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: 1,
    maxHeight: "82%",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  signalCopy: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  signalList: {
    borderWidth: 1,
    overflow: "hidden",
  },
  threadsTile: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  threadsTileAction: {
    fontSize: 12,
    fontWeight: "700",
  },
  threadsTileCopy: {
    flex: 1,
  },
  threadsTileLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  signalRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statTile: {
    alignItems: "flex-start",
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minHeight: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusDot: {
    borderRadius: 2,
    height: 5,
    width: 5,
  },
  subMeta: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  viewerChip: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  viewerText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.05,
  },
});
