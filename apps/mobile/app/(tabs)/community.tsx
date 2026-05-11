import { FontAwesome } from "@expo/vector-icons";
import type {
  MobileCommunityCircle,
  MobileCommunityFeedPost,
  MobileCommunityHome,
  MobileCommunityNetworkingEvent,
  MobileCommunityNetworkingFollowUpCard,
  MobileCommunityNetworkingPersonCard,
  MobileCommunityNetworkingSharedEvent,
} from "@kurecal/domain";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { KureButton } from "../../src/components/chrome/KureButton";
import { MobilePage } from "../../src/components/chrome/MobilePage";
import { ScreenState } from "../../src/components/chrome/ScreenState";
import { CommunityNetworkingPersonCard } from "../../src/components/community/CommunityNetworkingPersonCard";
import { CommunityNetworkingSpeakerCard } from "../../src/components/community/CommunityNetworkingSpeakerCard";
import { formatCommunityTabCount } from "../../src/components/community/presentation";
import { summarizeCommunityPost } from "../../src/lib/communityPresentation";
import {
  followMobileUser,
  loadMobileCommunityHome,
  unfollowMobileUser,
} from "../../src/lib/mobileApi";
import { useAppTheme } from "../../src/providers/ThemeProvider";

type LoadMode = "initial" | "refresh";
type CommunityTab = "pulse" | "rooms" | "people";
type RoomLens = "for_you" | "going" | "saved" | "nearby" | "past";
type PeopleLens = "for_you" | "going" | "follows_you" | "mutuals" | "recent";

const COMMUNITY_TABS: Array<{ id: CommunityTab; label: string }> = [
  { id: "pulse", label: "Pulse" },
  { id: "rooms", label: "Rooms" },
  { id: "people", label: "People" },
];

const ROOM_LENSES: Array<{ id: RoomLens; label: string }> = [
  { id: "for_you", label: "For You" },
  { id: "going", label: "Going" },
  { id: "saved", label: "Saved" },
  { id: "nearby", label: "Nearby" },
  { id: "past", label: "Past" },
];

const PEOPLE_LENSES: Array<{ id: PeopleLens; label: string }> = [
  { id: "for_you", label: "For You" },
  { id: "going", label: "Going" },
  { id: "follows_you", label: "Follows You" },
  { id: "mutuals", label: "Mutuals" },
  { id: "recent", label: "Recent" },
];

function getCommunityLoadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "The community hub could not be loaded right now.";
}

function getPrimaryEvent(
  person:
    | MobileCommunityNetworkingPersonCard
    | MobileCommunityNetworkingFollowUpCard,
): MobileCommunityNetworkingSharedEvent | null {
  return person.strongestSharedEvent ?? person.sharedEvents[0] ?? null;
}

function getDisplayName(value: {
  fullName: string | null;
  username?: string;
}): string {
  return (
    value.fullName ||
    (value.username ? `@${value.username}` : "Community member")
  );
}

function getCircleSlug(circle: MobileCommunityCircle): string {
  return circle.slug || circle.id;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatShortRelativeTime(value: string | null): string {
  if (!value) {
    return "Recently";
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  const diffMs = timestamp - Date.now();
  const absMinutes = Math.max(1, Math.round(Math.abs(diffMs) / 60_000));
  const suffix = diffMs >= 0 ? "" : " ago";

  if (absMinutes < 60) {
    return diffMs >= 0 ? `Starts in ${absMinutes}m` : `${absMinutes}m${suffix}`;
  }

  const hours = Math.round(absMinutes / 60);
  if (hours < 24) {
    return diffMs >= 0 ? `Starts in ${hours}h` : `${hours}h${suffix}`;
  }

  const days = Math.round(hours / 24);
  if (days === 1) {
    return diffMs >= 0 ? "Tomorrow" : "Yesterday";
  }

  return diffMs >= 0 ? `Starts in ${days}d` : `${days}d${suffix}`;
}

function getRoomReason(event: MobileCommunityNetworkingEvent): string {
  if (event.viewerContext === "attending") {
    return "Because you're going";
  }

  if (event.viewerContext === "saved") {
    return "Because you saved it";
  }

  if (event.relationshipAttendeeCount > 0) {
    return `${event.relationshipAttendeeCount} people you know are here`;
  }

  if (event.networkAttendingCount > 0) {
    return `${event.networkAttendingCount} from your network are here`;
  }

  return event.contextLabel || "Recommended";
}

function getRoomStatus(event: MobileCommunityNetworkingEvent): string {
  const peopleCount =
    event.visibleAttendeeCount ||
    event.totalAttendeeCount ||
    event.networkAttendingCount;
  const activityLabel =
    peopleCount > 0
      ? `${formatCommunityTabCount(peopleCount)} ${peopleCount === 1 ? "person" : "people"} here`
      : "Signal building";

  if ((event.recentTrackerCount ?? 0) > 0 || event.visibleAttendeeCount > 0) {
    return `Active now · ${activityLabel}`;
  }

  return `${formatShortRelativeTime(event.startTime)} · ${activityLabel}`;
}

function getRoomQuote(event: MobileCommunityNetworkingEvent): string {
  if (event.attendeePreview.length > 0) {
    return "Attendees are starting to coordinate.";
  }

  if ((event.speakerPreview?.length ?? 0) > 0) {
    return "Speaker signal is forming.";
  }

  if (event.visibleAttendeeCount > 0 || event.networkAttendingCount > 0) {
    return "Early attendee momentum.";
  }

  return "Attendee signal is still forming.";
}

function filterRooms(
  events: MobileCommunityNetworkingEvent[],
  lens: RoomLens,
): MobileCommunityNetworkingEvent[] {
  switch (lens) {
    case "going":
      return events.filter((event) => event.viewerContext === "attending");
    case "saved":
      return events.filter((event) => event.viewerContext === "saved");
    case "nearby":
      return events.filter(
        (event) => event.format !== "virtual" && Boolean(event.location),
      );
    case "past":
      return [];
    default:
      return events;
  }
}

function filterPeople(
  home: MobileCommunityHome,
  lens: PeopleLens,
): {
  peopleToMeet: MobileCommunityNetworkingPersonCard[];
  followUps: MobileCommunityNetworkingFollowUpCard[];
} {
  switch (lens) {
    case "going":
      return {
        peopleToMeet: home.peopleToMeet.filter((person) =>
          person.sharedEvents.some(
            (event) => event.viewerContext === "attending",
          ),
        ),
        followUps: [],
      };
    case "follows_you":
      return {
        peopleToMeet: home.peopleToMeet.filter(
          (person) => person.followsViewer || person.isMutualFollow,
        ),
        followUps: home.followUpNow.filter(
          (person) => person.followsViewer || person.isMutualFollow,
        ),
      };
    case "mutuals":
      return {
        peopleToMeet: home.peopleToMeet.filter(
          (person) => person.isMutualFollow,
        ),
        followUps: home.followUpNow.filter((person) => person.isMutualFollow),
      };
    case "recent":
      return {
        peopleToMeet: [],
        followUps: home.followUpNow,
      };
    default:
      return {
        peopleToMeet: home.peopleToMeet,
        followUps: home.followUpNow,
      };
  }
}

export default function CommunityScreen() {
  const { tokens } = useAppTheme();
  const requestSequenceRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const homeRef = useRef<MobileCommunityHome | null>(null);

  const [home, setHome] = useState<MobileCommunityHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CommunityTab>("pulse");
  const [roomLens, setRoomLens] = useState<RoomLens>("for_you");
  const [peopleLens, setPeopleLens] = useState<PeopleLens>("for_you");

  const loadCommunity = useCallback(async (mode: LoadMode = "initial") => {
    const requestId = ++requestSequenceRef.current;
    const existingHome = homeRef.current;

    if (mode !== "refresh" && !existingHome) {
      setLoading(true);
    }

    try {
      const nextHome = await loadMobileCommunityHome();
      if (requestId !== requestSequenceRef.current) {
        return;
      }

      setHome(nextHome);
      homeRef.current = nextHome;
      setError(null);
      setInlineError(null);
    } catch (nextError) {
      if (requestId !== requestSequenceRef.current) {
        return;
      }

      const message = getCommunityLoadErrorMessage(nextError);
      if (mode === "refresh" || existingHome) {
        setInlineError(message);
      } else {
        setError(message);
      }
    } finally {
      if (requestId === requestSequenceRef.current && mode !== "refresh") {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        void loadCommunity("initial");
      } else {
        void loadCommunity("refresh");
      }
    }, [loadCommunity]),
  );

  const activeRooms = useMemo(
    () => (home ? filterRooms(home.upcomingMoments, roomLens) : []),
    [home, roomLens],
  );

  const peopleSections = useMemo(
    () =>
      home
        ? filterPeople(home, peopleLens)
        : { peopleToMeet: [], followUps: [] },
    [home, peopleLens],
  );

  async function handleToggleFollow(userId: string, isFollowing: boolean) {
    setPendingUserId(userId);

    try {
      if (isFollowing) {
        await unfollowMobileUser(userId);
      } else {
        await followMobileUser(userId);
      }

      await loadCommunity("refresh");
    } catch (nextError) {
      Alert.alert(
        isFollowing ? "Disconnect failed" : "Connect failed",
        nextError instanceof Error
          ? nextError.message
          : "Unable to update connection status.",
      );
    } finally {
      setPendingUserId((current) => (current === userId ? null : current));
    }
  }

  return (
    <MobilePage headerHidden showAccentGlow={false} title="Community">
      <View style={styles.contentWrap}>
        {loading && !home ? (
          <ScreenState
            mode="loading"
            title="Loading community"
            description="Pulling rooms, people, and current community activity."
          />
        ) : null}

        {error && !home ? (
          <ScreenState
            mode="error"
            title="Community unavailable"
            description={error}
            action={
              <KureButton
                disabled={loading}
                onPress={() => void loadCommunity("initial")}
              >
                {loading ? "Retrying..." : "Try again"}
              </KureButton>
            }
          />
        ) : null}

        {home ? (
          <>
            <SegmentedTabs activeTab={activeTab} onChange={setActiveTab} />

            {inlineError ? <InlineAlert message={inlineError} /> : null}

            {activeTab === "pulse" ? (
              <PulseTab
                home={home}
                onOpenPeople={() => setActiveTab("people")}
                onOpenRooms={() => setActiveTab("rooms")}
              />
            ) : null}

            {activeTab === "rooms" ? (
              <RoomsTab
                activeRooms={activeRooms}
                followUps={home.followUpNow}
                lens={roomLens}
                onChangeLens={setRoomLens}
              />
            ) : null}

            {activeTab === "people" ? (
              <PeopleTab
                home={home}
                lens={peopleLens}
                peopleToMeet={peopleSections.peopleToMeet}
                followUps={peopleSections.followUps}
                pendingUserId={pendingUserId}
                onChangeLens={setPeopleLens}
                onToggleFollow={handleToggleFollow}
              />
            ) : null}
          </>
        ) : null}
      </View>
    </MobilePage>
  );
}

function SegmentedTabs({
  activeTab,
  onChange,
}: {
  activeTab: CommunityTab;
  onChange: (tab: CommunityTab) => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.segmentedControl,
        {
          backgroundColor: tokens.colors.surfaceMuted,
          borderRadius: tokens.radius.sm,
        },
      ]}
    >
      {COMMUNITY_TABS.map((tab) => (
        <Pressable
          key={tab.id}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === tab.id }}
          onPress={() => onChange(tab.id)}
          style={[
            styles.segmentedItem,
            activeTab === tab.id && {
              backgroundColor: tokens.colors.surface,
              borderRadius: tokens.radius.sm - 4,
              shadowColor: tokens.shadow.shadowColor,
              shadowOpacity: tokens.mode === "dark" ? 0.12 : 0.08,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 2,
            },
          ]}
        >
          <Text
            style={{
              color:
                activeTab === tab.id
                  ? tokens.colors.textPrimary
                  : tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
              fontSize: 15,
              lineHeight: 20,
              fontWeight: "800",
            }}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function PulseTab({
  home,
  onOpenPeople,
  onOpenRooms,
}: {
  home: MobileCommunityHome;
  onOpenPeople: () => void;
  onOpenRooms: () => void;
}) {
  const { tokens } = useAppTheme();
  const circles = home.circles ?? [];
  const feed = home.feed ?? [];
  const roomPreview = home.upcomingMoments.slice(0, 2);
  const hasPulseSummary =
    (home.ambientActivity?.publicTrackersToday ??
      home.summary.visibleOpportunityCount) > 0 ||
    (home.ambientActivity?.roomsWithFreshTrackingCount ??
      home.upcomingMoments.length) > 0 ||
    home.summary.followUpCount > 0;

  return (
    <>
      {hasPulseSummary ? (
        <>
          <SectionTitle title="Today's Pulse" />
          <PulseSummaryCard
            home={home}
            onOpenPeople={onOpenPeople}
            onOpenRooms={onOpenRooms}
          />
        </>
      ) : null}

      {feed.length > 0 ? (
        <>
          <SectionTitle title="Recent Community Activity" />
          <View
            style={[
              styles.activityCard,
              {
                backgroundColor: tokens.colors.surface,
                shadowColor: tokens.shadow.shadowColor,
              },
            ]}
          >
            {feed.slice(0, 2).map((post, index) => (
              <ActivityRow
                key={post.id}
                isLast={index === Math.min(feed.length, 2) - 1}
                post={post}
              />
            ))}
          </View>
        </>
      ) : null}

      {roomPreview.length > 0 ? (
        <>
          <SectionHeaderLink
            title="Active Rooms"
            actionLabel="See all"
            onPress={onOpenRooms}
          />
          <View style={styles.stack}>
            {roomPreview.map((event, index) => (
              <RoomCard
                key={event.id}
                compact={index > 0}
                event={event}
                primaryActionLabel={
                  index === 0 ? "Open Room" : "Introduce yourself"
                }
              />
            ))}
          </View>
        </>
      ) : null}

      {circles.length > 0 ? (
        <>
          <SectionTitle title="Your Circles" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.circleRail}
          >
            {circles.slice(0, 6).map((circle) => (
              <CircleCard key={circle.id} circle={circle} />
            ))}
          </ScrollView>
        </>
      ) : null}
    </>
  );
}

function PulseSummaryCard({
  home,
  onOpenPeople,
  onOpenRooms,
}: {
  home: MobileCommunityHome;
  onOpenPeople: () => void;
  onOpenRooms: () => void;
}) {
  const { tokens } = useAppTheme();
  const peopleVisibleCount =
    home.ambientActivity?.publicTrackersToday ??
    home.summary.visibleOpportunityCount;
  const activeRoomCount =
    home.ambientActivity?.roomsWithFreshTrackingCount ??
    home.upcomingMoments.length;
  const followUpCount = home.summary.followUpCount;
  const rows = [
    {
      icon: "circle-o-notch" as const,
      count: peopleVisibleCount,
      label: `${formatCommunityTabCount(peopleVisibleCount)} ${peopleVisibleCount === 1 ? "person" : "people"} visible today`,
      onPress: onOpenPeople,
    },
    {
      icon: "building-o" as const,
      count: activeRoomCount,
      label: `${formatCommunityTabCount(activeRoomCount)} active ${activeRoomCount === 1 ? "room" : "rooms"} near your events`,
      onPress: onOpenRooms,
    },
    {
      icon: "envelope-o" as const,
      count: followUpCount,
      label: `${formatCommunityTabCount(followUpCount)} ${followUpCount === 1 ? "follow-up" : "follow-ups"} waiting`,
      onPress: onOpenPeople,
    },
  ].filter((row) => row.count > 0);

  if (rows.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: tokens.colors.surface,
          shadowColor: tokens.shadow.shadowColor,
        },
      ]}
    >
      {rows.map((row, index) => (
        <SummaryRow
          key={row.label}
          icon={row.icon}
          isLast={index === rows.length - 1}
          label={row.label}
          onPress={row.onPress}
        />
      ))}
    </View>
  );
}

function SummaryRow({
  icon,
  isLast,
  label,
  onPress,
}: {
  icon: keyof typeof FontAwesome.glyphMap;
  isLast: boolean;
  label: string;
  onPress: () => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.summaryRow,
        !isLast && {
          borderBottomColor: tokens.colors.divider,
          borderBottomWidth: 1,
        },
        pressed && styles.pressed,
      ]}
    >
      <FontAwesome name={icon} size={19} color={tokens.colors.success} />
      <Text
        style={[
          styles.summaryText,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {label}
      </Text>
      <FontAwesome
        name="chevron-right"
        size={14}
        color={tokens.colors.textSecondary}
      />
    </Pressable>
  );
}

function RoomsTab({
  activeRooms,
  followUps,
  lens,
  onChangeLens,
}: {
  activeRooms: MobileCommunityNetworkingEvent[];
  followUps: MobileCommunityNetworkingFollowUpCard[];
  lens: RoomLens;
  onChangeLens: (lens: RoomLens) => void;
}) {
  const pastFollowUp = followUps[0];
  const pastEvent = pastFollowUp ? getPrimaryEvent(pastFollowUp) : null;

  return (
    <>
      <LensRail
        activeId={lens}
        items={ROOM_LENSES}
        onSelect={(id) => onChangeLens(id as RoomLens)}
      />
      <Text style={styles.helperText}>
        Rooms open around events you track, attend, or match with.
      </Text>

      {lens === "past" ? (
        pastEvent ? (
          <PastRoomCard event={pastEvent} person={pastFollowUp} />
        ) : (
          <SectionEmptyNote title="No past rooms with follow-up yet" />
        )
      ) : activeRooms.length > 0 ? (
        <View style={styles.stack}>
          {activeRooms.map((event, index) => (
            <RoomCard
              key={event.id}
              event={event}
              primaryActionLabel={index === 0 ? "Open Room" : "Open Room"}
              secondaryActionLabel={
                event.viewerContext === "attending" ? "Going" : "View Event"
              }
            />
          ))}
        </View>
      ) : (
        <SectionEmptyNote title="No rooms in this view yet" />
      )}
    </>
  );
}

function RoomCard({
  event,
}: {
  compact?: boolean;
  event: MobileCommunityNetworkingEvent;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
}) {
  const { tokens } = useAppTheme();
  const isWarm =
    event.viewerContext === "attending" || event.visibleAttendeeCount > 0;
  const status = getRoomStatus(event);
  const discussionPreview = getRoomQuote(event);

  return (
    <Pressable
      accessibilityLabel={`Open room for ${event.title}`}
      accessibilityRole="button"
      onPress={() => router.push(`/event/${event.id}`)}
      style={({ pressed }) => [
        styles.roomCard,
        {
          backgroundColor: "#111214",
          borderColor: "rgba(255, 255, 255, 0.07)",
          borderRadius: 10,
          shadowColor: "#000000",
        },
        pressed && styles.roomCardPressed,
      ]}
    >
      <View style={styles.roomTopRow}>
        <View style={styles.roomCopy}>
          <Text
            style={[
              styles.roomReason,
              {
                color: "rgba(255, 255, 255, 0.5)",
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {getRoomReason(event)}
          </Text>
          <Text
            numberOfLines={2}
            style={[
              styles.roomEventTitle,
              {
                color: "#F7F8F8",
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {event.title}
          </Text>
          <View style={styles.roomTelemetryRow}>
            <View
              style={[
                styles.roomStatusDot,
                {
                  backgroundColor: isWarm
                    ? "#5EEAD4"
                    : "rgba(255, 255, 255, 0.34)",
                },
              ]}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.roomTelemetryText,
                {
                  color: "rgba(255, 255, 255, 0.4)",
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {status}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.roomSnippet,
              {
                color: "rgba(255, 255, 255, 0.46)",
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {discussionPreview}
          </Text>
        </View>

        <View
          style={[
            styles.roomArrow,
            {
              borderColor: "rgba(255, 255, 255, 0.07)",
            },
          ]}
        >
          <FontAwesome
            name="long-arrow-right"
            size={10}
            color="rgba(255, 255, 255, 0.5)"
          />
        </View>
      </View>
    </Pressable>
  );
}

function PeopleTab({
  followUps,
  home,
  lens,
  onChangeLens,
  onToggleFollow,
  pendingUserId,
  peopleToMeet,
}: {
  followUps: MobileCommunityNetworkingFollowUpCard[];
  home: MobileCommunityHome;
  lens: PeopleLens;
  onChangeLens: (lens: PeopleLens) => void;
  onToggleFollow: (userId: string, isFollowing: boolean) => void;
  pendingUserId: string | null;
  peopleToMeet: MobileCommunityNetworkingPersonCard[];
}) {
  const speakers = home.speakerMatches ?? [];

  return (
    <>
      <LensRail
        activeId={lens}
        items={PEOPLE_LENSES}
        onSelect={(id) => onChangeLens(id as PeopleLens)}
      />

      <SectionTitle title="People Around Your Events" />
      {peopleToMeet.length > 0 ? (
        <View style={styles.stack}>
          {peopleToMeet.slice(0, 5).map((person) => (
            <CommunityNetworkingPersonCard
              key={person.id}
              isFollowing={person.isInNetwork}
              isPending={pendingUserId === person.id}
              mode="meet"
              person={person}
              onOpenEvent={(eventId) => router.push(`/event/${eventId}`)}
              onOpenProfile={() => router.push(`/profile/${person.username}`)}
              onToggleFollow={() =>
                onToggleFollow(person.id, person.isInNetwork)
              }
            />
          ))}
        </View>
      ) : (
        <SectionEmptyNote title="No event-based people in this view yet" />
      )}

      {speakers.length > 0 ? (
        <>
          <SectionTitle title="Speakers Worth Knowing" />
          <View style={styles.stack}>
            {speakers.slice(0, 3).map((match, index) => (
              <CommunityNetworkingSpeakerCard
                key={`${match.speaker.id}:${match.event.id}`}
                eventTitle={match.event.title}
                isPastEvent={match.isPastEvent}
                matchIndex={index}
                matchReason={match.matchReason}
                speaker={match.speaker}
                onOpenSpeaker={() =>
                  router.push({
                    pathname: "/speaker/[id]",
                    params: {
                      id: match.speaker.id,
                      eventId: match.event.id,
                      eventTitle: match.event.title,
                    },
                  })
                }
              />
            ))}
          </View>
        </>
      ) : null}

      <SectionTitle title="Recent Encounters" />
      {followUps.length > 0 ? (
        <View style={styles.stack}>
          {followUps.slice(0, 4).map((person) => (
            <EncounterCard
              key={person.id}
              person={person}
              onOpenEvent={(eventId) => router.push(`/event/${eventId}`)}
              onOpenProfile={() => router.push(`/profile/${person.username}`)}
            />
          ))}
        </View>
      ) : (
        <SectionEmptyNote title="No recent encounters yet" />
      )}
    </>
  );
}

function ActivityRow({
  isLast,
  post,
}: {
  isLast: boolean;
  post: MobileCommunityFeedPost;
}) {
  const { tokens } = useAppTheme();
  const authorName = post.author.fullName || "Someone";
  const title = `${authorName} posted in ${post.circle.name}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: "/community/[slug]/post/[postId]",
          params: { slug: post.circle.slug, postId: post.id },
        })
      }
      style={({ pressed }) => [
        styles.activityRow,
        !isLast && {
          borderBottomColor: tokens.colors.divider,
          borderBottomWidth: 1,
        },
        pressed && styles.pressed,
      ]}
    >
      <AvatarImage
        avatarUrl={post.author.avatarUrl}
        name={authorName}
        size={44}
      />
      <View style={styles.activityCopy}>
        <Text
          style={[
            styles.activityTitle,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.activityBody,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          "{summarizeCommunityPost(post.content)}"
        </Text>
        <Text
          style={[
            styles.activityMeta,
            {
              color: tokens.colors.success,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {formatCommunityTabCount(post.commentCount)} replies
          {post.isTrending ? " · Trending" : ""}
        </Text>
      </View>
    </Pressable>
  );
}

function CircleCard({ circle }: { circle: MobileCommunityCircle }) {
  const { tokens } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/community/${getCircleSlug(circle)}`)}
      style={({ pressed }) => [
        styles.circleCard,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.circleIcon,
          {
            backgroundColor: tokens.colors.surfaceMuted,
            borderRadius: tokens.radius.sm,
          },
        ]}
      >
        <FontAwesome
          name="microchip"
          size={18}
          color={tokens.colors.textPrimary}
        />
      </View>
      <Text
        style={[
          styles.circleName,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {circle.name}
      </Text>
      <Text
        style={[
          styles.cardMeta,
          {
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {formatCommunityTabCount(circle.memberCount)} members
      </Text>
      <Text
        style={[
          styles.circleSignal,
          { color: tokens.colors.success, fontFamily: tokens.typography.sans },
        ]}
      >
        {circle.isJoined ? "Joined" : "Discover"}
      </Text>
    </Pressable>
  );
}

function EncounterCard({
  onOpenEvent,
  onOpenProfile,
  person,
}: {
  onOpenEvent: (eventId: string) => void;
  onOpenProfile: () => void;
  person: MobileCommunityNetworkingFollowUpCard;
}) {
  const { tokens } = useAppTheme();
  const event = getPrimaryEvent(person);
  const displayName = getDisplayName(person);

  return (
    <View
      style={[
        styles.encounterCard,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      <AvatarImage avatarUrl={person.avatarUrl} name={displayName} size={48} />
      <View style={styles.encounterCopy}>
        <Text
          style={[
            styles.activityTitle,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          You crossed paths with {displayName}
        </Text>
        <Text
          style={[
            styles.cardMeta,
            {
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {event
            ? `${event.title} · ${formatShortRelativeTime(event.startTime)}`
            : person.whyNow}
        </Text>
        <View style={styles.encounterActions}>
          <Pressable accessibilityRole="button" onPress={onOpenProfile}>
            <Text
              style={[
                styles.inlineAction,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              Send follow-up
            </Text>
          </Pressable>
          {event ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenEvent(event.id)}
            >
              <Text
                style={[
                  styles.inlineAction,
                  {
                    color: tokens.colors.textSecondary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                Open recap
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function PastRoomCard({
  event,
  person,
}: {
  event: MobileCommunityNetworkingSharedEvent;
  person: MobileCommunityNetworkingFollowUpCard;
}) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.roomCard,
        {
          backgroundColor: tokens.colors.surfaceStrong,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      <Text
        style={[
          styles.cardTitle,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {event.title}
      </Text>
      <Text
        style={[
          styles.cardMeta,
          {
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {formatShortRelativeTime(event.startTime)} · follow-up available
      </Text>
      <Text style={[styles.helperText, { paddingHorizontal: 0 }]}>
        Follow up with {getDisplayName(person)} while the context is still warm.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/event/${event.id}`)}
        style={({ pressed }) => [
          styles.primaryAction,
          {
            backgroundColor: tokens.colors.surfaceMuted,
            borderRadius: tokens.radius.sm,
          },
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.primaryActionText,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          Open Recap
        </Text>
      </Pressable>
    </View>
  );
}

function AvatarImage({
  avatarUrl,
  name,
  size,
}: {
  avatarUrl: string | null;
  name: string;
  size: number;
}) {
  const { tokens } = useAppTheme();

  if (avatarUrl) {
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
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tokens.colors.surfaceMuted,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: tokens.colors.textPrimary,
          fontFamily: tokens.typography.sans,
          fontWeight: "800",
        }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

function LensRail({
  activeId,
  items,
  onSelect,
}: {
  activeId: string;
  items: Array<{ id: string; label: string }>;
  onSelect: (id: string) => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.lensRow}
    >
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityState={{ selected: activeId === item.id }}
          onPress={() => onSelect(item.id)}
          style={({ pressed }) => [
            styles.lensChip,
            {
              backgroundColor:
                activeId === item.id
                  ? tokens.colors.pillActive
                  : tokens.colors.surfaceMuted,
              borderRadius: tokens.radius.md,
            },
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={{
              color:
                activeId === item.id
                  ? tokens.colors.pillActiveText
                  : tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 14,
              fontWeight: "700",
            }}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function SectionTitle({ title }: { title: string }) {
  const { tokens } = useAppTheme();

  return (
    <Text
      style={[
        styles.sectionTitle,
        {
          color: tokens.colors.textPrimary,
          fontFamily: tokens.typography.sans,
        },
      ]}
    >
      {title}
    </Text>
  );
}

function SectionHeaderLink({
  actionLabel,
  onPress,
  title,
}: {
  actionLabel: string;
  onPress: () => void;
  title: string;
}) {
  const { tokens } = useAppTheme();

  return (
    <View style={styles.sectionHeaderRow}>
      <SectionTitle title={title} />
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text
          style={[
            styles.headerLink,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function SectionEmptyNote({ title }: { title: string }) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.emptyNote,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      <Text
        style={[
          styles.emptyText,
          {
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

function InlineAlert({ message }: { message: string }) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.inlineAlert,
        {
          backgroundColor: tokens.colors.surfaceMuted,
          borderRadius: tokens.radius.sm,
        },
      ]}
    >
      <FontAwesome name="warning" size={13} color={tokens.colors.warning} />
      <Text
        style={[
          styles.inlineAlertText,
          {
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  activityBody: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  activityCard: {
    borderRadius: 6,
    overflow: "hidden",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
  activityCopy: {
    flex: 1,
    gap: 3,
  },
  activityMeta: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  activityRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
  },
  cardMeta: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  circleCard: {
    width: 156,
    minHeight: 138,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  circleIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  circleName: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 18,
  },
  circleRail: {
    gap: 8,
    paddingRight: 12,
  },
  circleSignal: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  contentWrap: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    gap: 10,
    paddingBottom: 24,
  },
  emptyNote: {
    borderWidth: 1,
    padding: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  encounterActions: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 4,
  },
  encounterCard: {
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  encounterCopy: {
    flex: 1,
    gap: 6,
  },
  headerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
  helperText: {
    color: "#6B7280",
    fontSize: 14,
    fontStyle: "italic",
    fontWeight: "500",
    lineHeight: 20,
    paddingHorizontal: 2,
  },
  inlineAction: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  inlineAlert: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineAlertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  lensChip: {
    minHeight: 30,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  lensRow: {
    gap: 6,
    paddingRight: 12,
  },
  pressed: {
    opacity: 0.82,
  },
  primaryAction: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 12,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  roomCard: {
    borderWidth: 1,
    padding: 12,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  roomCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  roomActionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingTop: 2,
  },
  roomArrow: {
    alignItems: "center",
    borderWidth: 1,
    height: 21,
    justifyContent: "center",
    width: 21,
  },
  roomCopy: {
    flex: 1,
    gap: 3,
  },
  roomEventTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.25,
    lineHeight: 18,
  },
  roomHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  roomIcon: {
    alignItems: "center",
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  roomQuote: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  roomQuoteText: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  roomPrimaryAction: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: 10,
  },
  roomPrimaryActionText: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 15,
  },
  roomReason: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 12,
  },
  roomSecondaryAction: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: 10,
  },
  roomSecondaryActionText: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 15,
  },
  roomSnippet: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 15,
    paddingTop: 1,
  },
  roomStatusDot: {
    borderRadius: 2,
    height: 4,
    width: 4,
  },
  roomTelemetryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  roomTelemetryText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14,
  },
  roomTitleWrap: {
    flex: 1,
    gap: 5,
  },
  roomTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  secondaryAction: {
    alignItems: "center",
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 12,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.1,
    lineHeight: 20,
    paddingTop: 4,
  },
  segmentedControl: {
    flexDirection: "row",
    padding: 4,
  },
  segmentedItem: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 32,
  },
  stack: {
    gap: 8,
  },
  summaryCard: {
    borderRadius: 6,
    overflow: "hidden",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
});
