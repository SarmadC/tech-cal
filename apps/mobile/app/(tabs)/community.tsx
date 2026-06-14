import { FontAwesome } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import type {
  CommunityPostType,
  MobileCommunityCircle,
  MobileCommunityFeedPost,
  MobileCommunityDirectoryPerson,
  MobileCommunityHome,
  MobileCommunityNetworkingEvent,
  MobileCommunityNetworkingFollowUpCard,
  MobileCommunityNetworkingPersonCard,
  MobileCommunityNetworkingSharedEvent,
} from "@kurecal/domain";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,

  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useScalePress,
} from "../../src/hooks/useAnimation";

import { KureButton } from "../../src/components/chrome/KureButton";
import { MobilePage } from "../../src/components/chrome/MobilePage";
import { ScreenState } from "../../src/components/chrome/ScreenState";
import { TabMenuOverlay } from "../../src/components/chrome/TabMenuOverlay";
import {
  CommunityComposerModal,
  type CommunityComposerEventOption,
  type CommunityComposerImageAttachment,
} from "../../src/components/community/CommunityComposerModal";
import { useCommunityImageAttachments } from "../../src/hooks/useCommunityImageAttachments";
import { CommunityNetworkingPersonCard } from "../../src/components/community/CommunityNetworkingPersonCard";
import { CommunityDirectoryPersonCard } from "../../src/components/community/CommunityDirectoryPersonCard";
import { CommunityNetworkingSpeakerCard } from "../../src/components/community/CommunityNetworkingSpeakerCard";
import { CommunityRoomSheet } from "../../src/components/community/CommunityRoomSheet";
import { CommunityFeedCard } from "../../src/components/CommunityFeedCard";
import { formatCommunityTabCount } from "../../src/components/community/presentation";
import {
  createMobileCommunityPost,
  followMobileUser,
  joinMobileCommunityCircle,
  leaveMobileCommunityCircle,
  loadMobileCommunityEvents,
  loadMobileCommunityHome,
  searchMobileCommunityDirectory,
  unfollowMobileUser,
} from "../../src/lib/mobileApi";
import { useAppTheme } from "../../src/providers/ThemeProvider";

type LoadMode = "initial" | "refresh";
type CommunityTab = "rooms" | "circles" | "people";
type RoomLens = "for_you" | "going" | "saved" | "nearby" | "past";
type PeopleLens = "for_you" | "going" | "follows_you" | "mutuals" | "recent";

const COMMUNITY_TABS: Array<{ id: CommunityTab; label: string }> = [
  { id: "rooms", label: "Rooms" },
  { id: "circles", label: "Circles" },
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

type ComposerEventOption = CommunityComposerEventOption;

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

function getCompactTime(startTime: string | null): string {
  if (!startTime) return "Soon";
  const diffMs = new Date(startTime).getTime() - Date.now();
  const absMinutes = Math.max(1, Math.round(Math.abs(diffMs) / 60_000));
  if (absMinutes < 60) return `${absMinutes}m`;
  const hours = Math.round(absMinutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function getRoomCompactMeta(event: MobileCommunityNetworkingEvent): string {
  const isActive =
    (event.recentTrackerCount ?? 0) > 0 || event.visibleAttendeeCount > 0;
  if (isActive) {
    const count = event.visibleAttendeeCount || event.networkAttendingCount;
    return count > 0
      ? `Active · ${formatCommunityTabCount(count)} here`
      : "Active now";
  }
  return getCompactTime(event.startTime);
}

function _filterRooms(
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

function _filterPeople(
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
  const [pendingCircleId, setPendingCircleId] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerCircleId, setComposerCircleId] = useState<string | null>(null);
  const [composerPostType, setComposerPostType] =
    useState<CommunityPostType | null>(null);
  const [composerTitle, setComposerTitle] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [composerWorking, setComposerWorking] = useState(false);
  const [composerAttachedEvent, setComposerAttachedEvent] =
    useState<ComposerEventOption | null>(null);
  const [composerEventPickerEvents, setComposerEventPickerEvents] = useState<
    ComposerEventOption[]
  >([]);
  const [composerEventPickerLoading, setComposerEventPickerLoading] =
    useState(false);
  const [composerEventPickerOpen, setComposerEventPickerOpen] = useState(false);
  const [composerEventPickerQuery, setComposerEventPickerQuery] = useState("");
  const composerImageAttachments = useCommunityImageAttachments({
    isBusy: composerWorking,
  });
  const [headerControlsVisible, setHeaderControlsVisible] = useState(true);
  const [roomSheetEventId, setRoomSheetEventId] = useState<string | null>(null);

  function handleOpenRoom(eventId: string) {
    setRoomSheetEventId(eventId);
  }

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

  const joinedCircles = useMemo(
    () => home?.circles?.filter((circle) => circle.isJoined) ?? [],
    [home],
  );

  const composerCircle = useMemo(
    () =>
      joinedCircles.find((circle) => circle.id === composerCircleId) ?? null,
    [composerCircleId, joinedCircles],
  );
  const composerFallbackCircle = joinedCircles[0] ?? null;
  const composerPublishCircle =
    composerCircle ?? composerAttachedEvent?.circle ?? composerFallbackCircle;

  function resetComposer() {
    setComposerCircleId(null);
    setComposerPostType(null);
    setComposerTitle("");
    setComposerBody("");
    setComposerWorking(false);
    setComposerAttachedEvent(null);
    setComposerEventPickerEvents([]);
    setComposerEventPickerLoading(false);
    setComposerEventPickerOpen(false);
    setComposerEventPickerQuery("");
    composerImageAttachments.resetMedia();
  }

  function handleOpenComposer() {
    setIsComposerOpen(true);
  }

  function handleCloseComposer() {
    if (composerWorking || composerImageAttachments.isUploadingMedia) {
      return;
    }

    composerImageAttachments.cleanupUnpublishedMedia();
    setIsComposerOpen(false);
  }

  function handleComposerAfterClose() {
    resetComposer();
  }

  function handleChangeComposerCircle(circleId: string) {
    setComposerCircleId((current) => (current === circleId ? null : circleId));
    setComposerEventPickerEvents([]);
    setComposerEventPickerQuery("");
    setComposerEventPickerOpen(false);
  }

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

  async function handleToggleCircle(circle: MobileCommunityCircle) {
    setPendingCircleId(circle.id);

    try {
      if (circle.isJoined) {
        await leaveMobileCommunityCircle(circle.id);
      } else {
        await joinMobileCommunityCircle(circle.id);
      }

      await loadCommunity("refresh");
    } catch (nextError) {
      Alert.alert(
        circle.isJoined ? "Leave failed" : "Join failed",
        nextError instanceof Error
          ? nextError.message
          : "Unable to update circle membership.",
      );
    } finally {
      setPendingCircleId((current) => (current === circle.id ? null : current));
    }
  }

  async function handleOpenComposerEventPicker() {
    if (composerWorking || composerImageAttachments.isUploadingMedia) {
      return;
    }

    const circlesToLoad = composerCircle ? [composerCircle] : joinedCircles;
    if (!circlesToLoad.length) {
      Alert.alert("Join a circle", "Join a circle before attaching an event.");
      return;
    }

    setComposerEventPickerQuery("");
    setComposerEventPickerOpen(true);
    setComposerEventPickerLoading(true);

    try {
      const eventMap = new Map<string, ComposerEventOption>();
      const eventDataByCircle = await Promise.all(
        circlesToLoad.map(async (circle) => ({
          circle,
          events: await loadMobileCommunityEvents(circle.slug),
        })),
      );

      eventDataByCircle.forEach(({ circle, events }) => {
        [
          ...events.nextUp,
          ...events.thisMonth,
          ...events.popularWithMembers,
          ...events.past,
        ].forEach((event) => {
          eventMap.set(event.id, {
            ...event,
            circle: {
              id: circle.id,
              name: circle.name,
              slug: circle.slug,
            },
          });
        });
      });
      setComposerEventPickerEvents(Array.from(eventMap.values()));
    } catch (nextError) {
      Alert.alert(
        "Events unavailable",
        nextError instanceof Error
          ? nextError.message
          : "Unable to load events for this circle.",
      );
      setComposerEventPickerOpen(false);
    } finally {
      setComposerEventPickerLoading(false);
    }
  }

  async function handleCreatePost() {
    const body = composerBody.trim();
    const title = composerTitle.trim();

    if (!composerPublishCircle) {
      Alert.alert("Join a circle", "Join a circle before creating a post.");
      return;
    }

    if (!title) {
      Alert.alert("Add a title", "Give your post a title before publishing.");
      return;
    }

    setComposerWorking(true);

    try {
      const media = composerImageAttachments.media.map((item) => ({
        path: item.path,
        width: item.width,
        height: item.height,
      }));

      await createMobileCommunityPost({
        circleId: composerPublishCircle.id,
        circleSlug: composerPublishCircle.slug,
        title,
        content: body,
        postType: composerPostType ?? undefined,
        eventId: composerAttachedEvent?.id,
        media,
      });
      composerImageAttachments.markMediaPublished(media.map((m) => m.path));
      setIsComposerOpen(false);
      await loadCommunity("refresh");
    } catch (nextError) {
      Alert.alert(
        "Post failed",
        nextError instanceof Error ? nextError.message : "Unable to post.",
      );
    } finally {
      setComposerWorking(false);
    }
  }

  const feedPosts = home?.feed ?? [];

  return (
    <>
      <MobilePage
        headerHidden
        showAccentGlow={false}
        title="Community"
        onControlsVisibilityChange={setHeaderControlsVisible}
        data={home ? feedPosts : undefined}
        keyExtractor={(post) => post.id}
        renderItem={(post, index) => (
          <View
            style={[
              styles.feedRowWrap,
              index < feedPosts.length - 1 && {
                borderBottomColor: tokens.colors.divider,
                borderBottomWidth: 1,
              },
            ]}
          >
            <CommunityFeedCard
              post={post}
              variant="thread"
              onOpenEvent={(eventId) => router.push(`/event/${eventId}`)}
              onPress={() =>
                router.push({
                  pathname: "/community/[slug]/post/[postId]",
                  params: { slug: post.circle.slug, postId: post.id },
                })
              }
            />
          </View>
        )}
        listFooter={
          home ? (
            <View style={styles.belowFeedWrap}>
              <CommunityHome
                home={home}
                joinedCircles={joinedCircles}
                pendingCircleId={pendingCircleId}
                pendingUserId={pendingUserId}
                showFeed={false}
                onCreatePress={handleOpenComposer}
                onOpenRoom={handleOpenRoom}
                onToggleCircle={handleToggleCircle}
                onToggleFollow={handleToggleFollow}
              />
            </View>
          ) : null
        }
      >
        <View style={home ? styles.listHeaderWrap : styles.contentWrap}>
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
              {inlineError ? <InlineAlert message={inlineError} /> : null}
              {feedPosts.length === 0 ? (
                <PostFeedSection
                  feed={[]}
                  hasJoinedCircles={joinedCircles.length > 0}
                  onCreatePress={handleOpenComposer}
                />
              ) : null}
            </>
          ) : null}
        </View>
        <CommunityRoomSheet
          eventId={roomSheetEventId}
          onClose={() => setRoomSheetEventId(null)}
        />
        <CommunityComposerModal
          attachedEvent={composerAttachedEvent}
          body={composerBody}
          circle={composerCircle}
          circles={joinedCircles}
          fallbackCircle={composerFallbackCircle}
          eventPickerEvents={composerEventPickerEvents}
          eventPickerLoading={composerEventPickerLoading}
          eventPickerOpen={composerEventPickerOpen}
          eventPickerQuery={composerEventPickerQuery}
          isWorking={composerWorking}
          isUploadingMedia={composerImageAttachments.isUploadingMedia}
          media={composerImageAttachments.media}
          postType={composerPostType}
          title={composerTitle}
          visible={isComposerOpen}
          onChangeBody={setComposerBody}
          onChangeCircle={handleChangeComposerCircle}
          onChangeEventPickerQuery={setComposerEventPickerQuery}
          onChangePostType={setComposerPostType}
          onChangeTitle={setComposerTitle}
          onClose={handleCloseComposer}
          onAfterClose={handleComposerAfterClose}
          onOpenEventPicker={() => {
            void handleOpenComposerEventPicker();
          }}
          onPickImages={() => {
            void composerImageAttachments.pickImages();
          }}
          onRemoveEvent={() => setComposerAttachedEvent(null)}
          onRemoveImage={(path) => {
            void composerImageAttachments.removeImage(path);
          }}
          onSelectEvent={(event) => {
            setComposerAttachedEvent(event);
            setComposerEventPickerOpen(false);
            setComposerEventPickerQuery("");
          }}
          onSubmit={() => {
            void handleCreatePost();
          }}
        />
      </MobilePage>
      {(!loading || !!home) && headerControlsVisible && (
        <TabMenuOverlay
          rightAccessory={<CommunityCreateButton onCreatePress={handleOpenComposer} />}
        />
      )}
    </>
  );
}

function CommunityHome({
  home,
  joinedCircles,
  onCreatePress,
  onOpenRoom,
  onToggleCircle,
  onToggleFollow,
  pendingCircleId,
  pendingUserId,
  showFeed = true,
}: {
  home: MobileCommunityHome;
  joinedCircles: MobileCommunityCircle[];
  onCreatePress: () => void;
  onOpenRoom: (eventId: string) => void;
  onToggleCircle: (circle: MobileCommunityCircle) => void;
  onToggleFollow: (userId: string, isFollowing: boolean) => void;
  pendingCircleId: string | null;
  pendingUserId: string | null;
  showFeed?: boolean;
}) {
  const feed = home.feed ?? [];
  const activeRooms = home.upcomingMoments.slice(0, 3);
  const peopleToMeet = home.peopleToMeet.slice(0, 3);
  const followUps = home.followUpNow.slice(0, 2);

  return (
    <>
      {showFeed ? (
        <PostFeedSection
          feed={feed}
          hasJoinedCircles={joinedCircles.length > 0}
          onCreatePress={onCreatePress}
        />
      ) : null}

      <CircleShortcutSection
        circles={home.circles ?? []}
        pendingCircleId={pendingCircleId}
        onToggleCircle={onToggleCircle}
      />

      {activeRooms.length > 0 ? (
        <SecondarySectionHeader title="Active rooms" meta={`${activeRooms.length} live`} />
      ) : null}
      {activeRooms.length > 0 ? (
        <RoomList events={activeRooms} onOpenRoom={onOpenRoom} />
      ) : null}

      {peopleToMeet.length > 0 || followUps.length > 0 ? (
        <SecondarySectionHeader
          title="People nearby"
          meta={`${peopleToMeet.length + followUps.length} suggested`}
        />
      ) : null}
      {peopleToMeet.length > 0 ? (
        <View style={styles.stack}>
          {peopleToMeet.map((person) => (
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
      ) : null}
      {followUps.length > 0 ? (
        <View style={styles.stack}>
          {followUps.map((person) => (
            <EncounterCard
              key={person.id}
              person={person}
              onOpenEvent={(eventId) => router.push(`/event/${eventId}`)}
              onOpenProfile={() => router.push(`/profile/${person.username}`)}
            />
          ))}
        </View>
      ) : null}
    </>
  );
}

function CommunityCreateButton({
  onCreatePress,
}: {
  onCreatePress: () => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onCreatePress}
      style={({ pressed }) => [
        styles.createButton,
        {
          backgroundColor: tokens.colors.pillActive,
          borderRadius: tokens.radius.xs,
        },
        pressed && styles.pressed,
      ]}
    >
      <FontAwesome name="pencil" size={12} color={tokens.colors.pillActiveText} />
      <Text
        style={[
          styles.createButtonText,
          {
            color: tokens.colors.pillActiveText,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        Create
      </Text>
    </Pressable>
  );
}

function PostFeedSection({
  feed,
  hasJoinedCircles,
  onCreatePress,
}: {
  feed: MobileCommunityFeedPost[];
  hasJoinedCircles: boolean;
  onCreatePress: () => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <View style={styles.feedSection}>
      {feed.length > 0 ? (
        <View style={styles.feedSurface}>
          {feed.map((post, index) => (
            <View
              key={post.id}
              style={[
                styles.feedRow,
                index < feed.length - 1 && {
                  borderBottomColor: tokens.colors.divider,
                  borderBottomWidth: 1,
                },
              ]}
            >
              <CommunityFeedCard
                post={post}
                variant="thread"
                onOpenEvent={(eventId) => router.push(`/event/${eventId}`)}
                onPress={() =>
                  router.push({
                    pathname: "/community/[slug]/post/[postId]",
                    params: { slug: post.circle.slug, postId: post.id },
                  })
                }
              />
            </View>
          ))}
        </View>
      ) : (
        <View
          style={[
            styles.emptyFeed,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.sm,
            },
          ]}
        >
          <Text
            style={[
              styles.emptyFeedTitle,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            No community posts yet
          </Text>
          <Text
            style={[
              styles.emptyFeedBody,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {hasJoinedCircles
              ? "Start a thread in one of your circles."
              : "Join a circle to start posting, or browse public circles below."}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onCreatePress}
            style={({ pressed }) => [
              styles.emptyFeedAction,
              {
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.xs,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.emptyFeedActionText,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              Create post
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function CircleShortcutSection({
  circles,
  onToggleCircle,
  pendingCircleId,
}: {
  circles: MobileCommunityCircle[];
  onToggleCircle: (circle: MobileCommunityCircle) => void;
  pendingCircleId: string | null;
}) {
  const visibleCircles = circles.slice(0, 5);

  if (visibleCircles.length === 0) {
    return null;
  }

  return (
    <>
      <SecondarySectionHeader title="Circles" meta={`${visibleCircles.length} shown`} />
      <View style={styles.stack}>
        {visibleCircles.map((circle) => (
          <CircleCard
            key={circle.id}
            circle={circle}
            isPending={pendingCircleId === circle.id}
            onToggleCircle={onToggleCircle}
          />
        ))}
      </View>
    </>
  );
}

function SecondarySectionHeader({
  meta,
  title,
}: {
  meta?: string;
  title: string;
}) {
  const { tokens } = useAppTheme();

  return (
    <View style={styles.secondaryHeader}>
      <Text
        style={[
          styles.secondaryTitle,
          {
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {title}
      </Text>
      {meta ? (
        <Text
          style={[
            styles.secondaryMeta,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

function _CirclesTab({
  circles,
  onToggleCircle,
  pendingCircleId,
}: {
  circles: MobileCommunityCircle[];
  onToggleCircle: (circle: MobileCommunityCircle) => void;
  pendingCircleId: string | null;
}) {
  const joinedCircles = circles.filter((circle) => circle.isJoined);
  const discoverCircles = circles.filter((circle) => !circle.isJoined);

  return (
    <>
      <Text style={styles.helperText}>
        Follow focused groups for event threads, members, and community posts.
      </Text>

      {joinedCircles.length > 0 ? (
        <>
          <SectionTitle title="Your Circles" />
          <View style={styles.stack}>
            {joinedCircles.map((circle) => (
              <CircleCard
                key={circle.id}
                circle={circle}
                isPending={pendingCircleId === circle.id}
                onToggleCircle={onToggleCircle}
              />
            ))}
          </View>
        </>
      ) : null}

      <SectionTitle
        title={joinedCircles.length > 0 ? "Discover" : "Discover Circles"}
      />
      {discoverCircles.length > 0 ? (
        <View style={styles.stack}>
          {discoverCircles.map((circle) => (
            <CircleCard
              key={circle.id}
              circle={circle}
              isPending={pendingCircleId === circle.id}
              onToggleCircle={onToggleCircle}
            />
          ))}
        </View>
      ) : joinedCircles.length > 0 ? (
        <SectionEmptyNote title="You have joined every circle available right now" />
      ) : (
        <SectionEmptyNote title="No circles available yet" />
      )}
    </>
  );
}

function CircleCard({
  circle,
  isPending,
  onToggleCircle,
}: {
  circle: MobileCommunityCircle;
  isPending: boolean;
  onToggleCircle: (circle: MobileCommunityCircle) => void;
}) {
  const { tokens } = useAppTheme();
  const { scale, onPressIn, onPressOut } = useScalePress();
  const actionLabel = isPending
    ? "Saving..."
    : circle.isJoined
      ? "Leave"
      : "Join";

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View
        style={[
          styles.circleCard,
          {
            backgroundColor: tokens.colors.surface,
            borderColor: tokens.colors.border,
            borderRadius: tokens.radius.md,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${circle.name}`}
          onPress={() => router.push(`/community/${circle.slug}`)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={styles.circleMainPressable}
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
              name={circle.isJoined ? "check-circle" : "circle-o"}
              size={18}
              color={
                circle.isJoined
                  ? tokens.colors.accent
                  : tokens.colors.textTertiary
              }
            />
          </View>
          <View style={styles.circleCopy}>
            <Text
              numberOfLines={1}
              style={[
                styles.cardTitle,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {circle.name}
            </Text>
            <Text
              numberOfLines={2}
              style={[
                styles.cardMeta,
                {
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {circle.description || "A community circle"} ·{" "}
              {formatCommunityTabCount(circle.memberCount)} members
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isPending}
          onPress={() => onToggleCircle(circle)}
          style={({ pressed }) => [
            styles.circleAction,
            {
              backgroundColor: circle.isJoined
                ? tokens.colors.surfaceMuted
                : tokens.colors.pillActive,
              borderRadius: tokens.radius.xs,
              opacity: isPending ? 0.65 : 1,
            },
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.circleActionText,
              {
                color: circle.isJoined
                  ? tokens.colors.textPrimary
                  : tokens.colors.pillActiveText,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function _RoomsTab({
  activeRooms,
  followUps,
  lens,
  onChangeLens,
  onOpenRoom,
}: {
  activeRooms: MobileCommunityNetworkingEvent[];
  followUps: MobileCommunityNetworkingFollowUpCard[];
  lens: RoomLens;
  onChangeLens: (lens: RoomLens) => void;
  onOpenRoom: (eventId: string) => void;
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
        <RoomList events={activeRooms} onOpenRoom={onOpenRoom} />
      ) : (
        <SectionEmptyNote title="No rooms in this view yet" />
      )}
    </>
  );
}

function RoomList({
  events,
  onOpenRoom,
}: {
  events: MobileCommunityNetworkingEvent[];
  onOpenRoom: (eventId: string) => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.roomList,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.sm,
        },
      ]}
    >
      {events.map((event, index) => (
        <RoomRow
          key={event.id}
          event={event}
          isLast={index === events.length - 1}
          onOpenRoom={onOpenRoom}
        />
      ))}
    </View>
  );
}

function RoomRow({
  event,
  isLast,
  onOpenRoom,
}: {
  event: MobileCommunityNetworkingEvent;
  isLast: boolean;
  onOpenRoom: (eventId: string) => void;
}) {
  const { tokens } = useAppTheme();
  const { scale, onPressIn, onPressOut } = useScalePress();
  const isWarm =
    event.viewerContext === "attending" || event.visibleAttendeeCount > 0;
  const meta = getRoomCompactMeta(event);

  return (
    <Pressable
      accessibilityLabel={`Open room for ${event.title}`}
      accessibilityRole="button"
      onPress={() => onOpenRoom(event.id)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        !isLast && {
          borderBottomWidth: 1,
          borderBottomColor: tokens.colors.divider,
        },
      ]}
    >
      <Animated.View
        style={[styles.roomRow, { transform: [{ scale }] }]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.roomRowTitle,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {event.title}
        </Text>
        <View style={styles.roomRowMeta}>
          <View
            style={[
              styles.roomStatusDot,
              {
                backgroundColor: isWarm
                  ? tokens.colors.accent
                  : tokens.colors.textTertiary,
              },
            ]}
          />
          <Text
            style={[
              styles.roomRowMetaText,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {meta}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function _PeopleTab({
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
  const { tokens } = useAppTheme();
  const speakers = home.speakerMatches ?? [];
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryPeople, setDirectoryPeople] = useState<
    MobileCommunityDirectoryPerson[]
  >([]);
  const [directoryCursor, setDirectoryCursor] = useState<string | null>(null);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryLoadingMore, setDirectoryLoadingMore] = useState(false);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const trimmedDirectoryQuery = directoryQuery.trim();
  const isDirectorySearchActive = trimmedDirectoryQuery.length > 0;

  useEffect(() => {
    if (!isDirectorySearchActive) {
      setDirectoryPeople([]);
      setDirectoryCursor(null);
      setDirectoryError(null);
      setDirectoryLoading(false);
      return;
    }

    let active = true;
    setDirectoryLoading(true);
    setDirectoryError(null);

    const timeout = setTimeout(() => {
      searchMobileCommunityDirectory(trimmedDirectoryQuery)
        .then((result) => {
          if (!active) return;
          setDirectoryPeople(result.people);
          setDirectoryCursor(result.nextCursor);
        })
        .catch((error) => {
          if (!active) return;
          setDirectoryPeople([]);
          setDirectoryCursor(null);
          setDirectoryError(
            error instanceof Error
              ? error.message
              : "Unable to search the community directory",
          );
        })
        .finally(() => {
          if (active) {
            setDirectoryLoading(false);
          }
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [isDirectorySearchActive, trimmedDirectoryQuery]);

  async function loadMoreDirectoryPeople() {
    if (!directoryCursor || directoryLoadingMore) {
      return;
    }

    setDirectoryLoadingMore(true);
    setDirectoryError(null);

    try {
      const result = await searchMobileCommunityDirectory(
        trimmedDirectoryQuery,
        directoryCursor,
      );
      setDirectoryPeople((current) => [...current, ...result.people]);
      setDirectoryCursor(result.nextCursor);
    } catch (error) {
      setDirectoryError(
        error instanceof Error
          ? error.message
          : "Unable to load more people",
      );
    } finally {
      setDirectoryLoadingMore(false);
    }
  }

  return (
    <>
      <View
        style={[
          styles.directorySearchWrap,
          {
            backgroundColor: tokens.colors.surface,
            borderColor: tokens.colors.border,
          },
        ]}
      >
        <FontAwesome color={tokens.colors.textTertiary} name="search" size={14} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={setDirectoryQuery}
          placeholder="Search people"
          placeholderTextColor={tokens.colors.textTertiary}
          returnKeyType="search"
          style={[
            styles.directorySearchInput,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
          value={directoryQuery}
        />
      </View>

      {isDirectorySearchActive ? (
        <>
          <SectionTitle title="Directory Results" />
          {directoryLoading ? (
            <SectionEmptyNote title="Searching people..." />
          ) : directoryError ? (
            <SectionEmptyNote title={directoryError} />
          ) : directoryPeople.length > 0 ? (
            <View style={styles.stack}>
              {directoryPeople.map((person) => (
                <CommunityDirectoryPersonCard
                  key={person.id}
                  isPending={pendingUserId === person.id}
                  person={person}
                  onOpenProfile={
                    person.username
                      ? () => router.push(`/profile/${person.username}`)
                      : undefined
                  }
                  onToggleFollow={() =>
                    onToggleFollow(person.id, person.activity.isViewerFollowing)
                  }
                />
              ))}
              {directoryCursor ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={directoryLoadingMore}
                  onPress={() => {
                    void loadMoreDirectoryPeople();
                  }}
                  style={({ pressed }) => [
                    styles.loadMoreButton,
                    {
                      borderColor: tokens.colors.borderStrong,
                      backgroundColor: tokens.colors.surface,
                    },
                    pressed ? styles.pressed : null,
                    directoryLoadingMore ? styles.disabled : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.loadMoreText,
                      {
                        color: tokens.colors.textPrimary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                  >
                    {directoryLoadingMore ? "Loading..." : "Load more"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <SectionEmptyNote title="No people match this search" />
          )}
        </>
      ) : (
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
      )}
    </>
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
        styles.roomList,
        {
          backgroundColor: tokens.colors.surfaceStrong,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.sm,
          padding: 12,
          gap: 8,
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
        <LensChip
          key={item.id}
          isActive={activeId === item.id}
          item={item}
          tokens={tokens}
          onPress={() => onSelect(item.id)}
        />
      ))}
    </ScrollView>
  );
}

function LensChip({
  isActive,
  item,
  onPress,
  tokens,
}: {
  isActive: boolean;
  item: { id: string; label: string };
  onPress: () => void;
  tokens: ReturnType<typeof useAppTheme>["tokens"];
}) {
  const { scale, onPressIn, onPressOut } = useScalePress();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View
        style={[
          styles.lensChip,
          {
            backgroundColor: isActive
              ? tokens.colors.pillActive
              : tokens.colors.surfaceMuted,
            borderRadius: tokens.radius.xs,
          },
          { transform: [{ scale }] },
        ]}
      >
        <Text
          style={{
            color: isActive
              ? tokens.colors.pillActiveText
              : tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function SectionTitle({ title }: { title: string }) {
  const { tokens } = useAppTheme();

  return (
    <Text
      style={[
        styles.sectionTitle,
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
  activityTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
  },
  cardMeta: {
    color: "#908f9e",
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  composerActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 4,
  },
  composerBodyInput: {
    borderWidth: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    minHeight: 112,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  composerChip: {
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  composerChipRow: {
    gap: 6,
    paddingRight: 12,
  },
  composerChipText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  composerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  composerInput: {
    borderWidth: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  composerLabel: {
    color: "#908f9e",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  composerModal: {
    borderWidth: 1,
    gap: 10,
    maxHeight: "88%",
    padding: 12,
    width: "100%",
    maxWidth: 430,
  },
  composerNotice: {
    borderWidth: 1,
    padding: 10,
  },
  composerNoticeText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  composerScroll: {
    flexShrink: 1,
  },
  composerScrollContent: {
    gap: 10,
  },
  composerTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  composerToolbar: {
    flexDirection: "row",
    gap: 8,
  },
  composerToolButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 10,
  },
  composerToolLabel: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  attachmentPreview: {
    gap: 8,
  },
  attachmentRemoveAction: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  attachmentRemoveText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  circleAction: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
    minWidth: 62,
    paddingHorizontal: 12,
  },
  circleActionText: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  circleCard: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  circleCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  circleIcon: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  circleMainPressable: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0,
  },
  listHeaderWrap: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    gap: 10,
    marginTop: 44,
    paddingBottom: 10,
  },
  feedRowWrap: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    paddingVertical: 2,
  },
  belowFeedWrap: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    gap: 10,
    marginTop: 10,
    paddingBottom: 24,
  },
  contentWrap: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    gap: 10,
    marginTop: 44,
    paddingBottom: 24,
  },
  createButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 10,
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  emptyFeed: {
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  emptyFeedAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  emptyFeedActionText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  emptyFeedBody: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  emptyFeedTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
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
  eventPickerList: {
    maxHeight: 220,
  },
  eventPickerPanel: {
    borderWidth: 1,
    gap: 8,
    padding: 8,
  },
  eventPickerSearch: {
    borderWidth: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  eventPickerState: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    paddingVertical: 8,
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
  feedRow: {
    paddingVertical: 2,
  },
  feedSection: {
    gap: 8,
  },
  feedSurface: {
    backgroundColor: "transparent",
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
  directorySearchWrap: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  directorySearchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    minWidth: 0,
    paddingVertical: 10,
  },
  loadMoreButton: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
  modalScrim: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
  },
  modalBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    flex: 1,
  },
  mediaPreviewImage: {
    aspectRatio: 1,
    width: "100%",
  },
  mediaPreviewItem: {
    borderRadius: 4,
    flexBasis: "48%",
    overflow: "hidden",
    position: "relative",
  },
  mediaPreviewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mediaRemoveButton: {
    borderWidth: 1,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: "absolute",
    right: 6,
  },
  mediaRemoveLabel: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
  postTypeMenu: {
    borderWidth: 1,
    marginTop: 6,
    overflow: "hidden",
  },
  postTypeOption: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 36,
    paddingHorizontal: 10,
  },
  postTypeOptionLabel: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  postTypeSelect: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 36,
    paddingHorizontal: 10,
  },
  postTypeSelectLabel: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  postTypeSelectWrap: {
    gap: 0,
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
  roomList: {
    borderWidth: 1,
    overflow: "hidden",
  },
  roomRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  roomRowMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    flexShrink: 0,
  },
  roomRowMetaText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  roomRowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  roomStatusDot: {
    borderRadius: 2,
    height: 4,
    width: 4,
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
  secondaryHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  secondaryMeta: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  secondaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    lineHeight: 16,
    paddingTop: 6,
  },
  stack: {
    gap: 8,
  },
});
